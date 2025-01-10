from flask import Flask, render_template, request, redirect, url_for, session
import mysql.connector
import base64
from datetime import datetime

app = Flask(__name__)
app.secret_key = 'your_secret_key_here'  # 用於會話管理的密鑰

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


@app.route('/history')
def history():
    # 嘗試建立數據庫連接
    db_connection = get_database_connection()
    if db_connection is None:
        return "無法連接到數據庫。"

    cursor = db_connection.cursor(dictionary=True)

    # 查詢 Recognition_Result 為 'NNA' 或 'DDD' 的資料
    query = """
    SELECT 
        National_Case_ID,
        National_Violation_Report_ID,
        Image,
        Recognition_Result,
        Record_Timestamp,
        Violation_Location
    FROM national_case_report
    WHERE Recognition_Result IN ('NNA', 'DDD')
    ORDER BY Record_Timestamp DESC
    """

    cursor.execute(query)
    results = cursor.fetchall()

    # 處理圖片為 base64 格式
    for result in results:
        if result['Image']:
            image_path = f"C:\CYCU\SA\Fucking_Violation\Manual\static\images\{result['Image']}"
            with open(image_path, "rb") as img_file:
                result['Image'] = base64.b64encode(img_file.read()).decode('utf-8')
        
        # 根據 Recognition_Result 顯示不同的文字
        if result['Recognition_Result'] == 'NNA':
            result['Recognition_Result_Display'] = '無法辨識'
        elif result['Recognition_Result'] == 'DDD':
            result['Recognition_Result_Display'] = '重複車牌'

    db_connection.close()

    # 將查詢結果傳遞給模板
    return render_template('history.html', records=results, user_full_name=session['full_name'])



if __name__ == '__main__':
    app.run(debug=True)
