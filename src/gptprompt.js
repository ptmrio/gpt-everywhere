"use strict";

(function () {
    // get options
    // todo: use await instead of then, but it doesn't work!?
    chrome.storage.sync.get(['gptSettingApikey', 'gptSettingDebug']).then((result) => {

        // store current selection
        let isEditable = false;
        let hasValue;
        let selectionText = null;
        let selectionStart = null;
        let selectionEnd = null;

        let gptSettingApikey;
        let gptSettingDebug;

        let controller;

        gptSettingApikey = result.gptSettingApikey;
        gptSettingDebug = result.gptSettingDebug;

        // debug
        const debug = gptSettingDebug ? true : false;


        // insert html
        let initialized = document.getElementById('gpt-shadow-root-container') ? true : false;

        let shadowRoot;
        let searchPromptIframe;
        let searchPromptIframeDocument;

        let spinner;

        if (initialized) {
            document.getElementById('gpt-shadow-root-container').remove();
        }

        // create shadow root container
        let shadowRootContainer = document.createElement('div');
        shadowRootContainer.id = 'gpt-shadow-root-container';
        document.body.appendChild(shadowRootContainer);

        // create shadow root
        shadowRoot = shadowRootContainer.attachShadow({ mode: 'open' });

        // create iframe within shadow root
        searchPromptIframe = document.createElement('iframe');
        searchPromptIframe.id = 'gpt-search-prompt-iframe';
        searchPromptIframe.setAttribute('allow', 'clipboard-write');
        searchPromptIframe.setAttribute('allowtransparency', 'true');
        searchPromptIframe.setAttribute('frameBorder', '0');
        shadowRoot.appendChild(searchPromptIframe);

        // create iframe content
        let placeholders = [
            "Translate this text to German ...",
            "Write a poem about this text ...",
            "Summarize this text ...",
            "Generate a title for this text ...",
            "Generate a tweet about this text ...",
            "Reply to this E-Mail ..."
        ];

        let randomPlaceholder = placeholders[Math.floor(Math.random() * placeholders.length)];

        // insert html into iframe
        searchPromptIframeDocument = searchPromptIframe.contentDocument || searchPromptIframe.contentWindow.document;
        searchPromptIframeDocument.open();
        searchPromptIframeDocument.write(`
<html>
    <head>
        <style>
            html {
                background: transparent;
            }

            body {
                margin: 0;
                padding: 0;
                background: transparent;
                border: none;
                outline: none;
                overflow: hidden;
                resize: none;
                font-family: inherit;
                font-size: inherit;
                line-height: inherit;
                color: inherit;
                -webkit-appearance: none;
                -moz-appearance: none;
                appearance: none;
            }

            #gpt-search-prompt {
                justify-content: center;
                align-items: center;
                background-color: rgba(55, 55, 55, 0.50);
                width: 100vw;
                height: 100vh;
                position: fixed;
                top: 0;
                left: 0;
                z-index: 99998;
                opacity: 0;
                transition: opacity 0.2s ease-in-out;
            }

            #gpt-search-prompt.gpt-show,
            #gpt-search-prompt .gpt-show {
                opacity: 1;
            }

            #gpt-search-prompt-text {
                width: clamp(320px, 66vw, 900px);
                background-color: white;
                border-radius: 10px;
                padding: 20px;
                overflow: auto;
                display: flex;
                flex-direction: column;
                justify-content: center;
                gap: 10px;
            }

            #gpt-search-prompt-input {
                background-color: white;
                border: 1px solid lightgray;
                border-radius: 5px;
                padding: 16px;
                font-size: 16px;
            }

            #gpt-search-prompt textarea:focus,
            #gpt-search-prompt input:focus {
                outline: none;
                border: 1px solid #f25a41;
            }

            #gpt-search-prompt-textarea {
                background-color: white;
                border: 1px solid lightgray;
                border-radius: 5px;
                padding: 16px;
                font-size: 16px;
                height: calc(2em + 32px);
                max-height: 66vh;
                width: 100%;
            }

            #gpt-search-prompt-textarea-container {
                position: relative;
            }

            #gpt-search-prompt-copy-button {
                display: none;
                opacity: 0;
                position: absolute;
                right: 4px;
                top: 4px;
                border: 1px solid #f25a41;
                border-radius: 3px;
                padding: 4px 5px 3px 5px;
                font-size: 12px;
                background-color: #f25a41;
                color: white;
                cursor: pointer;
                font-weight: bold;
                text-transform: uppercase;
                transition: all 0.2s ease-in;
            }

            #gpt-search-prompt-copy-button svg {
                width: 1em;
                height: 1em;
                fill: white;
            }

            #gpt-search-prompt-button {
                border: 1px solid #f25a41;
                border-radius: 5px;
                padding: 16px;
                font-size: 16px;
                background-color: #f25a41;
                color: white;
                cursor: pointer;
                font-weight: bold;
                text-transform: uppercase;
                transition: all 0.2s ease-in;
            }

            #gpt-search-prompt button:hover,
            #gpt-search-prompt button:active,
            #gpt-search-prompt button:focus {
                background-color: lightcoral;
                color: darkred;
            }

            @keyframes gpt-bounce {
                from,
                to {
                    transform: translate3d(0, 0, 0);
                }

                10%,
                30%,
                50%,
                70%,
                90% {
                    transform: translate3d(-10px, 0, 0);
                }

                20%,
                40%,
                60%,
                80% {
                    transform: translate3d(10px, 0, 0);
                }
            }

            .gpt-bounce {
                animation: gpt-bounce 750ms forwards;
            }

            #gpt-spinner-wrapper {
                display: none;
                justify-content: center;
                align-items: center;
                background-color: rgba(55, 55, 55, 0.50);
                width: 100vw;
                height: 100vh;
                opacity: 0;
                position: fixed;
                top: 0;
                left: 0;
                z-index: 99999;
            }

            #gpt-spinner {
                width: 80px;
                height: 80px;

                border: 2px solid #f3f3f3;
                border-top: 3px solid #f25a41;
                border-radius: 100%;

                justify-self: center;

                animation: gpt-spin 1s infinite linear;
            }

            @keyframes gpt-spin {
                from {
                    transform: rotate(0deg);
                }
                to {
                    transform: rotate(360deg);
                }
            }

            #gpt-search-prompt-iframe.gpt-show {
                display: block;
            }

            #gpt-spinner-wrapper.gpt-show {
                opacity: 1;
            }   
        </style>
    </head>
    <body>
        <div id="gpt-search-prompt">
            <form method="get" id="gpt-search-prompt-text">
                <input id="gpt-search-prompt-input" type="text" placeholder="${randomPlaceholder}" required>
                <div id="gpt-search-prompt-textarea-container">
                    <button type="button" id="gpt-search-prompt-copy-button" title="Copy to clipboard">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--! Font Awesome Pro 6.2.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. --><path d="M224 0c-35.3 0-64 28.7-64 64V288c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V64c0-35.3-28.7-64-64-64H224zM64 160c-35.3 0-64 28.7-64 64V448c0 35.3 28.7 64 64 64H288c35.3 0 64-28.7 64-64V384H288v64H64V224h64V160H64z"/></svg>
                    </button>
                    <textarea id="gpt-search-prompt-textarea" placeholder="Enter additional GPT Context (or select context before pressing Ctrl + .) ..."></textarea>
                </div>
                <button type="submit" id="gpt-search-prompt-button">Create Magic</button>
            </form>
        </div>
    </body>
</html>
`);

        // insert css into the DOM
        const styleElement = document.createElement('style');
        styleElement.id = 'gpt-style';
        styleElement.innerHTML = `
html, body {
    background: transparent !important;
}
#gpt-search-prompt-iframe {
    all: initial;
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 99999;
    isolation: isolate;
}
`;
        shadowRoot.appendChild(styleElement);

        // insert spinner html element with inline style into the DOM

        spinner = document.createElement('div');
        spinner.id = 'gpt-spinner-wrapper';
        spinner.innerHTML = `<div id="gpt-spinner"></div>`;
        searchPromptIframeDocument.body.appendChild(spinner);

        let searchPrompt = searchPromptIframeDocument.getElementById('gpt-search-prompt');

        // add all the event listeners only once
        // close when clicking outside of the search prompt
        searchPrompt.addEventListener('click', function (event) {
            if (event.target.id === 'gpt-search-prompt') {
                searchPromptClose();
            }
        });

        // close when pressing escape
        document.addEventListener('keydown', e => searchPromptCloseHandler(e));
        shadowRoot.addEventListener('keydown', e => searchPromptCloseHandler(e));
        searchPrompt.addEventListener('keydown', e => searchPromptCloseHandler(e));

        function searchPromptCloseHandler(e) {
            if (e.key === 'Escape') {
                searchPromptClose();
            }
        }

        // copy to clipboard
        searchPrompt.querySelector('#gpt-search-prompt-copy-button').addEventListener('click', function (event) {

            const textarea = searchPrompt.querySelector('textarea');

            searchPrompt.querySelector('textarea').focus();
            searchPrompt.querySelector('textarea').select();

            if (searchPromptIframeDocument.execCommand("copy")) {
                // set background color temporarily to green
                event.currentTarget.addEventListener('transitionend', function (event) {
                    event.currentTarget.style.boxShadow = '';
                    event.currentTarget.addEventListener('transitionend', function (event) {
                        event.stopPropagation();
                        // close search prompt
                        searchPromptClose();
                    }, { once: true });
                }, { once: true });

                event.currentTarget.style.boxShadow = '0 0 8px 8px lightgreen';
            }
            else {
                // set background color temporarily to red
                event.currentTarget.addEventListener('transitionend', function () {
                    event.currentTarget.style.boxShadow = '';
                }, { once: true });

                event.currentTarget.style.boxShadow = '0 0 8px 8px red';
            }

        });

        // auto resize textarea
        searchPrompt.querySelector('textarea').addEventListener('input', (event) => {
            event.currentTarget.style.height = 'auto';
            event.currentTarget.style.height = event.currentTarget.scrollHeight + 3 + 'px';
        });

        // submit search prompt
        searchPrompt.querySelector('form').addEventListener('submit', function (event) {
            event.preventDefault();

            const input = searchPrompt.querySelector('input').value;
            const textarea = searchPrompt.querySelector('textarea').value;

            // validate form fields
            if (!event.target.checkValidity()) {
                event.target.reportValidity();
                return;
            }

            if (input.length > 0) {
                if (textarea.trim().length > 0) {
                    gptCompletion(`${input}: ${textarea}`);
                }
                else {
                    gptCompletion(input);
                }

            }
        });



        // get focussed or selected element
        const currentElement = getActiveElement();

        hasValue = typeof currentElement.value !== "undefined";

        if (debug) {
            console.log("Event Target: ", currentElement);
            console.log("Has Value: ", hasValue);
            console.log("Is Content Editable: ", currentElement.isContentEditable);
        }

        // store currently active element
        if (hasValue || currentElement.isContentEditable) {
            isEditable = true;
        }
        else {
            if (currentElement.closest('[contenteditable]')) {
                currentElement = currentElement.closest('[contenteditable]');
                isEditable = true;
            }
            else {
                isEditable = false;
            }

            // make focusable to focus back from close event
            if (currentElement.hasAttribute('tabindex')) {
                currentElement.dataset.gptRemoveTabindex = 'false';
            } else {
                currentElement.setAttribute('tabindex', '0')
                currentElement.dataset.gptRemoveTabindex = 'true';
            }

        }

        if (debug) {
            console.log("Final Event Target: ", currentElement);
        }

        selectionText = '';
        // get selection in contenteditable
        if (hasValue) {
            selectionStart = currentElement.selectionStart;
            selectionEnd = currentElement.selectionEnd;

            if (selectionStart === selectionEnd) {
                selectionStart = 0;
                selectionEnd = currentElement.value.length;
            }

            selectionText = currentElement.value.substring(selectionStart, selectionEnd);
        }

        // get selection in textarea or text field
        else {
            let selection = currentElement.ownerDocument.getSelection();

            if (isEditable && selection.isCollapsed) {
                selection.selectAllChildren(currentElement);
            }

            selectionText = selection.toString();
        }

        if (debug) {
            console.log("Selection: ", selectionText);
        }


        // show search prompt
        showSearchPrompt(selectionText);


        // functions

        // show search prompt
        function showSearchPrompt(context = "") {

            console.log(currentElement);

            // hide copy button
            searchPrompt.querySelector('#gpt-search-prompt-copy-button').style.display = 'none';
            searchPrompt.querySelector('#gpt-search-prompt-copy-button').classList.remove('gpt-show');

            // fill textarea with context
            const textarea = searchPrompt.querySelector('textarea');
            textarea.value = context;

            // show iframe, then show prompt
            searchPromptIframe.style.display = 'block';
            searchPrompt.style.display = 'flex';
            textarea.dispatchEvent(new Event('input'));

            setTimeout(() => {
                searchPrompt.classList.add('gpt-show');
                searchPrompt.querySelector('input').focus();
            }, 100);
        }

        // close
        function searchPromptClose() {

            console.log(currentElement);

            // abort existing fetch request
            if (controller) {
                controller.abort();
            }

            // hide prompt
            searchPrompt.addEventListener('transitionend', function (event) {
                searchPrompt.style.display = 'none';
                searchPromptIframe.style.display = 'none';

                // place cursor back into active element
                currentElement.focus();

                // remove tabindex
                if (currentElement.dataset.gptRemoveTabindex === 'true') {
                    currentElement.removeAttribute('tabindex');
                    currentElement.removeAttribute('data-gpt-remove-tabindex');
                }

                // remove shadowRootContainer
                shadowRootContainer.remove();

            }, { once: true });

            searchPrompt.classList.remove('gpt-show');
        }

        // get active element
        function getActiveElement(element = document.activeElement) {
            const shadowRoot = element.shadowRoot;
            const contentDocument = element.contentDocument;

            if (shadowRoot && shadowRoot.activeElement) {
                return getActiveElement(shadowRoot.activeElement);
            }

            if (contentDocument && contentDocument.activeElement) {
                return getActiveElement(contentDocument.activeElement);
            }

            return element;
        }

        async function gptCompletion(prompt) {

            controller = new AbortController();

            if (debug) {
                console.log("Prompt: " + prompt);
            }

            const requestOptions = {
                signal: controller.signal,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${gptSettingApikey}`
                },
                body: JSON.stringify({
                    model: "text-davinci-003",
                    prompt: prompt,
                    max_tokens: 2048,
                    temperature: 0.7,
                    top_p: 1.0,
                    frequency_penalty: 0.0,
                    presence_penalty: 1,
                })
            };

            let response = await gptFetchWithSpinner("https://api.openai.com/v1/completions", requestOptions);
            if (!response.ok) {
                // show error message
                alert("Error: " + response.status + " " + response.statusText);
                return;
            }

            let json = await response.json();

            if (debug) {
                console.log(`Result Json`, json);
                console.log(`Result Text: ${json.choices[0].text}`);
            }

            let output = json.choices[0].text;

            // remove quotes
            output = output.replace(/"/g, '');

            // trim
            output = output.trim();

            // replace selection with output
            if (hasValue) {
                currentElement.value = currentElement.value.substring(0, selectionStart) + output + currentElement.value.substring(selectionEnd);
                searchPromptClose();
            } else {
                if (isEditable && currentElement.ownerDocument.execCommand('insertText', false, output)) {
                    searchPromptClose();
                }
                else {
                    const textarea = searchPrompt.querySelector('textarea');
                    textarea.value = output;
                    textarea.dispatchEvent(new Event('input'));
                    textarea.classList.add('gpt-bounce');
                    setTimeout(() => {
                        textarea.classList.remove('gpt-bounce');
                        // show copy button
                        searchPrompt.querySelector('#gpt-search-prompt-copy-button').style.display = 'block';
                        setTimeout(() => {
                            searchPrompt.querySelector('#gpt-search-prompt-copy-button').classList.add('gpt-show');
                        }, 100);
                    }, 1000);

                    // select textarea
                    textarea.focus();
                    textarea.select();

                }
            }
        }


        // Create our new version of the fetch function
        function gptFetchWithSpinner() {

            // Create hooks
            var gptFetchStart = new Event('gptFetchStart', { 'view': searchPromptIframeDocument, 'bubbles': true, 'cancelable': false });
            var gptFetchEnd = new Event('gptFetchEnd', { 'view': searchPromptIframeDocument, 'bubbles': true, 'cancelable': false });

            // Pass the supplied arguments to the real fetch function
            var fetchCall = fetch.apply(this, arguments);

            // Trigger the gptFetchStart event
            searchPromptIframeDocument.dispatchEvent(gptFetchStart);

            fetchCall.then(function () {
                // Trigger the gptFetchEnd event
                searchPromptIframeDocument.dispatchEvent(gptFetchEnd);
            }).catch(function () {
                // Trigger the gptFetchEnd event
                shadowRoot.dispatchEvent(gptFetchEnd);
            });

            return fetchCall;
        }

        searchPromptIframeDocument.addEventListener('gptFetchStart', function () {
            spinner.style.display = 'flex';
            spinner.classList.add('gpt-show')
        });

        searchPromptIframeDocument.addEventListener('gptFetchEnd', function () {
            spinner.style.display = 'none';
            spinner.classList.remove('gpt-show')
        });


    });
})();