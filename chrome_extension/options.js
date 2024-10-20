window.onload = function () {
  const navLinks = document.querySelectorAll(".tab-link");
  const sections = document.querySelectorAll("section");
  const uploadText = document.getElementById("uploadText");
  const progressBar = document.getElementById("progressBar");
  const progressFill = document.getElementById("progressFill");
  const progressText = document.getElementById("progressText");
  const responseArea = document.getElementById("responseArea");
  const resultText = document.getElementById("resultText");

  const videoStatusText = document.getElementById("videoStatusText");
  const videoProgressBar = document.getElementById("videoProgressBar");
  const videoProgressFill = document.getElementById("videoProgressFill");
  const videoResponseArea = document.getElementById("videoResponseArea");
  const videoLoadingSpinner = document.getElementById("videoLoadingSpinner");

  const youtubeDetectBtn = document.getElementById("youtubeDetectBtn");
  const youtubeLinkInput = document.getElementById("youtubeLink");
  const startTimeInput = document.getElementById("startTime");
  const endTimeInput = document.getElementById("endTime");
  const dropArea = document.getElementById("dropArea");
  const fileInput = document.getElementById("fileInput");
  const clearBtn = document.getElementById("clearBtn");
  const detectBtn = document.getElementById("detectBtn");
  const preview = document.getElementById("preview");

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
    // 注意：HTML 中沒有 autoCheckSelect 元素，所以這行可能需要移除或更新
    // document.getElementById("autoCheckSelect").value = autoCheckValue;
  });

  dropAreaClick();

  // AI detection button logic
  detectBtn.addEventListener("click", async () => {
    const file = fileInput.files[0];

    if (!file) {
      alert("請選擇一個檔案。");
      return;
    }

    console.log("Uploading file:", file);

    // reveal progress bar and hide upload text
    uploadText.classList.add("hidden");
    progressBar.classList.remove("hidden");

    await simulateProgressTo(85, 3000);

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
    uploadText.classList.remove("hidden");
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
      alert("請輸入影片連結。");
      return;
    }

    if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
      alert("請輸入正確的時間格式 (HH:MM:SS)。");
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
        resetVideoProgress();

        videoResponseArea.classList.add("hidden");
        videoStatusText.classList.remove("hidden");
        videoStatusText.textContent = "請稍後";
        youtubeDetectBtn.textContent = "檢測中";
        youtubeDetectBtn.disabled = true;
        videoLoadingSpinner.style.display = "block";
        getVideoResult(videoId);
      }
    );
  });

  const videoUrl = getQueryParameter("videoUrl");
  const currentTime = Number(getQueryParameter("currentTime"));

  if (videoUrl) {
    document.getElementById("youtubeLink").value = videoUrl;
  }
  if (currentTime) {
    document.getElementById("startTime").value = formatTime(currentTime);
    document.getElementById("endTime").value = formatTime(currentTime + 10);
  }

  chrome.storage.sync.get(["lastVideoResult"], (stuff) => {
    if (stuff.lastVideoResult) {
      displayVideoResult(stuff.lastVideoResult);
    }
  });
};

function displayVideoResult(response) {
  document.querySelector(
    "#examine p:nth-child(2)"
  ).textContent = `影片來源: ${response.url}`;
  document.querySelector(
    "#examine p:nth-child(3)"
  ).textContent = `開始時間: ${formatTime(response.download_start)}`;
  document.querySelector(
    "#examine p:nth-child(4)"
  ).textContent = `結束時間: ${formatTime(response.download_end)}`;

  percentAI = calculateAIRate(response.results);
  const message = percentAI > 50 ? "AI generated" : "Not AI generated";

  document.querySelector(
    "#examine p:nth-child(5)"
  ).textContent = `檢測結果: ${message}`;

  drawChart(response.results);
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

// 將檔案轉為 Base64 格式的輔助函數
function convertFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}
// 解析 URL 查询参数
function getQueryParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// 格式化时间为 HH:mm:ss
function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hrs.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function dropAreaClick() {
  const dropArea = document.getElementById("dropArea");
  const fileInput = document.getElementById("fileInput");

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
    dropArea.style.backgroundColor = "rgba(47, 94, 126, 0.2)";
  });

  dropArea.addEventListener("dragleave", () => {
    dropArea.style.backgroundColor = "";
  });

  dropArea.addEventListener("drop", (e) => {
    e.preventDefault();
    dropArea.style.backgroundColor = "";
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        showPreview(file);
      }
    }
  });
}

// 新增圖片預覽的函數
function showPreview(file) {
  const preview = document.getElementById("preview");
  const reader = new FileReader();
  reader.onload = function (e) {
    preview.src = e.target.result; // 將上傳檔案的 URL 設為圖片來源
    preview.classList.remove("hidden"); // 顯示圖片
    preview.style.maxWidth = "100%"; // 適應區域寬度
    preview.style.marginTop = "1rem"; // 增加上方間距
  };
  reader.readAsDataURL(file); // 將檔案轉為 Data URL 格式
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
            const details = `${human}% human | ${artificial}% artificial`;

            // API 回傳後立即完成 100%
            updateProgress(100);
            showResponse(response);

            // 顯示「檢測完成」訊息
            uploadText.textContent = "檢測完成，請查看下方結果";
            uploadText.classList.remove("hidden");

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

// 更新進度條的寬度
function updateProgress(percent) {
  const progressFill = document.getElementById("progressFill");
  const progressText = document.getElementById("progressText");
  progressFill.style.width = percent + "%";
  progressText.textContent = Math.round(percent) + "%";
}

// 重設進度條和上傳區域
function resetProgress() {
  const progressFill = document.getElementById("progressFill");
  const progressText = document.getElementById("progressText");
  const progressBar = document.getElementById("progressBar");
  const uploadText = document.getElementById("uploadText");

  progressFill.style.width = "0%";
  progressText.textContent = "0%";
  progressBar.classList.add("hidden");
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

// 顯示 API 檢測結果
function showResponse(response) {
  console.log("I am here in showResponse");
  const responseArea = document.getElementById("responseArea");
  const resultText = document.getElementById("resultText");

  responseArea.classList.remove("hidden");

  const artificial = Math.round(response.result.artificial * 100);
  const human = Math.round(response.result.human * 100);
  const total = artificial + human;
  const isAI = artificial > human;
  const message = isAI ? "AI generated" : "Not AI generated";
  console.log("artificial", artificial, "human", human, "total", total);

  // 設定進度條比例
  const humanPercentage = (human / total) * 100;
  const resultFill = document.getElementById("image-result-fill");
  resultFill.style.width = "100%";
  resultFill.style.setProperty("--human-percentage", `${humanPercentage}%`);

  resultText.innerHTML = `${message}<br>${human}% human | ${artificial}% artificial`;
}

function showVideoResponse(percentAI) {
  const resultFill = document.getElementById("video-result-fill");
  resultFill.style.width = "100%";
  resultFill.style.setProperty("--human-percentage", `${100 - percentAI}%`);
  videoStatusText.textContent = `${100 - percentAI}% Human | ${percentAI}% AI`;
  videoResponseArea.classList.remove("hidden");
}

// AI 影片檢測 用id拿取/result/video
function getVideoResult(videoId) {
  try {
    // 傳送 Base64 編碼的圖片到 background.js
    chrome.runtime.sendMessage(
      {
        action: "getVideoResult",
        videoId: videoId,
      },
      function (response) {
        if (response) {
          updateVideoProgress(100 * response.progress);
          console.log(JSON.stringify(response));
          if (response.status === "completed") {
            console.log("Video AI analysis completed:", response.result);
            videoProgressBar.classList.add("hidden");
            youtubeDetectBtn.textContent = "開始檢測";
            youtubeDetectBtn.disabled = false;
            showVideoResponse(calculateAIRate(response.results));
            videoLoadingSpinner.style.display = "none";
            finalVideoResult = response;
            chrome.storage.sync.set({ lastVideoResult: response }, () => {});
            displayVideoResult(response);
          } else if (response.status === "error") {
            console.error("Error from AI:", response.error);
            videoStatusText.textContent = "檢測失敗";
            youtubeDetectBtn.textContent = "開始檢測";
            youtubeDetectBtn.disabled = false;
            videoLoadingSpinner.style.display = "none";
          } else {
            if (response.status === "queued") {
              videoStatusText.textContent = "排隊中";
            } else if (response.status === "downloading") {
              videoStatusText.textContent = "資料擷取中";
            } else if (response.status === "extracting") {
              videoStatusText.textContent = "解碼中";
            } else if (response.status === "analyzing") {
              videoStatusText.textContent = "分析中";
            } else {
              videoStatusText.textContent = "蛤";
            }
            setTimeout(() => {
              getVideoResult(videoId);
            }, 2000);
          }
        } else {
          console.error("No response received from background script.");
        }
      }
    );
  } catch (error) {
    console.error("Error in getVideoResult", error);
  }
}

function updateVideoProgress(percent) {
  videoProgressBar.classList.remove("hidden");
  videoProgressFill.style.width = percent + "%";
}

// 重設進度條和上傳區域
function resetVideoProgress() {
  videoProgressFill.style.width = "0%";
  videoProgressBar.classList.add("hidden");
}

function calculateAIRate(results) {
  var aiScore = 0;
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.artificial > result.human) {
      aiScore += 1;
    }
  }
  return Math.round((100 * aiScore) / results.length);
}

function drawChart(data) {
  // 從資料中提取 human 和 artificial 數值
  const labels = data.map((_, index) => `Image ${index + 1}`); // X 軸標籤
  const humanData = data.map((item) => item.human); // Y 軸: human
  const artificialData = data.map((item) => item.artificial); // Y 軸: artificial

  // Cleanup old chart
  let chartStatus = Chart.getChart("myChart"); // <canvas> id
  if (chartStatus != undefined) {
    chartStatus.destroy();
  }

  // 建立 Chart.js 圖表
  const ctx = document.getElementById("myChart").getContext("2d");
  const myChart = new Chart(ctx, {
    type: "line", // 折線圖類型
    data: {
      labels: labels, // X 軸標籤
      datasets: [
        {
          label: "Human", // Human 資料
          data: humanData,
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 2,
          fill: false,
        },
        {
          label: "Artificial", // Artificial 資料
          data: artificialData,
          borderColor: "rgba(255, 99, 132, 1)",
          borderWidth: 2,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      interaction: {
        intersect: false,
        mode: "index",
      },
      plugins: {
        legend: {
          position: "top", // 標籤位置
        },
        tooltip: {
          // callbacks: {
          //   label: function (context) {
          //     const index = context.dataIndex;
          //     const img = data[index].image; // 取得對應的圖片連結
          //     return `${context.dataset.label}: ${context.raw} (Image: ${img})`;
          //   },
          // },
          enabled: false, // 禁用默認 tooltip
          external: function (context) {
            // 獲取 tooltip 的參數
            const tooltip = context.tooltip;
            const tooltipEl = document.getElementById("tooltip");

            if (tooltip.opacity === 0) {
              tooltipEl.style.display = "none"; // 隱藏 tooltip
              return;
            }

            // 更新 tooltip 內容
            if (tooltip.body) {
              const index = tooltip.dataPoints[0].dataIndex; // 獲取對應數據的索引
              const img = data[index].image; // 獲取對應的圖片
              tooltipEl.innerHTML = `
                    <div>
                      <strong>${tooltip.title[0]}</strong><br>
                      <img src="https://meichu-video.sausagee.party${img}" class="tooltip-image" alt="Image"/>
                    </div>
                  `;
            }

            // 設置 tooltip 的位置
            tooltipEl.style.opacity = 1;
            tooltipEl.style.display = "block";
            tooltipEl.style.left = tooltip.caretX - 10 + "px";
            tooltipEl.style.top = tooltip.caretY + 60 + "px";
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true, // Y 軸從 0 開始
          max: 1, // Y 軸最大值設為 1
        },
      },
    },
  });
}
