from flask import Flask, render_template, send_file, jsonify, url_for, request
import os
from PIL import Image
import io
from creation_violation_ticket import process_violation_tickets  # 修改這行
import mysql.connector
from mysql.connector import Error
import time
from datetime import datetime
import hashlib
import binascii

app = Flask(__name__)

STATIC_FOLDER = 'static/images'
os.makedirs(STATIC_FOLDER, exist_ok=True)


@app.route('/')
def index():
    image_files = [f for f in os.listdir(STATIC_FOLDER) if f.endswith('.png')]
    return render_template('index.html', images=image_files)


@app.route('/view/<image_name>')
def view_image(image_name):
    image_path = os.path.join(STATIC_FOLDER, image_name)
    return send_file(image_path, mimetype='image/png')


@app.route('/process_tickets', methods=['POST'])
def process_tickets():
    max_retries = 3
    retry_count = 0

    while retry_count < max_retries:
        try:
            # 調用處理函數，獲取處理結果和新文件列表
            success, result = process_violation_tickets()

            if not success:
                # 如果沒有新的違規記錄需要處理
                return jsonify({
                    'success': True,
                    'message': result,  # "所有罰單都已處理過"
                    'images': [f for f in os.listdir(STATIC_FOLDER) if f.endswith('.png')],
                    'newImagesCreated': False
                })
            else:
                # 如果有新的違規記錄被處理
                return jsonify({
                    'success': True,
                    'message': '罰單處理完成',
                    'images': [f for f in os.listdir(STATIC_FOLDER) if f.endswith('.png')],
                    'newImagesCreated': True,
                    'newFiles': result  # 新生成的文件列表
                })

        except mysql.connector.Error as e:
            retry_count += 1
            if retry_count < max_retries:
                time.sleep(5)  # 等待5秒後重試
                continue
            return jsonify({
                'success': False,
                'message': f'資料庫連接錯誤 (重試 {retry_count} 次後失敗): {str(e)}'
            }), 500

        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'處理過程發生錯誤: {str(e)}'
            }), 500

# 新增車牌查詢路由


@app.route('/search_by_plate', methods=['POST'])
def search_by_plate():
    try:
        data = request.get_json()
        plate_number = data.get('plateNumber', '').strip()

        if not plate_number:
            # 如果沒有輸入車牌號碼，返回所有圖片
            image_files = [f for f in os.listdir(
                STATIC_FOLDER) if f.endswith('.png')]
            return jsonify({
                'success': True,
                'images': image_files
            })

        # 取得所有圖片檔案
        image_files = [f for f in os.listdir(
            STATIC_FOLDER) if f.endswith('.png')]
        filtered_images = []

        # 過濾符合車牌號碼的圖片
        for image in image_files:
            try:
                # 從檔名取得車牌號碼（格式：車牌號_YYYYMMDDHHMMSS.png）
                file_plate = image.split('_')[0]

                # 如果車牌號碼符合搜尋條件（不區分大小寫）
                if plate_number.lower() in file_plate.lower():
                    filtered_images.append(image)

            except (ValueError, IndexError):
                continue

        return jsonify({
            'success': True,
            'images': filtered_images
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'搜尋過程發生錯誤: {str(e)}'
        }), 500

# 查詢車牌


@app.route('/combined_search', methods=['POST'])
def combined_search():
    try:
        data = request.get_json()
        plate_number = data.get('plateNumber', '').strip()
        start_date = data.get('startDate')
        end_date = data.get('endDate')

        image_files = [f for f in os.listdir(
            STATIC_FOLDER) if f.endswith('.png')]
        filtered_images = []

        for image in image_files:
            try:

                file_plate = image.split('_')[0]
                if plate_number.lower() not in file_plate.lower():
                    continue

                date_str = image.split('_')[1].split('.')[0]
                image_date = datetime.strptime(date_str, '%Y%m%d%H%M%S')
                start = datetime.strptime(
                    start_date, '%Y-%m-%d').replace(hour=0, minute=0, second=0)
                end = datetime.strptime(
                    end_date, '%Y-%m-%d').replace(hour=23, minute=59, second=59)

                if start <= image_date <= end:
                    filtered_images.append(image)

            except (ValueError, IndexError):
                continue

        return jsonify({
            'success': True,
            'images': filtered_images
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'搜尋過程發生錯誤: {str(e)}'
        }), 500

# 日期搜尋


@app.route('/search_tickets', methods=['POST'])
def search_tickets():
    try:
        data = request.get_json()
        start_date = data.get('startDate')
        end_date = data.get('endDate')

        image_files = [f for f in os.listdir(
            STATIC_FOLDER) if f.endswith('.png')]
        filtered_images = []

        for image in image_files:
            try:
                date_str = image.split('_')[1].split('.')[0]
                image_date = datetime.strptime(date_str, '%Y%m%d%H%M%S')

                start = datetime.strptime(
                    start_date, '%Y-%m-%d').replace(hour=0, minute=0, second=0) if start_date else None
                end = datetime.strptime(
                    end_date, '%Y-%m-%d').replace(hour=23, minute=59, second=59) if end_date else None

                if (not start or image_date >= start) and (not end or image_date <= end):
                    filtered_images.append(image)

            except (ValueError, IndexError):
                continue

        return jsonify({
            'success': True,
            'images': filtered_images
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


# 登入
def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host='localhost',
            database='violation_db',
            user='root',
            password='1234'    # 改成你的資料庫密碼
        )
        return connection
    except Error as e:
        print(f"資料庫連接錯誤: {e}")
        return None


def verify_password(stored_password, stored_salt, provided_password):
    """驗證密碼"""
    try:
        print("=== 密碼驗證流程 ===")
        print(f"1. 輸入的密碼: {provided_password}")
        print(f"2. 存儲的密碼: {stored_password}")
        print(f"3. 存儲的 salt: {stored_salt}")

        # 將 salt 從十六進制字符串轉換為位元組
        salt = binascii.unhexlify(stored_salt)

        # 對輸入的密碼進行標準化（轉大寫）和雜湊
        standardized_password = provided_password.upper()

        # 計算雜湊值
        pw_hash = hashlib.pbkdf2_hmac(
            'sha256',
            standardized_password.encode('utf-8'),
            salt,
            100000
        )
        calculated_hash = binascii.hexlify(pw_hash).decode('utf-8')

        print(f"4. 計算出的雜湊: {calculated_hash}")
        print(f"5. 是否匹配: {calculated_hash == stored_password}")

        return calculated_hash == stored_password

    except Exception as e:
        print(f"密碼驗證錯誤: {e}")
        import traceback
        traceback.print_exc()
        return False


def login_verify(username, password):
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        query = "SELECT * FROM users_info WHERE UPPER(username) = UPPER(%s)"
        cursor.execute(query, (username,))
        user = cursor.fetchone()

        if user and user.get('password') and user.get('salt'):
            if verify_password(user['password'], user['salt'], password):
                print("密碼驗證成功!")
                return user['user_id'], "登入成功"
            print("密碼驗證失敗")

        return None, "用戶名或密碼錯誤"

    except Exception as e:
        print(f"登入驗證錯誤: {e}")
        return None, str(e)
    finally:
        if connection and connection.is_connected():
            connection.close()


@app.route('/login', methods=['POST'])
def login():
    try:
        username = request.form.get('username') or request.json.get('username')
        password = request.form.get('password') or request.json.get('password')

        print(f"收到登入請求：username={username}")

        # 修改 login_verify 返回更多信息
        result = login_verify(username, password)
        if isinstance(result, tuple) and len(result) == 3:  # 確保返回三個值
            user_id, full_name, message = result
            if user_id:
                print(f"登入成功：user_id={user_id}, full_name={full_name}")
                return jsonify({
                    'status': 'success',
                    'user_id': user_id,
                    'full_name': full_name,  # 添加 full_name
                    'message': message
                }), 200

        return jsonify({
            'status': 'error',
            'message': '登入失敗'
        }), 401

    except Exception as e:
        print(f"登入處理異常：{str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


def test_password_hash():
    """測試密碼雜湊過程"""
    test_password = "TP12345"
    print(f"測試密碼: {test_password}")

    # 使用固定的 salt 來測試
    test_salt = "4bff4a31a246d7c55c406f7e35edcdb3"
    print(f"使用的 salt: {test_salt}")

    # 計算雜湊
    salt = binascii.unhexlify(test_salt)
    pw_hash = hashlib.pbkdf2_hmac(
        'sha256',
        test_password.encode('utf-8'),
        salt,
        100000
    )
    calculated_hash = binascii.hexlify(pw_hash).decode('utf-8')
    print(f"計算出的雜湊: {calculated_hash}")

    # 與數據庫中的雜湊比較
    stored_hash = "deee026c52fa1b4e595f6fb09bb54169f8cb2e5585de0849c6cf26cffee7bc44"
    print(f"存儲的雜湊: {stored_hash}")
    print(f"雜湊是否匹配: {calculated_hash == stored_hash}")


test_password_hash()


def login_verify(username, password):
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        query = "SELECT * FROM users_info WHERE UPPER(username) = UPPER(%s)"
        cursor.execute(query, (username,))
        user = cursor.fetchone()

        if user and user.get('password') and user.get('salt'):
            if verify_password(user['password'], user['salt'], password):
                print("密碼驗證成功!")
                return user['user_id'], user['full_name'], "登入成功"  # 返回三個值
            print("密碼驗證失敗")

        return None, None, "用戶名或密碼錯誤"

    except Exception as e:
        print(f"登入驗證錯誤: {e}")
        return None, None, str(e)
    finally:
        if connection and connection.is_connected():
            connection.close()


if __name__ == '__main__':
    app.run(debug=True)
