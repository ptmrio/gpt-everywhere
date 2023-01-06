"use strict";

const shadowRootContainer = document.createElement('div');
shadowRootContainer.id = 'gpt-shadow-root-container';
document.body.appendChild(shadowRootContainer);
const shadowRoot = shadowRootContainer.attachShadow({ mode: 'open' });

// store currently active element
let activeElement = null;

// store current selection
let isEditable = false;
let hasValue;
let selectionParameters = [];
let selectionText = null;
let selectionStart = null;
let selectionEnd = null;
let gptSettingApikey = null;
let gptSettingDebug = false;


// get options
chrome.storage.sync.get({
    gptSettingApikey: '',
    gptSettingDebug: false
}, function (items) {
    gptSettingApikey = items.gptSettingApikey;
    gptSettingDebug = items.gptSettingDebug;
});

// debug
const debug = gptSettingDebug ? true : false;

// Listen for the user typing ".gpt" in a text field or textarea
window.addEventListener('keydown', function (event) {
    if (debug) {
        console.log("Key pressed: ", event.key);
    }
    if (event.key === '.' && event.ctrlKey && event.altKey) {

        hasValue = typeof event.target.value !== "undefined";

        event.preventDefault();

        if (debug) {
            console.log("CTRL + . pressed");
            console.log("Event Target: ", event.target);
        }

        // store currently active element
        if (hasValue || event.target.isContentEditable) {
            isEditable = true;
            activeElement = event.target;
        }
        else {
            activeElement = event.target.closest('[contenteditable]');
            if (activeElement) {
                isEditable = true;
            }
            else {
                isEditable = false;
            }
        }

        selectionText = '';
        // get selection in contenteditable
        if (hasValue) {
            selectionStart = activeElement.selectionStart;
            selectionEnd = activeElement.selectionEnd;

            if (selectionStart === selectionEnd) {
                selectionStart = 0;
                selectionEnd = activeElement.value.length;
            }

            selectionText = activeElement.value.substring(selectionStart, selectionEnd);
        }
        // get selection in textarea or text field
        else if (isEditable) {
            let selection = window.getSelection();

            if (selection.isCollapsed) {
                selection.selectAllChildren(activeElement);
            }

            selectionParameters = [selection.anchorNode, selection.anchorOffset, selection.focusNode, selection.focusOffset]
            selectionText = selection.toString();
        }

        // Send the current input text to the background script
        showSearchPrompt(selectionText);
    }
});

// insert spinner html element with inline style into the DOM

const spinnerElement = document.createElement('div');
spinnerElement.id = 'gpt-spinner-wrapper';
spinnerElement.innerHTML = `
    <div id="gpt-spinner"></div>
`;
shadowRoot.appendChild(spinnerElement);


// create a search bar prompt element as shadow DOM
const searchPromptElement = document.createElement('div');
searchPromptElement.id = 'gpt-search-prompt';
searchPromptElement.innerHTML = `
    <form method="get" id="gpt-search-prompt-text">
        <input id="gpt-search-prompt-input" type="text" placeholder="Enter your GPT Command ..." required>

        <textarea id="gpt-search-prompt-textarea" placeholder="Enter additional GPT Context (or select context before pressing Ctrl + .) ..."></textarea>

        <button type="submit" id="gpt-search-prompt-button">Create Magic</button>
    </form>
`;
shadowRoot.appendChild(searchPromptElement);


// function for showing the search prompt
const searchPrompt = shadowRoot.getElementById('gpt-search-prompt');
const showSearchPrompt = ((context = "") => {
    const textarea = searchPrompt.querySelector('textarea');
    textarea.value = context;
    searchPrompt.style.display = 'flex';
    setTimeout(() => {
        searchPrompt.classList.add('gpt-show');
    }, 100);

    searchPrompt.querySelector('input').focus();
});

// close
const searchPromptClose = () => {
    searchPrompt.classList.remove('gpt-show');
    searchPrompt.addEventListener('transitionend', function () {
        searchPrompt.style.display = 'none';
    }, { once: true });
};

// close when clicking outside of the search prompt
shadowRoot.addEventListener('click', function (event) {
    if (event.target === shadowRoot.getElementById('gpt-search-prompt')) {
        searchPromptClose();
    }
});

// close when pressing escape
shadowRoot.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        searchPromptClose();
    }
});

// submit search prompt
searchPrompt.querySelector('form').addEventListener('submit', function (event) {
    event.preventDefault();

    const input = searchPrompt.querySelector('input').value;
    const textarea = searchPrompt.querySelector('textarea').value;

    // validate form fields
    if (!this.checkValidity()) {
        this.reportValidity();
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



const endpoint = " https://api.openai.com/v1/completions";

const gptCompletion = async (prompt) => {

    if (debug) {
        console.log("Prompt: " + prompt);
    }

    const requestOptions = {
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

    let response = await gptFetchWithSpinner(endpoint, requestOptions);
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
        activeElement.value = activeElement.value.substring(0, selectionStart) + output + activeElement.value.substring(selectionEnd);
        searchPromptClose();
    } else {
        // if (isEditable) {
        //     let targetSelection = window.getSelection();
        //     targetSelection.setBaseAndExtent(selectionParameters[0], selectionParameters[1], selectionParameters[2], selectionParameters[3]);

        //     // replace selection
        //     targetSelection.deleteFromDocument();
        //     targetSelection.getRangeAt(0).insertNode(document.createTextNode(output));

        //     searchPromptClose();
        // }
        // else {
        searchPrompt.querySelector('textarea').value = output;
        searchPrompt.querySelector('textarea').classList.add('gpt-bounce');
        setTimeout(() => {
            searchPrompt.querySelector('textarea').classList.remove('gpt-bounce');
        }, 1000);

        // select textarea
        searchPrompt.querySelector('textarea').focus();
        searchPrompt.querySelector('textarea').select();
        // }
    }


}



// insert css into the DOM
const styleElement = document.createElement('style');
styleElement.innerHTML = `
    #gpt-spinner-wrapper {
        display: none;
        justify-content: center;
        align-items: center;
        background-color: rgba(55, 55, 55, 0.33);
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

    #gpt-search-prompt {
        display: none;
        justify-content: center;
        align-items: center;
        background-color: rgba(55, 55, 55, 0.33);
        width: 100vw;
        height: 100vh;
        opacity: 0;
        position: fixed;
        top: 0;
        left: 0;
        z-index: 99998;
        transition: opacity 0.2s ease-in;
    }

    #gpt-search-prompt.gpt-show,
    #gpt-spinner-wrapper.gpt-show {
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
        height: 10em;
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

    #gpt-search-prompt-button:hover,
    #gpt-search-prompt-button:acttive,
    #gpt-search-prompt-button:focus {
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
    `;
shadowRoot.appendChild(styleElement);

// Spinner
const spinner = shadowRoot.querySelector('#gpt-spinner-wrapper');

// Create our new version of the fetch function
window.gptFetchWithSpinner = function () {

    // Create hooks
    var gptFetchStart = new Event('gptFetchStart', { 'view': shadowRoot, 'bubbles': true, 'cancelable': false });
    var gptFetchEnd = new Event('gptFetchEnd', { 'view': shadowRoot, 'bubbles': true, 'cancelable': false });

    // Pass the supplied arguments to the real fetch function
    var fetchCall = fetch.apply(this, arguments);

    // Trigger the gptFetchStart event
    shadowRoot.dispatchEvent(gptFetchStart);

    fetchCall.then(function () {
        // Trigger the gptFetchEnd event
        shadowRoot.dispatchEvent(gptFetchEnd);
    }).catch(function () {
        // Trigger the gptFetchEnd event
        shadowRoot.dispatchEvent(gptFetchEnd);
    });

    return fetchCall;
};

shadowRoot.addEventListener('gptFetchStart', function () {
    spinner.style.display = 'flex';
    spinner.classList.add('gpt-show')
});

shadowRoot.addEventListener('gptFetchEnd', function () {
    spinner.style.display = 'none';
    spinner.classList.remove('gpt-show')
});