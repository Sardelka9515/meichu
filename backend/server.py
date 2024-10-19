import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image, UnidentifiedImageError
import io
import functools
import mysql.connector
import redis
import hashlib
import json

app = Flask(__name__)
CORS(app)

# 資料庫配置
db_config = {
    'user': 'root',
    'password': 'my-secret-pw',
    'host': 'localhost',
    'port': 3300,
    'database': 'test_db',
    'autocommit': True,  # Ensures immediate commit
    'connection_timeout': 1200,  # Set an appropriate timeout
    'charset': 'utf8mb4',
    'collation': 'utf8mb4_general_ci'
}

# Redis 配置
redis_config = {
    'host': 'localhost',
    'port': 6379,
    'db': 0
}

def connect_mysql(config):
    try:
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor()
        print("Testing MySQL Database connection Successfully.")
        return conn, cursor
    except mysql.connector.Error as err:
        print(f"Error: {err}")
        exit(1)

def check_and_create_table(cursor, table_name, create_table_sql):
    cursor.execute(f"SHOW TABLES LIKE '{table_name}'")
    result = cursor.fetchone()
    if not result:
        print(f"Table '{table_name}' does not exist. Creating table...")
        cursor.execute(create_table_sql)
        print(f"Table '{table_name}' created.")

# 測試資料庫連接
db_conn, db_cursor = connect_mysql(db_config)

# 檢查並創建資料表--fake_detection_record
create_fake_detection_record_sql = """
CREATE TABLE fake_detection_record (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255),
    filetype VARCHAR(50),
    ai_probability FLOAT,
    record_time DATETIME NOT NULL
)
"""
check_and_create_table(db_cursor, 'fake_detection_record', create_fake_detection_record_sql)

# 關閉資料庫連接
db_cursor.close()
db_conn.close()

# 設定模型 API URL
MODEL_API_URL = "http://localhost:3000/inference"
VIDEO_API_URL = "https://meichu-video.sausagee.party"
AUDIO_API_URL = "http://localhost:5000/uploader"

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

@app.route('/api/analyze/audio', methods=['POST'])
def audio_detect():
    if 'file' not in request.files:
        return jsonify({"error": "No audio part", "success": False}), 400
    
    file = request.files['file']
    if not file:
        return jsonify({"error": "No selected file", "success": False}), 400
    
    redis_conn = redis.StrictRedis(**redis_config)
    results = []

    try:
        # 對文件做Hash，然後檢查 Redis 是否有快取
        file.seek(0)  # 確保讀取文件的開頭
        file_hash = hashlib.sha256(file.read()).hexdigest()
        result = redis_conn.get(file_hash)
        if result:
            result_json = json.loads(result.decode())
            return jsonify({"result": result_json, "success": True})
        else:
            # 將文件作為附件傳送給 API
            file.seek(0)  # 重置文件指針
            files_to_send = {'file': (file.filename, file.stream, file.mimetype)}
            response = requests.post(f"{AUDIO_API_URL}", files=files_to_send)
            response.raise_for_status()  # 檢查 HTTP 請求是否成功
            result = response.json()  # 獲取模型 API 返回的結果
            print(result)
            ai_probability = result[0]["result_array"][0]
            # print(f"AI probability: {ai_probability}")

            # 將結果存入 Redis 作為快取
            redis_conn.setex(file_hash, 1800, json.dumps(result))

            # 將結果存入資料庫
            db_conn, db_cursor = connect_mysql(db_config)
            insert_sql = "INSERT INTO fake_detection_record (filename, filetype, ai_probability, record_time) VALUES (%s, %s, %s, NOW())"
            db_cursor.execute(insert_sql, (file.filename, "audio", ai_probability,))
            db_conn.commit()
            db_cursor.close()
            db_conn.close()
        
        results.append({"filename": file.filename, "result": result})
    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {http_err}")
        return jsonify({"error": "Model API error", "success": False}), 500
    except json.JSONDecodeError as json_err:
        print(f"JSON decode error occurred: {json_err}")
        return jsonify({"error": "JSON decode error", "success": False}), 500
    except Exception as err:
        print(f"Other error occurred: {err}")
        return jsonify({"error": "Unexpected error", "success": False}), 500
    finally:
        redis_conn.close()
    
    return jsonify({"results": results, "success": True})
    

if __name__ == '__main__':
    app.run(port=5005, debug=True)
