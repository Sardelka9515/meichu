function reloadCurrentTab() {
    // reload active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.reload(tabs[0].id);
    });
}

function toggleAutoDetect() {
    chrome.storage.sync.get(['autoCheck'], (result) => {
        if (result.autoCheck == "yes") {
            chrome.storage.sync.set({ autoCheck: "no" }, () => {
                console.log("autoCheck: false");
            });
        } else {
            chrome.storage.sync.set({ autoCheck: "yes" }, () => {
                console.log("autoCheck: true");
            });
        }
    });
    reloadCurrentTab()
}
const autoDetect =  chrome.storage.sync.get(["autoCheck"], 
    (result) => { document.getElementById('auto-detect').checked = result.autoCheck == "yes"; });
console.log("stored: " + autoDetect);

document.getElementById('auto-detect').addEventListener('change', toggleAutoDetect);