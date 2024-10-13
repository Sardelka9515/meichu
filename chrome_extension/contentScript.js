window.onload = async function () {
  // 從 Chrome 的同步存儲中取得 autoCheck 設定
  chrome.storage.sync.get(["autoCheck"], (result) => {
    const autoCheckValue = result.autoCheck || "yes"; // 預設為 "yes" 如果尚未儲存過選項
    console.log("autoCheckValue: ", autoCheckValue);

    // 檢查 autoCheck 設定是否為 "yes"
    if (autoCheckValue == "yes") {
      // 如果設定為 "yes"，執行圖片檢測邏輯
      runAutoImageDetection();
    } else {
      console.log("Auto check is disabled. Image detection will not run.");
    }
  });
};

// 自動檢測圖片
async function runAutoImageDetection() {
  const images = document.querySelectorAll("img");

  for (const img of images) {
    if (filteredImages(img)) {
      const srcUrl = img.src;

      // 印出來讓我看看
      console.log("Checking image:", srcUrl);

      // 發送圖片到 API 進行檢測

      /*
      try {
        const response = await fetch("https://example.com/api/ai-detection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: srcUrl, type: "image" }),
        });
  
        const result = await response.json();
  
        // 根據結果加邊框
        if (result.isAI) {
          img.style.border = "4px solid red"; // AI 生成圖片
        } else {
          img.style.border = "4px solid green"; // 非 AI 生成圖片
        }
      } catch (error) {
        console.error("Error detecting image:", error);
      }
        */

      // 模擬結果
      const isAI = Math.random() < 0.5; // 隨機生成是否為 AI 生成，50% 機率
      // img.style.margin = "10px";
      if (isAI) {
        img.style.border = "4px solid red"; // AI 生成圖片
      } else {
        img.style.border = "4px solid green"; // 非 AI 生成圖片
      }

      // 如果圖片尺寸足夠大，則在右上角添加標籤 (因為如果圖片太小的話，標籤會過於擁擠)
      const PRINT_OUT_MIN_WIDTH = 200;
      const PRINT_OUT_MIN_HEIGHT = 200;

      if (
        img.naturalWidth > PRINT_OUT_MIN_WIDTH &&
        img.naturalHeight > PRINT_OUT_MIN_HEIGHT
      ) {
        // 在圖片的右上角添加標籤
        const resultText = document.createElement("div");
        resultText.textContent = isAI ? "AI Generated" : "Not AI Generated";
        resultText.style.position = "absolute"; // 絕對定位
        resultText.style.top = "0"; // 靠近頂部
        resultText.style.right = "0"; // 靠近右邊
        resultText.style.backgroundColor = "rgba(255, 255, 255, 0.7)"; // 背景顏色
        resultText.style.color = "black"; // 文字顏色
        resultText.style.padding = "5px"; // 內邊距
        resultText.style.borderRadius = "5px"; // 邊框圓角
        resultText.style.zIndex = "100"; // 確保在最上層

        // 設置圖片的樣式
        img.style.position = "relative"; // 為了使結果文字絕對定位相對於圖片

        // 將文字元素添加到圖片上
        img.parentNode.style.position = "relative"; // 父元素需要相對定位
        img.parentNode.appendChild(resultText); // 將文字元素添加到父元素中
      }
    }
  }

  // 模擬結果
  const mockResults = generateMockResults(100);
  addFloatingButton(mockResults);
}

// 過濾圖片的函數
function filteredImages(img) {
  const MIN_WIDTH = 50;
  const MIN_HEIGHT = 50;

  const imgSrc = img.src.toLowerCase();
  const altText = img.alt ? img.alt.toLowerCase() : "";
  const className = img.className ? img.className.toLowerCase() : "";

  // 過濾掉小尺寸的圖片
  if (img.naturalWidth < MIN_WIDTH || img.naturalHeight < MIN_HEIGHT) {
    console.log("Skipping small image:", imgSrc);
    return false;
  }

  // 過濾掉包含特定關鍵詞（icon, logo, arrow 等）的圖片
  if (
    imgSrc.includes("icon") ||
    imgSrc.includes("logo") ||
    imgSrc.includes("arrow") ||
    imgSrc.includes("svg") ||
    altText.includes("arrow") ||
    className.includes("icon")
  ) {
    console.log("Skipping icon/logo/arrow image:", imgSrc);
    return false;
  }

  return true;
}

// 在頁面插入浮動按鈕和檢測結果
function addFloatingButton(results) {
  const button = document.createElement("button");
  button.textContent = "View AI Detection Results";
  button.style.position = "fixed";
  button.style.top = "10px";
  button.style.left = "10px";
  button.style.zIndex = "10000";
  button.style.padding = "10px";
  button.style.backgroundColor = "#007bff";
  button.style.color = "#fff";
  button.style.border = "none";
  button.style.cursor = "pointer";

  button.addEventListener("click", () => {
    showResultsModal(results);
  });

  document.body.appendChild(button);
}

function showResultsModal(results) {
  const modal = document.createElement("div");
  modal.style.position = "fixed";
  modal.style.top = "50%";
  modal.style.left = "50%";
  modal.style.transform = "translate(-50%, -50%)";
  modal.style.backgroundColor = "#fff";
  modal.style.padding = "20px";
  modal.style.zIndex = "10001";
  modal.style.borderRadius = "8px";
  modal.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
  modal.style.maxHeight = "400px";
  modal.style.overflowY = "scroll";

  results.forEach((result, index) => {
    const item = document.createElement("div");
    item.textContent = `Image ${index + 1}: ${
      result.isAI ? "AI Generated" : "Not AI"
    } (${result.accuracy}% accuracy)`;
    modal.appendChild(item);
  });

  const closeButton = document.createElement("button");
  closeButton.textContent = "Close";
  closeButton.style.marginTop = "10px";
  closeButton.addEventListener("click", () => {
    modal.remove();
  });

  modal.appendChild(closeButton);
  document.body.appendChild(modal);
}

// 模擬結果生成函數
function generateMockResults(numImages) {
  const results = [];

  for (let i = 0; i < numImages; i++) {
    const isAI = Math.random() < 0.5; // 隨機生成是否為 AI 生成，50% 機率
    const accuracy = Math.floor(Math.random() * 100) + 1; // 隨機生成 1% 到 100% 的準確度
    results.push({
      isAI: isAI,
      accuracy: accuracy,
      imageUrl: `https://example.com/image${i + 1}.jpg`, // 模擬圖片 URL
    });
  }

  return results;
}
