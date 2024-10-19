window.onload = function () {
  const navLinks = document.querySelectorAll(".tab-link");
  const sections = document.querySelectorAll("section");
  const uploadText = document.getElementById("uploadText");
  const progressBar = document.getElementById("progressBar");
  const progressFill = document.getElementById("progressFill");
  const progressText = document.getElementById("progressText");
  const responseArea = document.getElementById("responseArea");
  const resultText = document.getElementById("resultText");
  const youtubeDetectBtn = document.getElementById("youtubeDetectBtn");
  const youtubeLinkInput = document.getElementById("youtubeLink");
  const startTimeInput = document.getElementById("startTime");
  const endTimeInput = document.getElementById("endTime");
  const dropArea = document.getElementById("dropArea");
  const fileInput = document.getElementById("fileInput");

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = link.getAttribute("data-target");

      sections.forEach((section) => section.classList.remove("active"));
      navLinks.forEach((navLink) => navLink.classList.remove("active"));

      document.getElementById(targetId).classList.add("active");
      link.classList.add("active");
    });
  });

  // Load saved settings from Chrome storage
  chrome.storage.sync.get(["autoCheck"], (result) => {
    const autoCheckValue = result.autoCheck || "yes";
    document.getElementById("autoCheckSelect").value = autoCheckValue;
  });

  dropAreaClick();

  // AI detection button logic
  document.getElementById("detectBtn").addEventListener("click", async () => {
    const file = fileInput.files[0];

    if (!file) {
      alert("Please select a file.");
      return;
    }

    console.log("Uploading file:", file);

    // reveal progress bar and hide upload text
    uploadText.classList.add("hidden");
    progressBar.classList.remove("hidden");

    await simulateProgressTo(85, 3000);

    // const isAI = Math.random() < 0.5; // 隨機生成是否為 AI 生成，50% 機率
    // alert(isAI ? "AI Generated" : "Not AI");

    await detectAIContentInOptionsJs(file, "image");
  });

  // remove image preview logic
  clearBtn.addEventListener("click", () => {
    resetProgress();

    preview.src = ""; // 清除圖片來源
    preview.classList.add("hidden"); // 隱藏預覽圖片
    responseArea.classList.add("hidden"); // 隱藏檢測結果

    fileInput.value = ""; // 重置 file input

    uploadText.textContent = "拖放圖片或視頻到這裡，或者點擊上傳";
  });

  youtubeDetectBtn.addEventListener("click", () => {
    const youtubeLink = youtubeLinkInput.value;
    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;

    console.log(
      "YouTube link:",
      youtubeLink,
      "Start time:",
      startTime,
      "End time:",
      endTime
    );

    if (!youtubeLink) {
      alert("Please fill in the YouTube link.");
      return;
    }

    if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
      alert("Please fill in the correct time format (HH:MM:SS).");
      return;
    }

    var args = {
      url: youtubeLink,
      async: true,
      download_start: parseTime(startTime),
      download_end: parseTime(endTime),
      sample_count: 50,
    };

    console.log("Sending message to background script");

    var youtubeResponse = null;

    chrome.runtime.sendMessage(
      {
        action: "checkVideoAI",
        data: args,
      },
      (response) => {
        console.log(
          "Received response from background script: " +
            JSON.stringify(response)
        );
        const videoId = response.id;
        console.log("Video ID:", videoId);

        pollResult(videoId);
      }
    );
  });
};

// keep polling result until response.status is "completed"
function pollResult(videoId) {
  setTimeout(() => {
    const status = detectAIVideoInOptionsJs(videoId);
    if (status !== "completed") {
      pollResult(videoId);
    }
  }, 5000);
}

function dropAreaClick() {
  // 監聽檔案選擇事件
  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (file && file.type.startsWith("image/")) {
      showPreview(file);
    }
  });

  dropArea.addEventListener("click", () => fileInput.click());
  dropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropArea.style.backgroundColor = "rgba(74, 144, 226, 0.2)";
  });

  dropArea.addEventListener("dragleave", () => {
    dropArea.style.backgroundColor = "";
  });

  dropArea.addEventListener("drop", (e) => {
    e.preventDefault();
    dropArea.style.backgroundColor = "";
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
    }
  });
}

// 新增圖片預覽的函數
function showPreview(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    preview.src = e.target.result; // 將上傳檔案的 URL 設為圖片來源
    preview.classList.remove("hidden"); // 顯示圖片
    preview.style.maxWidth = "100%"; // 適應區域寬度
    preview.style.marginTop = "1rem"; // 增加上方間距
  };
  reader.readAsDataURL(file); // 將檔案轉為 Data URL 格式
}

// 將檔案轉為 Base64 格式的輔助函數
function convertFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

// AI 檢測函數：將圖片轉為 Base64，並呼叫 API
async function detectAIContentInOptionsJs(file, type) {
  const apiEndpoint = "https://meichu-video.sausagee.party/analyze/image"; // 替換為您的 API URL
  const headers = {
    "X-API-KEY": "aWxvdmVzYXVzYWdl", // 將您的 API key 加入這裡
    "Content-Type": "application/json",
  };

  try {
    // 將圖片轉換為 Base64 格式
    const base64data = await convertFileToBase64(file);

    // 傳送 Base64 編碼的圖片到 background.js
    chrome.runtime.sendMessage(
      {
        action: "sendImageToBackend",
        base64Image: base64data, // 傳送 Base64 編碼圖片
        fileName: file.name, // 使用圖片的原始名稱
      },
      (response) => {
        if (response) {
          if (response.success) {
            console.log("AI analysis result:", response.result);

            const artificial = Math.round(response.result.artificial * 100); // API 返回的人工判斷
            const human = Math.round(response.result.human * 100); // API 返回的 AI 判斷
            const isAI = artificial > human;
            const AIpercent = Math.round(
              (artificial * 100) / (human + artificial)
            );
            const message = isAI ? "AI generated" : "not AI generated";
            const details = `${human}% human <br> ${artificial}% artificial`;

            // API 回傳後立即完成 100%
            updateProgress(100);
            showResponse(response);

            // 顯示「檢測完成」訊息
            uploadText.textContent = "檢測完成，請查看下方結果";
            uploadText.classList.remove("hidden");

            // alert(`The ${type} is ${message}`);
            // alert(`The ${type} is ${message} (${AIpercent}% AI)`);
            console.log(type, AIpercent, isAI, message, details);
          } else {
            console.error("Error from AI:", response.error);
          }
        } else {
          console.error("No response received from background script.");
        }
      }
    );
  } catch (error) {
    console.error("Error converting image to Base64", error);
    responseArea.innerHTML = "<p>檢測失敗，請稍後再試。</p>";
    responseArea.classList.remove("hidden");
    responseArea.style.display = "block";
  } finally {
    // 重設進度條和文字
    setTimeout(resetProgress, 1000);
  }
}

// AI 影片檢測 用id拿取/result/video
async function detectAIVideoInOptionsJs(videoId) {
  console.log(`https://meichu-video.sausagee.party/result/video?id=${videoId}`);

  const apiEndpoint = `https://meichu-video.sausagee.party/result/video?id=${videoId}`; // 替換為您的 API URL
  const headers = {
    "X-API-KEY": "aWxvdmVzYXVzYWdl", // 將您的 API key 加入這裡
    "Content-Type": "application/json",
  };

  try {
    // 傳送 Base64 編碼的圖片到 background.js
    chrome.runtime.sendMessage(
      {
        action: "getVideoResult",
        videoId: videoId,
      },
      (response) => {
        if (response) {
          console.log(JSON.stringify(response));
        } else {
          console.error("No response received from background script.");
        }
        return response.status;
      }
    );
  } catch (error) {
    // console.error("Error converting image to Base64", error);
    // responseArea.innerHTML = "<p>檢測失敗，請稍後再試。</p>";
    // responseArea.classList.remove("hidden");
    // responseArea.style.display = "block";
  } finally {
    // 重設進度條和文字
    //setTimeout(resetProgress, 1000);
  }
}

// 模擬進度條的非均速前進
function simulateProgressTo(target, duration) {
  return new Promise((resolve) => {
    let current = 0;
    const interval = setInterval(() => {
      const increment = Math.random() * 10; // 隨機遞增 0~10%
      current = Math.min(current + increment, target);
      updateProgress(current);

      if (current >= target) {
        clearInterval(interval);
        resolve();
      }
    }, duration / 30); // 每 1/30 的時間更新一次
  });
}

// 更新進度條的寬度
function updateProgress(percent) {
  progressFill.style.width = percent + "%";
  progressText.textContent = Math.round(percent) + "%";
}

// 重設進度條和上傳區域
function resetProgress() {
  progressFill.style.width = "0%";
  progressText.textContent = "0%";
  progressBar.classList.add("hidden");
  uploadText.classList.remove("hidden");
}

// 顯示 API 檢測結果
function showResponse(response) {
  console.log("I am here in showResponse");
  responseArea.classList.remove("hidden");
  // aiBar.classList.remove("hidden");
  // aiFill.classList.remove("hidden");

  const artificial = Math.round(response.result.artificial * 100);
  const human = Math.round(response.result.human * 100);
  const total = artificial + human;
  const isAI = artificial > human;
  const message = isAI ? "AI generated" : "Not AI generated";
  console.log("artificial", artificial, "human", human, "total", total);

  // 設定進度條比例
  const humanPercentage = (human / total) * 100;
  document.querySelector(".aiOrHumanFill").style.width = "100%";
  document
    .querySelector(".aiOrHumanFill")
    .style.setProperty("--human-percentage", `${humanPercentage}%`);

  // resultText.textContent = message;
  resultText.innerHTML = `${message}<br>${human}% human | ${artificial}% artificial`;
}

// 檢查 YouTube 連結格式是否正確的函式
function isValidYouTubeLink(url) {
  const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
  return pattern.test(url);
}

function isValidTimeFormat(time) {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
  return timeRegex.test(time);
}

function parseTime(timeString) {
  const [hours, minutes, seconds] = timeString.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}
