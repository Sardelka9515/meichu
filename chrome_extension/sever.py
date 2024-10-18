import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image, UnidentifiedImageError
import io
import functools

app = Flask(__name__)
CORS(app)

# 設定模型 API URL
MODEL_API_URL = "http://localhost:3000/inference"
VIDEO_API_URL = "https://meichu-video.sausagee.party"

# 設定 API key（直接硬編碼）
API_KEY = "aWxvdmVzYXVzYWdl"

# 驗證 API key 的裝飾器
def require_api_key(func):
    @functools.wraps(func)  # 保留原始函數的元數據
    def api_key_check(*args, **kwargs):
        api_key = request.headers.get('X-API-KEY')
        if api_key != API_KEY:
            return jsonify({"error": "Unauthorized: API key is missing or incorrect", "success": False}), 403
        return func(*args, **kwargs)
    return api_key_check

@app.route('/api/analyze/image', methods=['POST'])
@require_api_key
def ai_detection():
    if 'img' not in request.files:
        print("No 'img' key in request.files")  # Debug 輸出
        return jsonify({"error": "No image part", "success": False}), 400

    image = request.files['img']
    if image.filename == '':
        print("No file selected")  # Debug 輸出
        return jsonify({"error": "No selected file", "success": False}), 400

    try:
        img = Image.open(image.stream)
        img = preprocess(img)  # 調用預處理函數
    except UnidentifiedImageError:
        print("Cannot identify image file")  # Debug 輸出
        return jsonify({"error": "Invalid image format or corrupt file", "success": False}), 400
    except Exception as e:
        print(f"Unexpected error while opening image: {e}")
        return jsonify({"error": "Error processing image", "success": False}), 500

    img_byte_array = io.BytesIO()
    img.save(img_byte_array, format='JPEG')  # 根據需要選擇合適的格式
    img_byte_array.seek(0)  # 重置流的位置

    files = {'img': (image.filename, img_byte_array, 'image/jpeg')}  # 使用 file object 發送

    try:
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

@app.route('/api/analyze/video', methods=['POST'])
@require_api_key
def analyze_video():
    data = request.json  # 取得 JSON 格式的請求內容
    headers = {"X-API-KEY": API_KEY}  # 添加 API key 到請求標頭
    try:
        response = requests.post(f"{VIDEO_API_URL}/analyze/video", json=data, headers=headers)
        response.raise_for_status()  # 檢查 HTTP 請求是否成功
        result = response.json()  # 獲取模型 API 返回的結果
        return jsonify(result)
    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {http_err}")
        return jsonify({"error": "Model API error", "success": False}), 500
    except Exception as err:
        print(f"Other error occurred: {err}")
        return jsonify({"error": "Unexpected error", "success": False}), 500

@app.route('/api/result/video', methods=['GET'])
@require_api_key
def result_video():
    task_id = request.args.get('id')  # 獲取查詢參數 id
    if not task_id:
        return jsonify({"error": "Task ID is required", "success": False}), 400
    
    headers = {"X-API-KEY": API_KEY}  # 添加 API key 到請求標頭
    try:
        response = requests.get(f"{VIDEO_API_URL}/result/video?id={task_id}", headers=headers)
        response.raise_for_status()  # 檢查 HTTP 請求是否成功
        result = response.json()  # 獲取模型 API 返回的結果
        return jsonify(result)
    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {http_err}")
        return jsonify({"error": "Model API error", "success": False}), 500
    except Exception as err:
        print(f"Other error occurred: {err}")
        return jsonify({"error": "Unexpected error", "success": False}), 500

def preprocess(img):
    if img.mode == 'RGBA':
        img = img.convert('RGB')
    return img

if __name__ == '__main__':
    app.run(port=5000, debug=True)
