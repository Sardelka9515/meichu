# 使用官方的 Python 基礎映像
FROM python:3.9-slim

# 設定工作目錄
WORKDIR /app

# 複製當前目錄的內容到工作目錄
COPY . /app

# 安裝 Python 依賴
RUN pip install --no-cache-dir -r requirements.txt

# 暴露應用程式運行的端口
EXPOSE 5005

# 設定環境變數
ENV FLASK_APP=server.py
ENV FLASK_RUN_HOST=0.0.0.0

# 啟動 Flask 應用程式
CMD ["flask", "run"]