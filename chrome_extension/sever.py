import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image, UnidentifiedImageError
import io

app = Flask(__name__)
CORS(app)

# 設定模型 API URL
MODEL_API_URL = "http://localhost:3000/inference"

# 設定 API key（直接硬編碼）
API_KEY = "aWxvdmVzYXVzYWdl"

# 驗證 API key 的裝飾器
def require_api_key(func):
    def wrapper(*args, **kwargs):
        api_key = request.headers.get('X-API-KEY')
        if api_key != API_KEY:
            return jsonify({"error": "Unauthorized: API key is missing or incorrect", "success": False}), 403
        return func(*args, **kwargs)
    return wrapper

@app.route('/api/ai-detection', methods=['POST'])
@require_api_key  # 加入 API key 驗證
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

    # 嘗試將圖像加載到 PIL 中並進行預處理
    try:
        img = Image.open(image.stream)
        img = preprocess(img)  # 調用預處理函數
    except UnidentifiedImageError:
        print("Cannot identify image file")  # Debug 輸出
        return jsonify({"error": "Invalid image format or corrupt file", "success": False}), 400
    except Exception as e:
        print(f"Unexpected error while opening image: {e}")
        return jsonify({"error": "Error processing image", "success": False}), 500

    # 如果有文件，則發送至模型 API
    # 將圖像保存到內存中的二進制流
    img_byte_array = io.BytesIO()
    img.save(img_byte_array, format='JPEG')  # 根據需要選擇合適的格式
    img_byte_array.seek(0)  # 重置流的位置

    files = {'img': (image.filename, img_byte_array, 'image/jpeg')}  # 使用 file object 發送

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

def preprocess(img):
    if img.mode == 'RGBA':  # 如果圖片是 RGBA 格式
        img = img.convert('RGB')  # 將圖片轉換為 RGB
    # 在這裡繼續進行其他預處理步驟
    return img

if __name__ == '__main__':
    app.run(port=5000, debug=True)
