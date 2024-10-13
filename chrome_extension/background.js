chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(["autoCheck"], (result) => {
    const autoCheckValue = result.autoCheck;

    console.log("1");

    chrome.contextMenus.create({
      id: "checkAIVideo",
      title: "Check if video is AI generated",
      contexts: ["video", "page"],
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
      alert("I am here");
    }
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  //   if (
  //     info.menuItemId === "checkAIVideo" ||
  //     info.menuItemId === "checkAIAudio"
  //   ) {
  //     const dataType = info.menuItemId === "checkAIVideo" ? "video" : "audio";

  //     chrome.scripting.executeScript({
  //       target: { tabId: tab.id },
  //       func: detectAIContent,
  //       args: [info.srcUrl, dataType],
  //     });
  //   }

  console.log("2");

  // 檢查圖片的情況
  if (info.menuItemId === "checkAIImage") {
    const srcUrl = info.srcUrl; // 圖片的 URL
    const dataType = "image"; // 資料類型

    console.log("3");

    // 只有當 autoCheckValue 為 "no" 時才能執行
    if (autoCheckValue === "no") {
      console.log("4");
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: detectAIContent,
        args: [srcUrl, dataType],
      });
    } else {
      console.log("5");
      alert("Auto check is enabled. You cannot manually check images.");
    }
  } else if (
    info.menuItemId === "checkAIVideo" ||
    info.menuItemId === "checkAIAudio"
  ) {
    const dataType = info.menuItemId === "checkAIVideo" ? "video" : "audio";

    console.log("6");
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: detectAIContent,
      args: [info.srcUrl, dataType],
    });
  }
});

// API 檢測邏輯
async function detectAIContent(srcUrl, type) {
  console.log("7");
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
  const isAI = Math.random() < 0.5; // 隨機生成是否為 AI 生成，50% 機率
  const message = isAI ? "AI generated" : "Not AI generated";
  alert(message);

  console.log("8");
}
