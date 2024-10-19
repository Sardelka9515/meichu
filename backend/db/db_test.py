import mysql.connector

# 更新的连接配置
config = {
    'user': 'root',
    'password': 'my-secret-pw',
    'host': 'localhost',
    'port': 3300,
    'database': 'test_db',
    'charset': 'utf8mb4',
    'collation': 'utf8mb4_general_ci'
}

try:
    # 建立连接
    conn = mysql.connector.connect(**config)
    
    # 创建游标
    cursor = conn.cursor()
    
    # 执行查询
    cursor.execute("SELECT VERSION()")
    
    # 获取结果
    result = cursor.fetchone()
    
    # 打印结果
    print(f"Database version: {result[0]}")

except mysql.connector.Error as err:
    print(f"Error: {err}")

finally:
    # 关闭游标和连接
    if 'cursor' in locals():
        cursor.close()
    if 'conn' in locals():
        conn.close()