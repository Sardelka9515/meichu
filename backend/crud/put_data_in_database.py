import mysql.connector
import redis
import hashlib

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

def insert_long_term_data(cursor, data):
    insert_query = """
    INSERT INTO long_term_data (date, date_chinese, day_of_week, supervision_area, supervision_unit, license_type, remaining_places, description, record_time)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    cursor.execute(insert_query, (
        data['date'], data['date_chinese'], data['day_of_week'], data['supervision_area'], data['supervision_unit'], data['license_type'], data['remaining_places'], data['description'], data['record_time']
    ))

def insert_push_data(cursor, data):
    insert_query = """
    INSERT INTO push_data (date, date_chinese, day_of_week, supervision_area, supervision_unit, license_type, remaining_places, description, record_time)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    cursor.execute(insert_query, (
        data['date'], data['date_chinese'], data['day_of_week'], data['supervision_area'], data['supervision_unit'], data['license_type'], data['remaining_places'], data['description'], data['record_time']
    ))

def generate_hash_key(data):
    # 將需要的字段拼接成一個字串
    key_str = data['date_chinese'] + data['supervision_unit'] + data['license_type'] + data['description']
    # 使用 SHA-256 生成哈希值
    return hashlib.sha256(key_str.encode('utf-8')).hexdigest()

def connect_mysql(db_config):
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        print("Make a MySQL Database connection.")
        return conn, cursor
    except mysql.connector.Error as err:
        print(f"Error: {err}")
        exit(1)

def connect_redis(config):
    try:
        conn = redis.StrictRedis(**config)
        conn.ping()  # 測試連接
        print("Redis connected.")
        return conn
    except redis.ConnectionError as err:
        print(f"Error: {err}")
        exit(1)

def process_data(formatted_data):
    db_conn, db_cursor = connect_mysql(db_config)
    redis_conn = connect_redis(redis_config)
    try:
        for data in formatted_data:
            try:
                # 將資料插入長期資料表
                insert_long_term_data(db_cursor, data)
                db_conn.commit()
            except mysql.connector.Error as err:
                print(f"Error inserting long term data: {err}")
                db_conn.rollback()
                continue

            # 生成哈希鍵
            hash_key = generate_hash_key(data)

            try:
                # 如果 Redis 中不存在這個哈希鍵，則將資料插入推送資料表，並將哈希鍵存入 Redis，有效期為 30 分鐘
                if not redis_conn.exists(hash_key):
                    insert_push_data(db_cursor, data)
                    db_conn.commit()
                    redis_conn.setex(hash_key, 1800, 1)  # 設定30分鐘過期時間
            except mysql.connector.Error as err:
                print(f"Error inserting push data: {err}")
                db_conn.rollback()
            except redis.RedisError as err:
                print(f"Error setting Redis key: {err}")
    finally:
        db_cursor.close()
        db_conn.close()
        redis_conn.close()