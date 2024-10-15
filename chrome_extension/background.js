// 這是一個背景腳本，用於創建右鍵選單和處理右鍵選單點擊事件
chrome.runtime.onInstalled.addListener(() => {
  updateContextMenus();
});

// 監聽右鍵選單點擊事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const dataTypeMap = {
    checkAIImage: "image",
    checkAIVideo: "video",
    checkAIAudio: "audio",
  };

  const dataType = dataTypeMap[info.menuItemId];

  if (dataType) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: detectAIContent,
      args: [info.srcUrl, dataType],
    });
    console.log("Checking", dataType, "at", info.srcUrl);
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
    });
  });
}


chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "sendImageToBackend") {
    let formData = new FormData();
    formData.append("img", request.imageFile);  // 接收前端的文件

    fetch("http://localhost:5000/api/ai-detection", {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "multipart/form-data"  // 必須使用form-data格式
      }
    })
    .then(response => response.json())
    .then(data => {
      sendResponse(data);  // 傳回AI模型的分析結果
    })
    .catch(error => {
      console.error('Error:', error);
      sendResponse({ success: false, error: "Failed to communicate with the backend" });
    });

    return true;  // 表示這是異步處理
  }
});

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

  // 模擬結果
  console.log(srcUrl, type);
  const isAI = Math.random() < 0.5; // 隨機生成是否為 AI 生成，50% 機率
  const message = isAI ? "AI generated" : "not AI generated";
  alert("The " + type + " is " + message);
}
