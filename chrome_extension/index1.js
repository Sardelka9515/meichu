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
    e.preventDefault(); // 防止默认的链接行为

    // 获取当前活动选项卡的 URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentUrl = tabs[0].url; // 当前选项卡的 URL
      console.log("Current YouTube URL: ", currentUrl); // 打印当前 URL

      // 检查 URL 是否是 YouTube 视频
      if (currentUrl.includes("youtube.com/watch")) {
        // 打开 options.html，并将 YouTube URL 作为查询参数传递
        const optionsUrl = `options.html?youtubeUrl=${encodeURIComponent(
          currentUrl
        )}`;
        window.open(optionsUrl, "_blank"); // 在新选项卡中打开
        // chrome.tabs.executeScript(
        //   tabs[0].id,
        //   {
        //     code: 'document.querySelector("video").currentTime;',
        //   },
        //   (results) => {
        //     const currentTime = results[0] || 0; // 默认值为 0
        //     console.log("Current playback time: ", currentTime); // 打印当前播放时间
        //     // 打开 options.html，并将 YouTube URL 和当前播放时间作为查询参数传递
        //     const optionsUrl = `options.html?youtubeUrl=${encodeURIComponent(
        //       currentUrl
        //     )}&currentTime=${encodeURIComponent(currentTime)}`;
        //     window.open(optionsUrl, "_blank"); // 在新选项卡中打开
        //   }
        // );
      } else {
        alert("請在 YouTube 視頻頁面上使用此功能。");
      }
    });
  });
