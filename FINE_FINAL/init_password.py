import mysql.connector
import hashlib
import os
import binascii


def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host='localhost',
            database='violation_db',
            user='root',
            password='0727',
        )
        return connection
    except Exception as e:
        print(f"連接錯誤: {e}")
        return None


def hash_password(password):
    """對密碼進行加密"""
    salt = os.urandom(16)
    print(f"原始密碼: {password}")
    print(f"生成的 salt: {binascii.hexlify(salt).decode('utf-8')}")

    # 移除密碼大寫轉換
    pw_hash = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),  # 直接使用原始密碼
        salt,
        100000
    )
    hashed = binascii.hexlify(pw_hash).decode('utf-8')
    print(f"生成的密碼雜湊: {hashed}")
    return hashed, binascii.hexlify(salt).decode('utf-8')


def init_passwords():
    connection = get_db_connection()
    if not connection:
        return

    try:
        cursor = connection.cursor()
        print("開始初始化密碼...")

        # 獲取所有用戶
        cursor.execute(
            # 只處理原始密碼
            "SELECT u.user_id, u.password FROM users_info u WHERE LENGTH(u.password) <= 20")
        users = cursor.fetchall()

        if not users:
            print("沒有找到需要初始化的密碼")
            return

        for user_id, original_password in users:
            print(f"\n處理用戶 {user_id}:")
            if len(original_password) > 20:  # 額外檢查，確保不處理已經雜湊過的密碼
                print(f"跳過已經雜湊過的密碼")
                continue

            # 對每個密碼進行加密
            hashed_password, salt = hash_password(original_password)

            # 更新資料庫
            update_query = """
                UPDATE users_info 
                SET password = %s, salt = %s 
                WHERE user_id = %s
            """
            cursor.execute(update_query, (hashed_password, salt, user_id))
            print(f"更新完成")

        connection.commit()
        print("\n密碼初始化完成")

    except Exception as e:
        print(f"錯誤: {e}")
        connection.rollback()
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()


if __name__ == "__main__":
    init_passwords()
