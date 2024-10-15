import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# 設定模型 API URL
MODEL_API_URL = "http://localhost:3000/inference"

@app.route('/api/ai-detection', methods=['POST'])
def ai_detection():
    # 確認接收的請求中是否有 "img" 文件
    if 'img' not in request.files:
        print("No 'img' key in request.files")  # Debug 輸出
        return jsonify({"error": "No image part", "success": False}), 400

    image = request.files['img']

    # 檢查是否有選擇文件
    if image.filename == '':
        print("No file selected")  # Debug 輸出
        return jsonify({"error": "No selected file", "success": False}), 400

    # 如果有文件，則發送至模型 API
    files = {'img': (image.filename, image.stream, image.mimetype)}  # 使用 file object 發送

    try:
        # 發送請求至模型 API
        response = requests.post(MODEL_API_URL, files=files)
        response.raise_for_status()  # 檢查 HTTP 請求是否成功
        result = response.json()     # 獲取模型 API 返回的結果
    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {http_err}")
        return jsonify({"error": "Model API error", "success": False}), 500
    except Exception as err:
        print(f"Other error occurred: {err}")
        return jsonify({"error": "Unexpected error", "success": False}), 500

    return jsonify(result)

if __name__ == '__main__':
    app.run(port=5000, debug=True)
