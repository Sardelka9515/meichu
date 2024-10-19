from db.mysql import connect_mysql, check_and_create_table
from db.redis import connect_redis

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

# 測試資料庫連接
db_conn, db_cursor = connect_mysql(db_config)

# 關閉資料庫連接
db_cursor.close()
db_conn.close()

# 建立 Redis 連接
# redis_conn = connect_redis(redis_config)