window.onload = function () {
  // Tab switching logic
  const navLinks = document.querySelectorAll(".tab-link");
  const sections = document.querySelectorAll("section");

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

  // Drag-and-drop upload logic
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

  // Save settings logic
  document.getElementById("saveBtn").addEventListener("click", () => {
    const autoCheckValue = document.getElementById("autoCheckSelect").value;
    chrome.storage.sync.set({ autoCheck: autoCheckValue }, () => {
      alert("設置保存成功！");
    });
  });

  // AI detection button logic
  document.getElementById("detectBtn").addEventListener("click", async () => {
    const file = fileInput.files[0];

    if (!file) {
      alert("Please select a file.");
      return;
    }

    console.log("Uploading file:", file);

    const isAI = Math.random() < 0.5; // 隨機生成是否為 AI 生成，50% 機率
    alert(isAI ? "AI Generated" : "Not AI");
  });
};

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
