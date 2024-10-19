import redis

def connect_redis(config):
    try:
        conn = redis.StrictRedis(**config)
        conn.ping()  # 測試連接
        print("Redis connected.")
        return conn
    except redis.ConnectionError as err:
        print(f"Error: {err}")
        exit(1)