document.addEventListener("yt-navigate-finish", addAIDetectionButton);

function addAIDetectionButton() {
  if (window.location.pathname !== "/watch") return;

  const observer = new MutationObserver((mutations, obs) => {
    const playerControls = document.querySelector(".ytp-right-controls");
    if (playerControls) {
      createButton(playerControls);
      obs.disconnect();
      console.log("AI Detection button added");
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function createButton(playerControls) {
  const aiButton = document.createElement("button");
  aiButton.className = "ytp-button ai-detection-button";
  aiButton.innerHTML =
    '<svg height="100%" version="1.1" viewBox="0 0 36 36" width="100%"><use class="ytp-svg-shadow"></use><path d="M18 10.5c-4.14 0-7.5 3.36-7.5 7.5s3.36 7.5 7.5 7.5 7.5-3.36 7.5-7.5-3.36-7.5-7.5-7.5zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="#fff"></path></svg>';
  aiButton.title = "檢查視頻是否由 AI 生成";

  aiButton.addEventListener("click", handleAIDetectionClick);

  playerControls.insertBefore(aiButton, playerControls.firstChild);
}

function handleAIDetectionClick() {
  console.log("AI Detection button clicked");
  const video = document.querySelector("video");
  if (!video) {
    console.error("Video element not found");
    return;
  }

  const currentTime = video.currentTime;
  const videoId = getVideoId();

  if (!videoId) {
    console.error("Unable to get video ID");
    alert("無法獲取視頻 ID");
    return;
  }

  const startTime = prompt(
    "請輸入開始時間 (格式: MM:SS)",
    formatTime(currentTime)
  );
  if (!startTime) {
    console.log("User cancelled time input");
    return;
  }

  const endTimeSeconds = Math.min(parseTime(startTime) + 30, video.duration);
  const endTime = formatTime(endTimeSeconds);

  console.log(`Selected time range: ${startTime} - ${endTime}`);

  const confirmed = confirm(
    `確定要檢測 ${startTime} 到 ${endTime} 這段時間嗎？`
  );
  if (!confirmed) {
    console.log("User cancelled detection");
    return;
  }
  var args = {
    url: window.location.href,
    async: true,
    download_start: parseTime(startTime),
    download_end: endTimeSeconds,  
    sample_count: 50
  };

  console.log("Sending message to background script");
  chrome.runtime.sendMessage(
    {
      action: "checkVideoAI",
      data: args
    },
    (response) => {
      console.log("Received response from background script: " + JSON.stringify(response));
      if (response) {
        if(response.status === "completed") {
          showResult(response.result, startTime, endTime);
        }
        else{
          alert("id: " + response.id + ", status: " + response.status);
        }
      } 
      else {
        console.error("Detection failed");
        alert("檢測失敗，請稍後再試");
      }
    }
  );
}

function getVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("v");
}

function showResult(result, startTime, endTime) {
  console.log("Showing result", result);
  const message = `在 ${startTime} 到 ${endTime} 這段時間，此視頻${result.message}（準確度：${result.accuracy}%）`;
  alert(message);
}

function formatTime(timeInSeconds) {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

function parseTime(timeString) {
  const [minutes, seconds] = timeString.split(":").map(Number);
  return minutes * 60 + seconds;
}
