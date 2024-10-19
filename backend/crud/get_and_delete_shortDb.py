import mysql.connector

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

def connect_mysql(db_config):
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        print("Make a MySQL Database connection.")
        return conn, cursor
    except mysql.connector.Error as err:
        print(f"Error: {err}")
        exit(1)

def get_and_delete_shortDb():
    db_conn, db_cursor = connect_mysql(db_config)
    db_cursor.execute("SELECT * FROM push_data")
    data = db_cursor.fetchall()
    db_cursor.execute("DELETE FROM push_data")
    db_conn.commit()
    db_conn.close()

    return data

data = get_and_delete_shortDb()
print(data)