window.onload = async function () {
  // 從 Chrome 的同步存儲中取得 autoCheck 設定
  chrome.storage.sync.get(["autoCheck"], (result) => {
    const autoCheckValue = result.autoCheck || "yes"; // 預設為 "yes" 如果尚未儲存過選項
    console.log("autoCheckValue in contentScript: ", autoCheckValue);

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
  const results = [];
  let effectImageCount = 0;

  // 在頁面上添加浮動按鈕
  addFloatingButton(results);

  for (const img of images) {
    if (filteredImages(img)) {
      const srcUrl = img.src;
      effectImageCount++;

      // 印出來讓我看看
      console.log("Checking image:", srcUrl);

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
                  const artificial = Math.round(
                    response.result.results[0].output_sausagee * 100
                  );
                  console.log("artificial: ", artificial);
                  const human = 100 - artificial;
                  const isAI = artificial > human;
                  const AIpercent = Math.round(
                    (artificial * 100) / (human + artificial)
                  );
                  const aiOrNot = isAI ? "AI 生成的" : "不是 AI 生成的";
                  // const details =
                  //   human + "% human <br> " + artificial + "% artificial";
                  const output_lgrad = Math.round(
                    response.result.results[0].output_lgrad * 100
                  );

                  const output_univfd = Math.round(
                    response.result.results[0].output_univfd * 100
                  );

                  const artificial_avg = Math.round(
                    response.result.results[0].ai_probability * 100
                  );

                  // const details =
                  //   artificial +
                  //   "% output_sausagee <br>" +
                  //   output_lgrad +
                  //   "% lgrad <br>" +
                  //   output_univfd +
                  //   "% univfd";

                  const details =
                    "我們的香腸模型預測這張圖片是 " +
                    aiOrNot +
                    "(AI 機率: " +
                    artificial +
                    "%)" +
                    "<br><br>" +
                    "其他模型給予的判斷：" +
                    "<br>" +
                    "Lgrad 模型：" +
                    output_lgrad +
                    "%" +
                    "<br>" +
                    "Univfd 模型：" +
                    output_univfd +
                    "%" +
                    "<br>" +
                    "三個模型平均機率：" +
                    artificial_avg +
                    "%";

                  if (isAI) {
                    img.style.border = "4px solid red"; // AI 生成圖片
                  } else {
                    img.style.border = "4px solid green"; // 非 AI 生成圖片
                  }

                  results.push({
                    AIpercent: AIpercent,
                    url: srcUrl,
                    isAI: isAI,
                    artificial: artificial,
                    aiOrNot: aiOrNot,
                    human: human,
                    details: details,
                    artificial_avg: artificial_avg,
                    output_lgrad: output_lgrad,
                    output_univfd: output_univfd,
                  });

                  console.log("results: ", results);

                  // 在圖片上添加標籤
                  addLabelToImage(img, isAI);
                  updateFloatingButton(results);
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
  }
  if (effectImageCount) {
    // Add a badge to show the number of results
    const badge = document.createElement("span");
    badge.id = "ai-detection-result-badge";
    badge.style.cssText = `
        position: absolute;
        top: -8px;
        right: -8px;
        background-color: #ff4081;
        color: white;
        border-radius: 50%;
        padding: 4px 8px;
        font-size: 12px;
        font-weight: bold;
      `;
    const greenButton = document.getElementById("ai-detection-result-button");
    greenButton.appendChild(badge);
  }
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

// 在圖片上添加標籤
function addLabelToImage(img, isAI) {
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

function updateFloatingButton(results) {
  badge = document.getElementById("ai-detection-result-badge");
  badge.textContent = results.length;
}

// 在頁面插入浮動按鈕和檢測結果 (old)
// function addFloatingButton(results) {
//   const button = document.createElement("button");
//   button.id = "ai-detection-result-button";

//   button.innerHTML = `
//     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
//       <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
//       <circle cx="12" cy="12" r="3"></circle>
//     </svg>
//     <span>AI Detection Results</span>
//   `;

//   button.style.cssText = `
//     position: fixed;
//     bottom: 20px;
//     right: 20px;
//     z-index: 10000;
//     padding: 12px 20px;
//     background-color: #4CAF50;
//     color: #fff;
//     border: none;
//     border-radius: 30px;
//     cursor: pointer;
//     font-family: Arial, sans-serif;
//     font-size: 14px;
//     font-weight: bold;
//     display: flex;
//     align-items: center;
//     gap: 8px;
//     box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
//     transition: all 0.3s ease;
//   `;

//   // Hover effect
//   button.addEventListener("mouseover", () => {
//     button.style.backgroundColor = "#45a049";
//     button.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.3)";
//   });

//   button.addEventListener("mouseout", () => {
//     button.style.backgroundColor = "#4CAF50";
//     button.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.2)";
//   });

//   // Click effect
//   button.addEventListener("mousedown", () => {
//     button.style.transform = "scale(0.95)";
//   });

//   button.addEventListener("mouseup", () => {
//     button.style.transform = "scale(1)";
//   });

//   // Show results modal on click
//   button.addEventListener("click", () => {
//     showResultsModal(results);
//   });

//   document.body.appendChild(button);

//   // Optional: Add animation to draw attention
//   setTimeout(() => {
//     button.style.animation = "pulse 2s infinite";
//   }, 1000);

//   // Add the keyframes for the pulse animation
//   const style = document.createElement("style");
//   style.textContent = `
//     @keyframes pulse {
//       0% {
//         box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
//       }
//       70% {
//         box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
//       }
//       100% {
//         box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
//       }
//     }
//   `;
//   document.head.appendChild(style);
// }

// 在頁面插入浮動按鈕和檢測結果 (可以拖曳移動按鈕)
function addFloatingButton(results) {
  const button = document.createElement("button");
  button.id = "ai-detection-result-button";

  button.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
    <span>AI Detection Results</span>
  `;

  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 10000;
    padding: 12px 20px;
    background-color: #4CAF50;
    color: #fff;
    border: none;
    border-radius: 30px;
    cursor: move;
    font-family: Arial, sans-serif;
    font-size: 14px;
    font-weight: bold;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    transition: all 0.3s ease;
    user-select: none;
  `;

  // Hover effect
  button.addEventListener("mouseover", () => {
    button.style.backgroundColor = "#45a049";
    button.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.3)";
  });

  button.addEventListener("mouseout", () => {
    button.style.backgroundColor = "#4CAF50";
    button.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.2)";
  });

  // Dragging functionality
  let isDragging = false;
  let startX, startY, startLeft, startTop;

  button.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = button.offsetLeft;
    startTop = button.offsetTop;
    button.style.cursor = "grabbing";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    button.style.left = `${startLeft + deltaX}px`;
    button.style.top = `${startTop + deltaY}px`;
    button.style.right = "auto";
    button.style.bottom = "auto";
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
    button.style.cursor = "move";
  });

  // Show results modal on click
  button.addEventListener("click", (e) => {
    if (!isDragging) {
      showResultsModal(results);
    }
  });

  document.body.appendChild(button);

  // Optional: Add animation to draw attention
  setTimeout(() => {
    button.style.animation = "pulse 2s infinite";
  }, 1000);

  // Add the keyframes for the pulse animation
  const style = document.createElement("style");
  style.textContent = `
    @keyframes pulse {
      0% {
        box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
      }
      70% {
        box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
      }
    }
  `;
  document.head.appendChild(style);
}

// 顯示檢測結果的模態對話框 (old)
// function showResultsModal(results) {
//   // Create modal container
//   const modal = document.createElement("div");
//   modal.style.cssText = `
//     position: fixed;
//     top: 0;
//     left: 0;
//     width: 100%;
//     height: 100%;
//     background-color: rgba(0, 0, 0, 0.5);
//     display: flex;
//     justify-content: center;
//     align-items: center;
//     z-index: 10000;
//   `;

//   // 點擊背景區域時關閉模態框
//   modal.addEventListener("click", () => {
//     modal.remove();
//   });

//   // Create modal content
//   const modalContent = document.createElement("div");
//   modalContent.style.cssText = `
//     background-color: #fff;
//     padding: 30px;
//     border-radius: 10px;
//     box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
//     max-width: 600px;
//     width: 90%;
//     max-height: 80vh;
//     overflow-y: auto;
//   `;

//   // 防止點擊內容時冒泡到背景，避免關閉模態框
//   modalContent.addEventListener("click", (event) => {
//     event.stopPropagation();
//   });

//   // Add title
//   const title = document.createElement("h2");
//   title.textContent = "Detection Results";
//   title.style.cssText = `
//     margin-top: 0;
//     margin-bottom: 20px;
//     color: #333;
//     font-family: Arial, sans-serif;
//   `;
//   modalContent.appendChild(title);

//   // Add results
//   results.forEach((result, index) => {
//     const item = document.createElement("div");
//     item.style.cssText = `
//       margin-bottom: 15px;
//       padding: 10px;
//       background-color: ${result.isAI ? "#ffebee" : "#e8f5e9"};
//       border-radius: 5px;
//       font-family: Arial, sans-serif;
//     `;

//     const itemHeader = document.createElement("div");
//     itemHeader.style.cssText = `
//       display: flex;
//       justify-content: space-between;
//       align-items: center;
//     `;

//     const resultText = document.createElement("div");
//     resultText.innerHTML = `
//       <strong>Image ${index + 1}:</strong>
//       <span>${result.isAI ? "AI Generated" : "Not AI"}</span>
//       <span style="color: #666;">(The rate of AI generated: ${
//         result.AIpercent
//       }%)</span>
//     `;

//     const expandButton = document.createElement("button");
//     expandButton.innerHTML = "&#9660;"; // Down arrow character
//     expandButton.style.cssText = `
//       background: none;
//       border: none;
//       font-size: 20px;
//       cursor: pointer;
//       color: #333;
//       transition: transform 0.3s;
//     `;

//     itemHeader.appendChild(resultText);
//     itemHeader.appendChild(expandButton);
//     item.appendChild(itemHeader);

//     const detailsContainer = document.createElement("div");
//     detailsContainer.style.cssText = `
//       margin-top: 10px;
//       display: none;
//     `;

//     // Add image thumbnail
//     const thumbnail = document.createElement("img");
//     thumbnail.src = result.url;
//     thumbnail.alt = "Image thumbnail";
//     thumbnail.style.cssText = `
//       max-width: 100%;
//       height: auto;
//       border-radius: 5px;
//       margin-bottom: 10px;
//     `;
//     detailsContainer.appendChild(thumbnail);

//     // Add detection details
//     const details = document.createElement("p");
//     details.innerHTML = result.details;
//     detailsContainer.appendChild(details);

//     item.appendChild(detailsContainer);

//     expandButton.addEventListener("click", () => {
//       if (detailsContainer.style.display === "none") {
//         detailsContainer.style.display = "block";
//         expandButton.style.transform = "rotate(180deg)";
//       } else {
//         detailsContainer.style.display = "none";
//         expandButton.style.transform = "rotate(0deg)";
//       }
//     });

//     modalContent.appendChild(item);
//   });

//   // Add close button
//   const closeButton = document.createElement("button");
//   closeButton.textContent = "Close";
//   closeButton.style.cssText = `
//     display: block;
//     margin: 20px auto 0;
//     padding: 10px 20px;
//     background-color: #4CAF50;
//     color: white;
//     border: none;
//     border-radius: 5px;
//     cursor: pointer;
//     font-size: 16px;
//     transition: background-color 0.3s;
//   `;
//   closeButton.addEventListener("mouseover", () => {
//     closeButton.style.backgroundColor = "#45a049";
//   });
//   closeButton.addEventListener("mouseout", () => {
//     closeButton.style.backgroundColor = "#4CAF50";
//   });
//   closeButton.addEventListener("click", () => {
//     modal.remove();
//   });
//   modalContent.appendChild(closeButton);

//   modal.appendChild(modalContent);
//   document.body.appendChild(modal);
// }

// 顯示檢測結果的模態對話框(多了bar 但數字想改)
function showResultsModal(results) {
  // Create modal container
  const modal = document.createElement("div");
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

  // 點擊背景區域時關閉模態框
  modal.addEventListener("click", () => {
    modal.remove();
  });

  // Create modal content
  const modalContent = document.createElement("div");
  modalContent.style.cssText = `
    background-color: #fff;
    padding: 30px;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  `;

  // 防止點擊內容時冒泡到背景，避免關閉模態框
  modalContent.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  // Add title
  const title = document.createElement("h2");
  title.textContent = "Detection Results";
  title.style.cssText = `
    margin-top: 0;
    margin-bottom: 20px;
    color: #333;
    font-family: Arial, sans-serif;
  `;
  modalContent.appendChild(title);

  // Add results
  results.forEach((result, index) => {
    const item = document.createElement("div");
    item.style.cssText = `
      margin-bottom: 15px;
      padding: 10px;
      background-color: ${result.isAI ? "#ffebee" : "#e8f5e9"};
      border-radius: 5px;
      font-family: Arial, sans-serif;
    `;

    const itemHeader = document.createElement("div");
    itemHeader.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    const resultText = document.createElement("div");
    resultText.innerHTML = `
      <strong>Image ${index + 1}:</strong> 
      <span>${result.isAI ? "AI Generated" : "Not AI Detection"}</span>
    `;
    resultText.style.cssText = `
      color: ${result.isAI ? "#f44336" : "#4caf50"};
    `;

    const expandButton = document.createElement("button");
    expandButton.innerHTML = "&#9660;"; // Down arrow character
    expandButton.style.cssText = `
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #333;
      transition: transform 0.3s;
    `;

    itemHeader.appendChild(resultText);
    itemHeader.appendChild(expandButton);
    item.appendChild(itemHeader);

    const detailsContainer = document.createElement("div");
    detailsContainer.style.cssText = `
      margin-top: 10px;
      display: none;
    `;

    // Add image thumbnail
    const thumbnail = document.createElement("img");
    thumbnail.src = result.url;
    thumbnail.alt = "Image thumbnail";
    thumbnail.style.cssText = `
      max-width: 100%;
      height: auto;
      border-radius: 5px;
      margin-bottom: 10px;
    `;
    detailsContainer.appendChild(thumbnail);

    // Add progress bar
    const progressBar = document.createElement("div");
    progressBar.style.cssText = `
      width: 100%;
      height: 20px;
      background-color: #e0e0e0;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 10px;
    `;

    const aiProgress = document.createElement("div");
    aiProgress.style.cssText = `
      width: ${result.AIpercent}%;
      height: 100%;
      background-color: #ff4081;
      float: left;
    `;
    progressBar.appendChild(aiProgress);

    const humanProgress = document.createElement("div");
    humanProgress.style.cssText = `
      width: ${100 - result.AIpercent}%;
      height: 100%;
      background-color: #4caf50;
      float: left;
    `;
    progressBar.appendChild(humanProgress);

    detailsContainer.appendChild(progressBar);

    // Add legend
    const legend = document.createElement("div");
    legend.style.cssText = `
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 14px;
    `;

    const aiLegend = document.createElement("span");
    aiLegend.innerHTML = `<span style="color: #ff4081;">&#9632;</span> AI: ${result.AIpercent}%`;
    aiLegend.style.cssText = `
      color: #f44336;
    `;
    legend.appendChild(aiLegend);

    const humanLegend = document.createElement("span");
    humanLegend.innerHTML = `<span style="color: #4caf50;">&#9632;</span> Human: ${
      100 - result.AIpercent
    }%`;
    humanLegend.style.cssText = `
      color: #4caf50;
    `;
    legend.appendChild(humanLegend);

    detailsContainer.appendChild(legend);

    // Add detection details
    const details = document.createElement("p");
    details.innerHTML = result.details;
    details.style.cssText = `
      font-size: 14px;
      color: #000000;
    `;
    detailsContainer.appendChild(details);

    item.appendChild(detailsContainer);

    expandButton.addEventListener("click", () => {
      if (detailsContainer.style.display === "none") {
        detailsContainer.style.display = "block";
        expandButton.style.transform = "rotate(180deg)";
      } else {
        detailsContainer.style.display = "none";
        expandButton.style.transform = "rotate(0deg)";
      }
    });

    modalContent.appendChild(item);
  });

  // Add close button
  const closeButton = document.createElement("button");
  closeButton.textContent = "Close";
  closeButton.style.cssText = `
    display: block;
    margin: 20px auto 0;
    padding: 10px 20px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 16px;
    transition: background-color 0.3s;
  `;
  closeButton.addEventListener("mouseover", () => {
    closeButton.style.backgroundColor = "#45a049";
  });
  closeButton.addEventListener("mouseout", () => {
    closeButton.style.backgroundColor = "#4CAF50";
  });
  closeButton.addEventListener("click", () => {
    modal.remove();
  });
  modalContent.appendChild(closeButton);

  modal.appendChild(modalContent);
  document.body.appendChild(modal);
}

function checkForYouTubeVideos() {
  const youtubeIframes = document.querySelectorAll(
    'iframe[src*="youtube.com"], iframe[src*="youtu.be"]'
  );
  const hasYouTubeVideos = youtubeIframes.length > 0;

  chrome.runtime.sendMessage({
    action: "updateYouTubeMenu",
    hasYouTubeVideos: hasYouTubeVideos,
  });
}

// 初始檢查
checkForYouTubeVideos();

// 監聽 DOM 變化
const observer = new MutationObserver(checkForYouTubeVideos);
observer.observe(document.body, { childList: true, subtree: true });
