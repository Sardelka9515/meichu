// 這是一個背景腳本，用於創建右鍵選單和處理右鍵選單點擊事件
chrome.runtime.onInstalled.addListener(() => {
  updateContextMenus();
});

// 監聽來自內容腳本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateYouTubeMenu") {
    updateYouTubeContextMenu(request.hasYouTubeVideos);
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

// 監聽 autoCheck 的變化，並更新右鍵選單
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.autoCheck) {
    updateContextMenus();
  }
});

// 更新右鍵選單
function updateContextMenus() {
  chrome.storage.sync.get(["autoCheck"], (result) => {
    const autoCheckValue = result.autoCheck;

    // 清除現有的右鍵選單
    chrome.contextMenus.removeAll(() => {
      // 創建新的右鍵選單項目
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
          contexts: ["image"], // 只對圖片有效
        });
      }

      // chrome.contextMenus.create({
      //   id: "checkAIYouTube",
      //   title: "Check if YouTube video is AI generated",
      //   contexts: ["all"],
      // });
    });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "sendImageToBackend") {
    const base64Image = message.base64Image;
    const fileName = message.fileName;

    // 將 Base64 圖片轉換為 Blob
    fetch(base64Image)
      .then((res) => res.blob())
      .then((blob) => {
        const formData = new FormData();
        const file = new File([blob], fileName, { type: blob.type });

        // 在 FormData 中附加圖片文件
        formData.append("img", file);
        return fetch("http://localhost:5000/api/ai-detection", {
          method: "POST",
          body: formData,
        });
      })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json(); // 假設伺服器回應 JSON 格式
      })
      .then((data) => {
        if (data.success) {
          sendResponse({ success: true, result: data });
        } else {
          sendResponse({ success: false, error: data.error });
        }
      })
      .catch((error) => {
        console.error("Error uploading image to API:", error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // 保持 message channel 開啟，等待非同步處理完成
  }
});


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

// API 檢測邏輯
async function detectAIContent(srcUrl, type) {
  /*
  const apiEndpoint = "https://example.com/api/ai-detection";

  try {
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: srcUrl, type }),
    });

    const result = await response.json();

    if (result.success) {
      const message = result.isAI
        ? `AI generated (${result.accuracy}% accurate)`
        : "Not AI generated";
      alert(message); // 簡單彈出結果
    } else {
      alert("Failed to detect.");
    }
  } catch (error) {
    alert("Error detecting AI content.");
  }
  */

  console.log("I am in detectAIContent");
  // 模擬結果
  const accuracy = Math.floor(Math.random() * 100); // 隨機生成準確度
  const isAI = accuracy < 50; // 隨機生成是否為 AI 生成，50% 機率
  const message = isAI ? "AI generated" : "not AI generated";
  console.log(srcUrl, type, accuracy, isAI, message);
  alert("The " + type + " is " + message);
  // console.log(accuracy, isAI, message);
  // showWarningModal(type, accuracy, message);
  // console.log("2");
  // showWarningModal(type, accuracy, message);
}

// 獲取 YouTube 影片 URL (進不去 detectAIContent())
function getYouTubeVideoUrl() {
  const youtubeIframes = document.querySelectorAll(
    'iframe[src*="youtube.com"], iframe[src*="youtu.be"]'
  );
  if (youtubeIframes.length > 0) {
    const iframe = youtubeIframes[0];
    const src = iframe.src;
    const videoId = src.match(
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:embed\/|watch\?v=)?([^&]+)/
    );
    if (videoId && videoId[1]) {
      const videoUrl = `https://www.youtube.com/watch?v=${videoId[1]}`;

      console.log("YouTube video URL:", videoUrl);
      detectAIContent(videoUrl, "video");

      // 有問題有問題有問題有問題 你媽死了
      console.log("I am here");
    } else {
      console.log("無法獲取 YouTube 影片 URL");
    }
  } else {
    console.log("此頁面上沒有找到嵌入的 YouTube 影片");
  }
}

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
