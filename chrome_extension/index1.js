function reloadCurrentTab() {
    // reload active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.reload(tabs[0].id);
    });
}

function toggleAutoDetect() {
    chrome.storage.sync.get(["autoCheck"], (result) => {
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
    reloadCurrentTab();
}
const autoDetect = chrome.storage.sync.get(["autoCheck"], (result) => {
    document.getElementById("auto-detect").checked = result.autoCheck == "yes";
});
console.log("stored: " + autoDetect);

document
    .getElementById("auto-detect")
    .addEventListener("change", toggleAutoDetect);

document
    .getElementById("manual-video-detect")
    .addEventListener("click", function (e) {
        e.preventDefault();

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const currentUrl = tabs[0].url;
            console.log("Current URL: ", currentUrl);

            const optionsUrl = `options.html?videoUrl=${encodeURIComponent(
                currentUrl
            )}`;

            const callback = function (currentUrl, optionsUrl) {
                if (currentUrl.includes("youtube.com/watch")) {
                    var ytplayer = document.getElementById("movie_player");
                    ytplayer = ytplayer.querySelector("video");

                    console.log("ytplayer:" + ytplayer.outerHTML);
                    if (ytplayer) {
                        optionsUrl += "&currentTime=" + Math.round(ytplayer.currentTime);
                    }
                }
                return optionsUrl;
            }
            chrome.scripting.executeScript(
                { target: { tabId: tabs[0].id }, func: callback, args: [currentUrl, optionsUrl] },
                (injectionResults) => {
                    window.open(injectionResults[0].result, "_blank");
                });
        });
    });
