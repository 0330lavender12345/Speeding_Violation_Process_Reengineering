from flask import Flask, render_template, request, redirect, url_for, session
import mysql.connector
import base64
from datetime import datetime
from routes.history import history  # 引入 history.py 中的 history 函數

app = Flask(__name__)
app.secret_key = 'your_secret_key_here'  # 用於會話管理的密鑰

# 註冊 history 路由
app.add_url_rule('/history', 'history', history)

# 获取数据库连接
def get_database_connection():
    try:
        return mysql.connector.connect(
            host='localhost',
            user='root',
            password='1234',
            database='violation_db'
        )
    except mysql.connector.Error as err:
        print(f"數據庫連接錯誤: {err}")  # 打印連接錯誤
        return None  # 返回 None 表示连接失败

# 紀錄事件日誌
def log_event(staff_id, violation_report_id, event_type, license_plate=None):
    db_connection = get_database_connection()
    if db_connection is None:  # 如果數據庫連接失敗，打印錯誤並返回
        print("錯誤:無法連接到數據庫。")
        return

    cursor = db_connection.cursor()

    # 獲取處理機的 IP 地址
    processor_ip = request.remote_addr

    # 检查该记录是否已存在
    check_query = """
    SELECT COUNT(*) FROM manual_recognition_log WHERE MR_Violation_Report_ID = %s
    """
    cursor.execute(check_query, (violation_report_id,))
    exists = cursor.fetchone()[0]

    timestamp = datetime.now()

    if exists:  # 如果紀錄已存在，执行更新操作
        update_query = """
        UPDATE manual_recognition_log 
        SET Staff_ID = %s, Timestamp = %s, Event_Type = %s, License_Plate = %s, Processor_ID = %s
        WHERE MR_Violation_Report_ID = %s
        """
        cursor.execute(update_query, (staff_id, timestamp, event_type, license_plate, processor_ip, violation_report_id))
    else:  # 如果紀錄不存在，執行插入操作
        insert_query = """
        INSERT INTO manual_recognition_log (MR_Violation_Report_ID, Staff_ID, Timestamp, Event_Type, License_Plate, Processor_ID)
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        cursor.execute(insert_query, (violation_report_id, staff_id, timestamp, event_type, license_plate, processor_ip))

    db_connection.commit()
    db_connection.close()





# 登入路由
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        staff_id = request.form.get("staff_id")
        password = request.form.get("password")

        db_connection = get_database_connection()
        if db_connection is None:
            error_message = "無法連接到數據庫。"
            return render_template("login.html", error=error_message)

        cursor = db_connection.cursor(dictionary=True)
        query = "SELECT * FROM users WHERE username = %s AND password = %s"
        cursor.execute(query, (staff_id, password))
        user = cursor.fetchone()

        if user:
            session['user_id'] = user['user_id']
            session['full_name'] = user['full_name']
            return redirect(url_for('index'))
        else:
            error_message = "無效的員工ID或密碼！"
            return render_template("login.html", error=error_message)

    return render_template("login.html")

# 登出路由
@app.route("/logout")
def logout():
    session.clear()  # 清除繪畫中的所有内容
    return redirect(url_for('login'))  # 重定向到登入页面

# 首頁路由
@app.route("/", methods=["GET", "POST"])
def index():
    if 'user_id' not in session:
        return redirect(url_for('login'))  # 如果没有登入，重定向到登入頁面
    
    user_full_name = session['full_name']  # 獲取當前登入用户的全名
        
    
    

    try:
        db_connection = get_database_connection()
        if db_connection is None:
            return "無法連接到數據庫"  # 如果無法接數據庫，返回錯誤訊息

        cursor = db_connection.cursor(dictionary=True)

        # 獲取當前時間，默認為 "2024-01-01 00:00:00"
        current_timestamp = request.form.get("current_timestamp", default="2024-01-01 00:00:00", type=str)

        query_next = """
        SELECT 
            National_Case_ID,
            National_Violation_Report_ID,
            Image,
            Recognition_Result,
            Record_Timestamp,
            Violation_Location
        FROM national_case_report
        WHERE Recognition_Result IN ('NA', 'DD')  
          AND Record_Timestamp > %s
        ORDER BY Record_Timestamp ASC
        LIMIT 1;
        """

        query_previous = """
        SELECT 
            National_Case_ID,
            National_Violation_Report_ID,
            Image,
            Recognition_Result,
            Record_Timestamp,
            Violation_Location
        FROM national_case_report
        WHERE Recognition_Result IN ('NA', 'DD')  
          AND Record_Timestamp < %s
        ORDER BY Record_Timestamp DESC
        LIMIT 1;
        """

        action = request.form.get("action")
        if action == "next_image":
            cursor.execute(query_next, (current_timestamp,))
        elif action == "previous_image":
            cursor.execute(query_previous, (current_timestamp,))
        else:
            cursor.execute(query_next, (current_timestamp,))

        result = cursor.fetchone()

        if not result:
            current_timestamp = "2024-01-01 00:00:00"
            cursor.execute(query_next, (current_timestamp,))
            result = cursor.fetchone()

        # 查詢結果處理
        if result:
            # 將 Recognition_Result 映射為對應的文本描述
            recognition_mapping = {
                'NA': '無法辨識',
                'DD': '重複車牌',
            }
            result['Recognition_Display'] = recognition_mapping.get(result['Recognition_Result'], '未知狀態')

            # 如果有圖片，將圖片轉換為 base64 格式
            if result['Image']:
                image_path = f"static/images/{result['Image']}"
                with open(image_path, "rb") as img_file:
                    result['Image'] = base64.b64encode(img_file.read()).decode('utf-8')

        # 記錄讀取事件
            log_event(session['user_id'], result['National_Violation_Report_ID'], 'read')
        else:
            return render_template("MR.html", error="沒有更多的違規記錄。")

        final_response_time = datetime.now()

        # 處理提交结果的操作
        if request.method == "POST" and action not in ["next_image", "previous_image"]:
            recognition_result = request.form.get("recognition_result")
            national_case_id = request.form.get("National_Case_ID")

            error_type = request.form.get('error_type')  # 獲取錯誤類型

            if action == "submit_result":
                if not recognition_result:
                    error_message = "車牌號碼為必填！"
                    return render_template("MR.html", error=error_message, data=result)

                # 更新 national_case_report 表
                update_query = """
                UPDATE national_case_report
                SET 
                    License_Plate = %s,
                    Recognition_Result = 'OK',
                    Final_Response_Time = %s
                WHERE National_Case_ID = %s
                """
                cursor.execute(update_query, (recognition_result, final_response_time, national_case_id))
                db_connection.commit()

                # 插入或更新到 vehicle_registration 表
                insert_update_query = """
                INSERT INTO vehicle_registration (Violation_Report_ID, License_Plate)
                VALUES (%s, %s)
                ON DUPLICATE KEY UPDATE
                    License_Plate = VALUES(License_Plate)
                """
                cursor.execute(insert_update_query, (result['National_Violation_Report_ID'], recognition_result))
                db_connection.commit()

                #紀錄修正事件
                log_event(session['user_id'], result['National_Violation_Report_ID'], 'correct', recognition_result)


            elif action == "submit_error":
                # 根據錯誤類型設置對應的 Recognition_Result
                if error_type == 'cannot_recognize':
                    recognition_result = 'NNA'
                elif error_type == 'duplicate_plate':
                    recognition_result = 'DDD'
                else:
                    recognition_result = 'NNA'  # 若為其他錯誤類型，預設為 'NNA'

                update_query = """
                UPDATE national_case_report
                SET 
                    Recognition_Result = %s,
                    Final_Response_Time = %s
                WHERE National_Case_ID = %s
                """
                cursor.execute(update_query, (recognition_result, final_response_time, national_case_id))
                db_connection.commit()

                # 紀錄錯誤提交的事件
                log_event(session['user_id'], result['National_Violation_Report_ID'], 'correct')

            cursor.execute(query_next, (final_response_time,))
            result = cursor.fetchone()

            if not result:
                current_timestamp = "2024-01-01 00:00:00"
                cursor.execute(query_next, (current_timestamp,))
                result = cursor.fetchone()

            if result and result['Image']:
                image_path = f"static/images/{result['Image']}"
                with open(image_path, "rb") as img_file:
                    result['Image'] = base64.b64encode(img_file.read()).decode('utf-8')

        if result:
            update_last_access_query = """
            UPDATE national_case_report
            SET Final_Response_Time = %s
            WHERE National_Case_ID = %s
            """
            cursor.execute(update_last_access_query, (final_response_time, result['National_Case_ID']))
            db_connection.commit()

            
        db_connection.close()
        
        return render_template('MR.html', data=result, user_full_name=user_full_name)
    
    except mysql.connector.Error as err:
        print(f"數據庫錯誤: {err}")
        return f"數據庫訪問錯誤: {err}"

if __name__ == '__main__':
    app.run(debug=True) 