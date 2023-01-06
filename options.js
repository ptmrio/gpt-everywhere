// Saves options to chrome.storage
function save_options() {
    var gptSettingApikey = document.getElementById('gpt-apikey').value;
    var gptSettingDebug = document.getElementById('gpt-debug').checked;
    chrome.storage.sync.set({
        gptSettingApikey: gptSettingApikey,
        gptSettingDebug: gptSettingDebug
    }, function () {
        // Update status to let user know options were saved.
        var status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(function () {
            status.textContent = '';
        }, 750);
    });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
    // Use default value color = 'red' and likesColor = true.
    chrome.storage.sync.get({
        gptSettingApikey: '',
        gptSettingDebug: false
    }, function (items) {
        document.getElementById('gpt-apikey').value = items.gptSettingApikey;
        document.getElementById('gpt-debug').checked = items.gptSettingDebug;
    });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);