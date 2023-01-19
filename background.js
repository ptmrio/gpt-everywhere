chrome.commands.onCommand.addListener((command) => {
    if (command === 'gptShowPrompt') {
        (async () => {
            let queryOptions = { active: true, lastFocusedWindow: true };
            let [tab] = await chrome.tabs.query(queryOptions);

            // execute script
            chrome.scripting.executeScript(
                {
                    target: { tabId: tab.id },
                    files: ['src/gptprompt.js'],
                },
                () => { });
        })();
    }
});