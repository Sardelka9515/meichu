// 當擴展安裝時，更新右鍵選單
chrome.runtime.onInstalled.addListener(() => {
  updateContextMenus();
});

// 偵測 AI 內容
async function detectAIContent(srcUrl, type) {
  const apiEndpoint = "https://meichu-video.sausagee.party/analyze/image"; // 替換為您的 API URL
  const headers = {
    "X-API-KEY": "aWxvdmVzYXVzYWdl", // 將您的 API key 加入這裡
  };

  const results = [];

  try {
    // 將圖片的 URL 轉換為 Blob
    const response = await fetch(srcUrl);
    const blob = await response.blob();

    // 使用 FileReader 將 Blob 轉換為 Base64
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const base64data = reader.result;

      // 傳送 Base64 編碼的圖片到 background.js
      chrome.runtime.sendMessage(
        {
          action: "sendImageToBackend",
          base64Image: base64data, // 傳送 Base64 編碼圖片
          fileName: "image.jpg", // 給圖片取一個名稱
        },
        (response) => {
          if (response) {
            if (response.success) {
              console.log("AI analysis result:", response.result);

              // 假設 API 返回的數據中包含 accuracy 和 isAI
              const artificial = Math.round(response.result.artificial * 100); // 來自 API 的準確度
              const human = Math.round(response.result.human * 100); // 來自 API 的 AI 判斷結果
              const isAI = artificial > human;
              const AIpercent = Math.round(
                (artificial * 100) / (human + artificial)
              );
              const message = isAI ? "AI generated" : "not AI generated";
              const details =
                human + "% human <br> " + artificial + "% artificial";

              // if (isAI) {
              //   img.style.border = "4px solid red"; // AI 生成圖片
              // } else {
              //   img.style.border = "4px solid green"; // 非 AI 生成圖片
              // }

              results.push({
                AIpercent: AIpercent,
                url: srcUrl,
                isAI: isAI,
                artificial: artificial,
                human: human,
                details: details,
              });

              alert("The " + type + " is " + message);
              console.log(srcUrl, type, AIpercent, isAI, message);

              // 在圖片上添加標籤
              // addLabelToImage(img, isAI);
              // updateFloatingButton(results);
            } else {
              console.error("Error from AI:", response.error);
            }
          } else {
            console.error("No response received from background script.");
          }
        }
      );
    };
  } catch (error) {
    console.error("Error converting image to Blob", error);
  }
}

// 監聽來自內容腳本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateYouTubeMenu") {
    updateYouTubeContextMenu(request.hasYouTubeVideos);
  }

  if (request.action === "sendImageToBackend") {
    const base64Image = request.base64Image;
    const fileName = request.fileName;

    // 將 Base64 圖片轉換為 Blob
    fetch(base64Image)
      .then((res) => res.blob())
      .then((blob) => {
        const formData = new FormData();
        const file = new File([blob], fileName, { type: blob.type });
        formData.append("image", file);

        return fetch("https://meichu-video.sausagee.party/analyze/image", {
          method: "POST",
          headers: {
            "X-API-KEY": "aWxvdmVzYXVzYWdl", // 將你的 API key 加入這裡
          },
          body: formData,
        });
      })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        sendResponse({ success: true, result: data });
      })
      .catch((error) => {
        console.error("Error uploading image to API:", error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // 保持消息通道開啟
  }
});

// 監聽右鍵選單點擊事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const dataTypeMap = {
    checkAIImage: "image",
    checkAIVideo: "video",
    checkAIAudio: "audio",
    checkAIYouTube: "video",
  };

  const dataType = dataTypeMap[info.menuItemId];

  if (dataType) {
    if (info.menuItemId === "checkAIYouTube") {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: getYouTubeVideoUrl,
      });
    } else {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: detectAIContent,
        args: [info.srcUrl, dataType],
      });
      console.log("Checking", dataType, "at", info.srcUrl);
    }
  }
});

// 更新右鍵選單
function updateContextMenus() {
  chrome.storage.sync.get(["autoCheck"], (result) => {
    const autoCheckValue = result.autoCheck;

    // 清除現有的右鍵選單
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: "checkAIVideo",
        title: "Check if video is AI generated",
        contexts: ["video"],
      });

      chrome.contextMenus.create({
        id: "checkAIAudio",
        title: "Check if audio is AI generated",
        contexts: ["audio"],
      });

      // 根據 autoCheckValue 決定是否創建檢查圖片的選項
      if (autoCheckValue === "no") {
        chrome.contextMenus.create({
          id: "checkAIImage",
          title: "Check if image is AI generated",
          contexts: ["image"],
        });
      }

      // YouTube 右鍵選單
      // chrome.contextMenus.create({
      //   id: "checkAIYouTube",
      //   title: "Check if YouTube video is AI generated",
      //   contexts: ["all"],
      // });
    });
  });
}

// 更新 YouTube 上下文菜單
function updateYouTubeContextMenu(hasYouTubeVideos) {
  if (hasYouTubeVideos) {
    chrome.contextMenus.create({
      id: "checkAIYouTube",
      title: "Check if YouTube video is AI generated",
      contexts: ["page", "frame"],
    });
  } else {
    chrome.contextMenus.remove("checkAIYouTube");
  }
}

// 獲取 YouTube 影片 URL
function getYouTubeVideoUrl() {
  const youtubeIframes = document.querySelectorAll(
    'iframe[src*="youtube.com"], iframe[src*="youtu.be"]'
  );
  if (youtubeIframes.length > 0) {
    const iframe = youtubeIframes[0];
    const src = iframe.src;
    const videoId = src.match(
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:embed\/|watch\?v=)?([^&]+)/i
    );
    if (videoId && videoId[1]) {
      const videoUrl = `https://www.youtube.com/watch?v=${videoId[1]}`;

      console.log("YouTube video URL:", videoUrl);
      detectAIContent(videoUrl, "video");
      analyzeVideo(videoUrl);
    } else {
      console.log("無法獲取 YouTube 影片 URL");
    }
  } else {
    console.log("此頁面上沒有找到嵌入的 YouTube 影片");
  }
}

// 分析 YouTube 影片
function analyzeVideo(videoUrl) {
  const apiEndpoint = "https://meichu-video.sausagee.party/analyze/video"; // 後端 API URL
  const headers = {
    "X-API-KEY": "aWxvdmVzYXVzYWdl", // 將你的 API key 加入這裡
  };

  fetch(apiEndpoint, {
    method: "POST",
    headers: headers,
    body: JSON.stringify({ videoUrl }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      if (data.success) {
        console.log("Analysis result:", data);
      } else {
        console.error("Analysis failed:", data.error);
      }
    })
    .catch((error) => {
      console.error("Error analyzing video:", error);
    });
}

/*
// 偵測 AI 內容
async function detectAIContent(srcUrl, type) {
  // 模擬結果
  const accuracy = Math.floor(Math.random() * 100); // 隨機生成準確度
  const isAI = accuracy < 50; // 隨機生成是否為 AI 生成，50% 機率
  const message = isAI ? "AI generated" : "not AI generated";
  console.log(srcUrl, type, accuracy, isAI, message);
  alert("The " + type + " is " + message);
}*/

// Model Box 函數 (有問題)
function showWarningModal(contentType, accuracy, message) {
  console.log("I am in showWarningModal", contentType, accuracy, message);

  // 簡單的參數檢查
  if (!contentType || accuracy == null || !message) {
    console.error("Invalid parameters:", { contentType, accuracy, message });
    return;
  }

  // 移除已存在的模態框
  const existingModal = document.querySelector(".warning-modal");
  if (existingModal) existingModal.remove();

  // 建立模態框的背景
  const modal = document.createElement("div");
  modal.className = "warning-modal"; // 加上 className 以便管理
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;

  // 建立模態框的內容容器
  const modalContent = document.createElement("div");
  modalContent.style.cssText = `
    background-color: white;
    padding: 30px;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    max-width: 500px;
    width: 90%;
    text-align: center;
    font-family: Arial, sans-serif;
  `;

  // 第一行：顯示準確度
  const line1 = document.createElement("p");
  line1.textContent = `此 ${contentType} 的真實性是 ${accuracy}%`;
  line1.style.cssText = `
    margin: 10px 0;
    font-size: 18px;
    font-weight: bold;
    color: #333;
  `;
  modalContent.appendChild(line1);

  // 第二行：顯示結果訊息
  const line2 = document.createElement("p");
  line2.textContent = message;
  line2.style.cssText = `
    margin: 10px 0;
    font-size: 16px;
    color: ${message === "AI generated" ? "#e53935" : "#4CAF50"};
  `;
  modalContent.appendChild(line2);

  // 第三行：顯示警示符號及按鈕
  const iconAndButtonContainer = document.createElement("div");
  iconAndButtonContainer.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 15px;
  `;

  const warningIcon = document.createElement("span");
  warningIcon.innerHTML = "&#9888;"; // 警告符號 (⚠)
  warningIcon.style.cssText = `
    font-size: 30px;
    color: #e53935;
  `;
  iconAndButtonContainer.appendChild(warningIcon);

  const detailsButton = document.createElement("button");
  detailsButton.textContent = "查看詳情";
  detailsButton.style.cssText = `
    padding: 10px 20px;
    background-color: #1976D2;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 16px;
  `;
  detailsButton.addEventListener("click", () => {
    alert("更多的偵測結果將在此顯示...");
  });
  iconAndButtonContainer.appendChild(detailsButton);

  modalContent.appendChild(iconAndButtonContainer);

  // 點擊背景關閉模態框
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.remove(); // 點擊背景時關閉模態框
    }
  });

  // 按下 ESC 鍵關閉模態框
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      modal.remove();
    }
  });

  modal.appendChild(modalContent);
  document.body.appendChild(modal);
}
