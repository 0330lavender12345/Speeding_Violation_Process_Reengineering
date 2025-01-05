# update_passwords.py
from db_utils import get_db_connection, hash_password

def update_existing_passwords():
    connection = get_db_connection()
    if not connection:
        print("無法連接到資料庫")
        return
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # 獲取所有用戶
        cursor.execute("SELECT user_id, password FROM users_info")
        users = cursor.fetchall()
        
        for user in users:
            # 對原始密碼進行加密
            hashed_password, salt = hash_password(user['password'])
            
            # 更新資料庫
            update_query = """
                UPDATE users_info 
                SET password = %s, salt = %s 
                WHERE user_id = %s
            """
            cursor.execute(update_query, (hashed_password, salt, user['user_id']))
            print(f"更新用戶 {user['user_id']} 的密碼")
        
        connection.commit()
        print("所有密碼更新完成")
        
    except Exception as e:
        print(f"更新錯誤: {e}")
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

if __name__ == "__main__":
    update_existing_passwords()