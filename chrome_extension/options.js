document.getElementById("uploadBtn").addEventListener("click", async () => {
  const fileInput = document.getElementById("upload");
  const file = fileInput.files[0];

  if (!file) {
    alert("Please select a file.");
    return;
  }

  console.log("Uploading file:", file);

  if (file) {
    const formData = new FormData();
    formData.append("file", file);

    /*
    const response = await fetch(
      "https://example.com/api/ai-detection/upload",
      {
        method: "POST",
        body: formData,
      }
    );

    const result = await response.json();
    */

    const isAI = Math.random() < 0.5; // 隨機生成是否為 AI 生成，50% 機率
    alert(isAI ? "AI Generated" : "Not AI");
  }
});

// document.getElementById("autoCheck").addEventListener("change", (event) => {
//   chrome.storage.sync.set({ autoCheck: event.target.checked });
// });

// // 初始化選項狀態
// chrome.storage.sync.get(["autoCheck"], (result) => {
//   document.getElementById("autoCheck").checked = result.autoCheck || false;
// });

// 監聽「儲存」按鈕的點擊事件
document.getElementById("saveBtn").addEventListener("click", () => {
  const autoCheckValue = document.getElementById("autoCheckSelect").value;
  console.log("autoCheckValue: ", autoCheckValue);

  // 將設定儲存到 Chrome 的同步存儲
  chrome.storage.sync.set({ autoCheck: autoCheckValue }, () => {
    alert("Settings saved successfully!");
  });
});

// 在頁面加載時，設置預設選項
window.onload = function () {
  // 從 chrome.storage.sync 獲取設定
  chrome.storage.sync.get(["autoCheck"], (result) => {
    const autoCheckValue = result.autoCheck || "yes"; // 如果沒有值，預設為 "yes"
    console.log("Loaded autoCheckValue: ", autoCheckValue);

    // 設置選擇的值
    document.getElementById("autoCheckSelect").value = autoCheckValue; // 將下拉框設為相應的值
  });
};
