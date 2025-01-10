from flask import Flask, render_template, send_file, jsonify, url_for, request

from seal_generator import SealGenerator
import os
from PIL import Image, ImageDraw, ImageFont  # 修正 import
import io
import json  # 添加 json import
from creation_violation_ticket import process_violation_tickets
import mysql.connector
from mysql.connector import Error
import time
from datetime import datetime
import hashlib
import binascii
import pandas as pd
import plotly.graph_objects as go

app = Flask(__name__)

STATIC_FOLDER = 'static/images'
SEAL_FOLDER = 'static/seals'
FONT_PATH = "C:/Windows/Fonts/kaiu.ttf"  #
os.makedirs(STATIC_FOLDER, exist_ok=True)
os.makedirs(SEAL_FOLDER, exist_ok=True)


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
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # 從 fineview 抓取資料
        cursor.execute("""
            SELECT f.*
            FROM fineview f
            LEFT JOIN fine_print_log p ON f.National_Violation_Report_ID = p.Fine_Violation_Report_ID
            WHERE p.Fine_Violation_Report_ID IS NULL
                OR p.status = '待處理'
            ORDER BY f.Record_Timestamp DESC
        """)

        pending_tickets = cursor.fetchall()
        print("查詢到的待處理罰單:", pending_tickets)

        if not pending_tickets:
            return jsonify({
                'success': True,
                'message': '沒有待處理的罰單'
            })

        success_count = 0
        for ticket in pending_tickets:
            try:
                print(f"開始處理罰單 {ticket['National_Violation_Report_ID']}")
                success, result = process_violation_tickets()
                print(f"處理結果: success={success}, result={result}")
                if success:
                    success_count += 1

            except Exception as e:
                print(
                    f"處理罰單 {ticket['National_Violation_Report_ID']} 時發生錯誤: {str(e)}")
                continue

        return jsonify({
            'success': True,
            'message': f'罰單處理完成，成功處理 {success_count} 張罰單',
            'newImagesCreated': success_count > 0
        })

    except Exception as e:
        print(f"處理罰單時發生錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'處理過程發生錯誤: {str(e)}'
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
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

        # 檢查日期格式
        print(f"收到搜尋請求 - 起始日期: {start_date}, 結束日期: {end_date}")

        image_files = [f for f in os.listdir(
            STATIC_FOLDER) if f.endswith('.png')]
        filtered_images = []

        for image in image_files:
            try:
                # 從檔名取得日期部分
                date_str = image.split('_')[1].split('.')[0]
                print(f"處理圖片: {image}, 日期字串: {date_str}")

                # 將檔名中的日期轉換為 datetime 物件
                image_date = datetime.strptime(date_str, '%Y%m%d%H%M%S')

                # 轉換輸入的日期字串為 datetime 物件，並設定時間範圍
                start = datetime.strptime(start_date, '%Y-%m-%d').replace(
                    hour=0, minute=0, second=0) if start_date else datetime.min
                end = datetime.strptime(end_date, '%Y-%m-%d').replace(
                    hour=23, minute=59, second=59) if end_date else datetime.max

                print(f"比較範圍: {start} <= {image_date} <= {end}")

                # 判斷日期是否在範圍內
                if start <= image_date <= end:
                    filtered_images.append(image)
                    print(f"符合條件，添加圖片: {image}")

            except (ValueError, IndexError) as e:
                print(f"處理圖片 {image} 時發生錯誤: {str(e)}")
                continue

        print(f"篩選結果: 找到 {len(filtered_images)} 張圖片")
        return jsonify({
            'success': True,
            'images': filtered_images
        })

    except Exception as e:
        print(f"搜尋過程發生錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500
# 登入
# 新增的蓋章相關路由


@app.route('/batch_stamp', methods=['POST'])
def batch_stamp():
    try:
        data = request.get_json()
        tickets = data.get('tickets', [])
        officer_name = data.get('officer_name')

        if not officer_name:
            return jsonify({
                'success': False,
                'message': '未提供警員姓名'
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # 取得警員 ID
        cursor.execute("""
            SELECT user_id FROM users_info 
            WHERE full_name = %s
        """, (officer_name,))
        officer_data = cursor.fetchone()

        if not officer_data:
            raise Exception('警員資訊不存在')

        officer_id = officer_data[0]
        results = []
        generator = SealGenerator()

        for ticket in tickets:
            try:
                # 保留原始的時間戳
                plate_number = ticket.split('_')[0]
                timestamp = ticket.split('_')[1]  # 獲取原始時間戳

                stamped_image = f"{plate_number}_{timestamp}_stamped.png"
                original_image = f"{plate_number}_{timestamp}.png"

                # 查詢 national_case_report 獲取真實的 ID
                cursor.execute("""
                    SELECT National_Violation_Report_ID 
                    FROM national_case_report 
                    WHERE License_Plate = %s
                """, (plate_number,))

                report_data = cursor.fetchone()
                if not report_data:
                    raise Exception(f'找不到車號 {plate_number} 的違規紀錄')

                report_id = report_data[0]

                # 執行蓋章處理
                original_path = os.path.join(STATIC_FOLDER, original_image)
                if os.path.exists(original_path):
                    with Image.open(original_path) as img:
                        generator.apply_seal_to_ticket(
                            original_path,
                            officer_name,
                            position=(img.size[0] - 340, img.size[1] - 166)
                        )

                # 寫入 fine_print_log 資料表
                cursor.execute("""
                    INSERT INTO fine_print_log 
                        (Fine_Violation_Report_ID, Printer_Staff_ID, 
                         Print_Timestamp, Processor_IP, Fine_Image, status)
                    VALUES 
                        (%s, %s, NOW(), %s, %s, '待列印')
                    ON DUPLICATE KEY UPDATE 
                        Printer_Staff_ID = %s,
                        Print_Timestamp = NOW(),
                        Processor_IP = %s,
                        Fine_Image = %s,
                        status = '待列印'
                """, (
                    report_id,
                    officer_id,
                    request.remote_addr,
                    stamped_image,  # 使用保留原始時間戳的檔名
                    officer_id,
                    request.remote_addr,
                    stamped_image
                ))

                results.append({
                    'ticket_id': plate_number,
                    'report_id': report_id,
                    'success': True,
                    'image': stamped_image
                })

            except Exception as e:
                print(f"處理票號 {ticket} 時發生錯誤: {str(e)}")
                results.append({
                    'ticket_id': ticket,
                    'success': False,
                    'error': str(e)
                })

        conn.commit()
        return jsonify({
            'success': True,
            'message': '蓋章完成',
            'results': results
        })

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"整體處理錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'處理失敗: {str(e)}'
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route('/update_ticket_status', methods=['POST'])
def update_ticket_status():
    try:
        data = request.get_json()
        ticket_id = data.get('ticketId')
        status = data.get('status')

        if not ticket_id or not status:
            return jsonify({
                'success': False,
                'message': '缺少必要參數'
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # 更新 fine_print_log 的狀態
        cursor.execute("""
            UPDATE fine_print_log 
            SET status = %s,
                Print_Timestamp = CASE 
                    WHEN %s = 'printed' THEN NOW() 
                    ELSE Print_Timestamp 
                END
            WHERE Fine_Violation_Report_ID = %s
        """, (status, status, ticket_id))

        conn.commit()
        return jsonify({
            'success': True,
            'message': '狀態更新成功'
        })

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"更新罰單狀態時發生錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'更新失敗: {str(e)}'
        }), 500

    finally:
        if conn:
            conn.close()


@app.route('/get_print_queue', methods=['GET'])
def get_print_queue():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # 修改 SQL 查詢，確保正確取得已蓋章的罰單
        cursor.execute("""
            SELECT 
                ncr.National_Violation_Report_ID as id,
                ncr.License_Plate as plate_number,
                DATE_FORMAT(ncr.Record_Timestamp, '%Y%m%d%H%i%S') as timestamp_str,
                ncr.Record_Timestamp as timestamp,
                ui.full_name as officer_name,
                fpl.status
            FROM fine_print_log fpl
            JOIN national_case_report ncr ON fpl.Fine_Violation_Report_ID = ncr.National_Violation_Report_ID
            JOIN users_info ui ON fpl.Printer_Staff_ID = ui.user_id
            WHERE fpl.status = 'stamped'
            ORDER BY ncr.Record_Timestamp DESC
        """)

        tickets = cursor.fetchall()

        # 處理每筆資料，生成正確的圖片路徑
        formatted_tickets = []
        for ticket in tickets:
            formatted_tickets.append({
                'id': ticket['id'],
                'plate_number': ticket['plate_number'],
                'image': f"{ticket['plate_number']}_{ticket['timestamp_str']}_stamped.png",
                'officer_name': ticket['officer_name'],
                'timestamp': ticket['timestamp'].isoformat() if ticket['timestamp'] else None,
                'status': ticket['status']
            })

        print("待列印罰單:", formatted_tickets)  # 除錯用

        return jsonify({
            'success': True,
            'tickets': formatted_tickets
        })

    except Exception as e:
        print(f"獲取待列印清單時發生錯誤: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

    finally:
        if conn:
            conn.close()


def add_to_print_queue(ticket_id, stamped_path):
    """添加罰單到待列印隊列"""
    print_queue_path = os.path.join(app.root_path, 'print_queue.json')

    try:
        if os.path.exists(print_queue_path):
            with open(print_queue_path, 'r', encoding='utf-8') as f:
                queue = json.load(f)
        else:
            queue = []

        queue.append({
            'ticket_id': ticket_id,
            'path': stamped_path,
            'timestamp': datetime.now().isoformat()
        })

        with open(print_queue_path, 'w', encoding='utf-8') as f:
            json.dump(queue, f, ensure_ascii=False, indent=2)

    except Exception as e:
        print(f"Error adding to print queue: {e}")


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

        # 計算雜湊值
        pw_hash = hashlib.pbkdf2_hmac(
            'sha256',
            provided_password.encode('utf-8'),
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


@app.route('/get_pending_prints', methods=['GET'])
def get_pending_prints():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT 
                fpl.Fine_Violation_Report_ID,
                fpl.Printer_Staff_ID,
                fpl.Print_Timestamp,
                fpl.Processor_IP,
                fpl.Fine_Image,
                fpl.status,
                ncr.License_Plate,
                ui.full_name as printer_name
            FROM fine_print_log fpl
            JOIN national_case_report ncr 
                ON fpl.Fine_Violation_Report_ID = ncr.National_Violation_Report_ID
            LEFT JOIN users_info ui 
                ON fpl.Printer_Staff_ID = ui.user_id
            WHERE 
                fpl.status IS NOT NULL 
                AND (TRIM(LOWER(fpl.status)) IN ('待列印', 'stamped'))
            ORDER BY fpl.Print_Timestamp DESC
        """)

        tickets = cursor.fetchall()

        print("查詢到的待列印罰單:")
        for ticket in tickets:
            print(f"ID: {ticket['Fine_Violation_Report_ID']}, "
                  f"車牌: {ticket['License_Plate']}, "
                  f"圖片: {ticket['Fine_Image']}, "
                  f"狀態: '{ticket['status']}'")

        # # 格式化時間戳
        # for ticket in tickets:
        #     if ticket['Print_Timestamp']:
        #         ticket['Print_Timestamp'] = ticket['Print_Timestamp'].strftime(
        #             '%Y-%m-%d %H:%M:%S')

        return jsonify({
            'success': True,
            'tickets': tickets
        })

    except Exception as e:
        print(f"獲取待列印罰單時發生錯誤: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': str(e),
            'tickets': []
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route('/add_to_print_queue', methods=['POST'])
def add_to_print_queue():
    cursor = None
    try:
        data = request.json
        if not data:
            return jsonify({
                'success': False,
                'message': '未接收到資料'
            }), 400

        required_fields = ['fine_id', 'printer_staff_id', 'fine_image']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'缺少必要欄位: {field}'
                }), 400

        cursor = mysql.connection.cursor()

        # 檢查記錄是否已存在
        cursor.execute("""
            SELECT Fine_Violation_Report_ID 
            FROM fine_print_log 
            WHERE Fine_Violation_Report_ID = %s
        """, (data['fine_id'],))

        if cursor.fetchone():
            # 更新現有記錄
            cursor.execute("""
                UPDATE fine_print_log 
                SET 
                    Printer_Staff_ID = %s,
                    Print_Timestamp = NOW(),
                    Processor_IP = %s,
                    Fine_Image = %s,
                    status = '待列印'
                WHERE Fine_Violation_Report_ID = %s
            """, (
                data['printer_staff_id'],
                request.remote_addr,
                data['fine_image'],
                data['fine_id']
            ))
        else:
            # 插入新記錄
            cursor.execute("""
                INSERT INTO fine_print_log 
                (Fine_Violation_Report_ID, Printer_Staff_ID, Print_Timestamp, 
                Processor_IP, Fine_Image, status)
                VALUES (%s, %s, NOW(), %s, %s, '待列印')
            """, (
                data['fine_id'],
                data['printer_staff_id'],
                request.remote_addr,
                data['fine_image']
            ))

        mysql.connection.commit()
        return jsonify({
            'success': True,
            'message': '成功加入列印隊列'
        })

    except Exception as e:
        print(f"Database error in add_to_print_queue: {str(e)}")  # 記錄錯誤
        if mysql.connection:
            mysql.connection.rollback()
        return jsonify({
            'success': False,
            'message': f'資料庫操作錯誤: {str(e)}'
        }), 500

    finally:
        if cursor:
            cursor.close()


@app.route('/get_history_tickets', methods=['GET'])
def get_history_tickets():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT 
                fpl.Fine_Violation_Report_ID,
                fpl.Fine_Image,
                fpl.Print_Timestamp,
                ncr.License_Plate,
                ncr.Record_Timestamp as Violation_Timestamp, # 新增違規時間
                ui.full_name as Officer_Name,
                fv.Owner_Name
            FROM 
                fine_print_log fpl
            JOIN 
                national_case_report ncr ON fpl.Fine_Violation_Report_ID = ncr.National_Violation_Report_ID
            JOIN 
                users_info ui ON fpl.Printer_Staff_ID = ui.user_id
            JOIN 
                fineview fv ON ncr.National_Violation_Report_ID = fv.National_Violation_Report_ID  # 新增這行來連接 fineview
            WHERE 
                fpl.status IN ('已列印', 'printed', 'stamped') # 擴大狀態篩選範圍
            ORDER BY 
                fpl.Print_Timestamp DESC
        """)

        tickets = cursor.fetchall()

        # 格式化時間戳
        for ticket in tickets:
            if ticket['Print_Timestamp']:
                ticket['Print_Timestamp'] = ticket['Print_Timestamp'].strftime(
                    '%Y-%m-%d %H:%M:%S')
            if ticket['Violation_Timestamp']:
                ticket['Record_Timestamp'] = ticket['Violation_Timestamp'].strftime(
                    '%Y-%m-%d %H:%M:%S')

        return jsonify({
            'success': True,
            'tickets': tickets
        })

    except Exception as e:
        print("獲取歷史罰單失敗:", str(e))
        return jsonify({
            'success': False,
            'message': '獲取歷史罰單失敗'
        })
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route('/api/dashboard/stats')
def get_dashboard_stats():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 獲取總罰單數
        cursor.execute("SELECT COUNT(*) as total FROM fine_print_log")
        total_tickets = cursor.fetchone()[0]

        # 獲取待處理罰單數
        cursor.execute(
            "SELECT COUNT(*) as pending FROM fine_print_log WHERE status = '待處理'")
        pending_tickets = cursor.fetchone()[0]

        # 獲取已蓋章罰單數（status = 待列印）
        cursor.execute(
            "SELECT COUNT(*) as stamped FROM fine_print_log WHERE status = '待列印'")
        stamped_tickets = cursor.fetchone()[0]

        # 獲取歷史罰單數
        cursor.execute(
            "SELECT COUNT(*) as history FROM fine_print_log WHERE status = '已列印'")
        history_tickets = cursor.fetchone()[0]

        # 添加測試日誌
        print(
            f"Dashboard stats: total={total_tickets}, pending={pending_tickets}, stamped={stamped_tickets}")

        return jsonify({
            'success': True,
            'total_tickets': total_tickets,
            'pending_tickets': pending_tickets,
            'stamped_tickets': stamped_tickets,
            'history_tickets': history_tickets
        })
    except Exception as e:
        print(f"Error fetching dashboard stats: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'total_tickets': 0,
            'pending_tickets': 0,
            'stamped_tickets': 0,
            'history_tickets': 0
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route('/move_to_history', methods=['POST'])
def move_to_history():
    conn = None
    cursor = None
    try:
        tickets = request.json.get('tickets', [])

        print("接收到的罰單資料:", tickets)  # 增加除錯日誌

        if not tickets:
            return jsonify({'success': False, 'message': '沒有收到任何罰單資料'})

        conn = get_db_connection()
        cursor = conn.cursor()

        for ticket in tickets:
            # 增加更詳細的除錯日誌
            print(f"處理罰單: {ticket}")
            print(
                f"Fine_Violation_Report_ID: {ticket['Fine_Violation_Report_ID']}")
            print(f"Fine_Image: {ticket['Fine_Image']}")

            cursor.execute("""
                UPDATE fine_print_log 
                SET status = '已列印', 
                    Print_Timestamp = NOW()
                WHERE Fine_Violation_Report_ID = %s 
                AND Fine_Image = %s
            """, (
                int(ticket['Fine_Violation_Report_ID']),
                ticket['Fine_Image']
            ))

            # 檢查受影響的行數
            affected_rows = cursor.rowcount
            print(f"受影響的行數: {affected_rows}")

            if affected_rows == 0:
                print(f"未找到匹配的罰單: {ticket}")

        conn.commit()
        return jsonify({'success': True, 'message': '成功將罰單狀態更新為已列印'})

    except Exception as e:
        if conn:
            conn.rollback()
        print("處理罰單時發生未預期的錯誤:", str(e))
        return jsonify({
            'success': False,
            'message': '處理罰單時發生未預期的錯誤',
            'error_details': str(e)
        })
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route('/update_print_status', methods=['POST'])
def update_print_status():
    cursor = None
    try:
        data = request.json
        if not data or 'fine_id' not in data or 'status' not in data:
            return jsonify({
                'success': False,
                'message': '缺少必要參數'
            }), 400

        cursor = mysql.connection.cursor()

        cursor.execute("""
            UPDATE fine_print_log 
            SET 
                status = %s,
                Print_Timestamp = NOW()
            WHERE Fine_Violation_Report_ID = %s
        """, (data['status'], data['fine_id']))

        if cursor.rowcount == 0:
            return jsonify({
                'success': False,
                'message': '找不到指定的罰單記錄'
            }), 404

        mysql.connection.commit()
        return jsonify({
            'success': True,
            'message': '狀態已更新'
        })

    except Exception as e:
        print(f"Database error in update_print_status: {str(e)}")  # 記錄錯誤
        if mysql.connection:
            mysql.connection.rollback()
        return jsonify({
            'success': False,
            'message': f'資料庫操作錯誤: {str(e)}'
        }), 500

    finally:
        if cursor:
            cursor.close()


# 新增ㄉ
@app.route('/get_pending_process_tickets', methods=['GET'])
def get_pending_process_tickets():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT 
                fpl.Fine_Violation_Report_ID,
                fpl.Fine_Image,
                fpl.Print_Timestamp,
                ncr.License_Plate,
                ncr.Record_Timestamp,
                ui.full_name as Officer_Name
            FROM fine_print_log fpl
            JOIN national_case_report ncr 
                ON fpl.Fine_Violation_Report_ID = ncr.National_Violation_Report_ID
            LEFT JOIN users_info ui 
                ON fpl.Printer_Staff_ID = ui.user_id
            WHERE fpl.status = '待處理'
            ORDER BY fpl.Print_Timestamp DESC
        """)

        tickets = cursor.fetchall()

        # 添加日誌
        print("查詢到的待處理罰單數量:", len(tickets))
        for ticket in tickets:
            print("罰單資料:", ticket)

        # 確保時間格式正確
        formatted_tickets = []
        for ticket in tickets:
            formatted_ticket = dict(ticket)
            if ticket['Print_Timestamp']:
                formatted_ticket['Print_Timestamp'] = ticket['Print_Timestamp'].strftime(
                    '%Y-%m-%d %H:%M:%S')
            if ticket['Record_Timestamp']:
                formatted_ticket['Record_Timestamp'] = ticket['Record_Timestamp'].strftime(
                    '%Y-%m-%d %H:%M:%S')
            formatted_tickets.append(formatted_ticket)

        return jsonify({
            'success': True,
            'tickets': formatted_tickets
        })

    except Exception as e:
        print(f"獲取待處理罰單時發生錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route('/api/dashboard/processing_stats')
def get_processing_stats():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # 查詢四種罰單狀態的統計
        cursor.execute("""
            SELECT 
                'waiting' as status,
                COUNT(*) as count 
            FROM fine_print_log 
            WHERE LOWER(status) = '待處理'
            
            UNION ALL
            
            SELECT 
                'stamped' as status,
                COUNT(*) as count 
            FROM fine_print_log 
            WHERE LOWER(status) = '待列印'
            
            UNION ALL
            
            SELECT 
                'printed' as status,
                COUNT(*) as count 
            FROM fine_print_log 
            WHERE LOWER(status) = '已列印'
            
            UNION ALL
            
            SELECT 
                'archived' as status,
                COUNT(*) as count 
            FROM fine_print_log 
            WHERE LOWER(status) = '歸檔'
        """)

        stats = cursor.fetchall()

        return jsonify({
            'success': True,
            'data': stats
        })

    except Exception as e:
        print(f"Error fetching processing stats: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


if __name__ == '__main__':
    app.run(debug=True)
