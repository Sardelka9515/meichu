# DetectX 瀏覽器插件 -- 生成式 AI 檢測工具

## 關於這個專案

進入擴充功能打開開發者模式，導入 chrome_extension 資料夾

伺服器於 backend 資料夾，使用方式於資料夾中的 README.md

video 的 模型 api 在 video_detect, 實作上我們將其 image 部署在遠端虛擬機上

audio 的 模型 api 在 voice_api，實作上 docker compose Backend 的時候會順便建立

image 的 模型我們共使用三個

1. LGrad 模型 (直接使用中華電信工作坊提供之模型)
2. UnivFD 模型 (直接使用中華電信工作坊提供之模型)
3. Organika/sdxl-detector (參考自https://huggingface.co/Organika/sdxl-detector)

實作上，我們將這三個都部署在遠端使用

你可以找到 LGrad 模型與 UnivFD 模型於中華電信工作坊提供的連結

## 特色功能

1. 主動掃描網頁並過濾網頁上的圖片並提供視覺化結果呈現
   - 使用者可決定是否要開啟此功能
   - UI 簡單明瞭，使用者可自行設定布局
   - 對於經檢測的圖片，會明顯的標示在網頁上
2. 對於有影片的網頁，可以指定時間片段，AI 模型解析後會呈現視覺化的結果
   - 在 Youtube 上，於影片視窗有客製化按鈕，使用者按下後輸入時間，AI 模型就可以快速檢測
   - 在其他網頁上，使用者可以打開瀏覽器的視窗，點擊手動分析，一樣會一鍵帶到分析介面

## 其他功能

1. 主動上傳媒體檔案，AI 模型會分析並回傳結果
2. 在沒有開啟自動模式的情況下，使用者可以對媒體點擊右鍵，交由 AI 分析
