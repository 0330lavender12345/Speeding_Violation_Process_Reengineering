from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_mysql_connector import MySQL
import mysql.connector
from PIL import Image
from datetime import datetime
import cv2
import numpy as np
import matplotlib.pyplot as plt
from roboflow import Roboflow
from paddleocr import PaddleOCR
import re
import os
import csv
import requests
from datetime import datetime

# 連接資料庫
app = Flask(__name__)
app.config['MYSQL_HOST'] = 'localhost'       # MySQL 主機
app.config['MYSQL_USER'] = 'root'           # MySQL 使用者
app.config['MYSQL_PASSWORD'] = '1234'   # MySQL 密碼
app.config['MYSQL_DATABASE'] = 'violation_db'   # MySQL 資料庫名稱

# Google Geocoding API 設定
GEOCODING_API_KEY = "AIzaSyCSLh6LAjg5UyRkIK-ug61_P__FaRGhk_k"
GEOCODING_API_URL = "https://maps.googleapis.com/maps/api/geocode/json"

mysql = MySQL(app)

# 主頁面
@app.route('/')
def index():
    return render_template('index.html')

def get_coordinates(address):
    try:
        response = requests.get(GEOCODING_API_URL, params={"address": address, "key": GEOCODING_API_KEY})
        response_data = response.json()

        if response_data['status'] == 'OK':
            location = response_data['results'][0]['geometry']['location']
            return location['lat'], location['lng']
        else:
            print(f"Geocoding API error for address '{address}': {response_data['status']}")
            return None, None
    except Exception as e:
        print(f"Error fetching coordinates for address '{address}': {e}")
        return None, None

# 處理 Python 程式邏輯
@app.route('/run-python', methods=['POST'])
def run_python():
    try:
        # 資料夾路徑
        image_folder_path = r"C:\CYCU\SA\Final-Program\LicenseImages"

        current_time = datetime.now()
        date_format = "%Y/%m/%d %I:%M %p"

        # 將所有檔案名稱插入資料庫
        cursor = mysql.connection.cursor()
        # 根據圖片名稱設定對應的參數
        image_data_mapping = {
            'A01': {'Lamp_Post_ID': 'D004', 'Speed_Limit': 50, 'Vehicle_Speed': 70, 'Violation_Location': '台北市中正區信義路二段23號', 'Record_Timestamp': '2024/1/10 12:00 AM'},
            'A02': {'Lamp_Post_ID': 'D005', 'Speed_Limit': 50, 'Vehicle_Speed': 75, 'Violation_Location': '台北市大安區信義路三段23號', 'Record_Timestamp': '2024/1/10 12:01 AM'},
            'A03': {'Lamp_Post_ID': 'D006', 'Speed_Limit': 50, 'Vehicle_Speed': 65, 'Violation_Location': '台北市大安區信義路四段106號', 'Record_Timestamp': '2024/1/10 12:02 AM'},
            'A04': {'Lamp_Post_ID': 'D007', 'Speed_Limit': 60, 'Vehicle_Speed': 80, 'Violation_Location': '台北市信義區信義路五段23號', 'Record_Timestamp': '2024/1/10 12:03 AM'},
            'A05': {'Lamp_Post_ID': 'D008', 'Speed_Limit': 50, 'Vehicle_Speed': 75, 'Violation_Location': '台北市內湖區內湖路1段324號', 'Record_Timestamp': '2024/1/10 12:04 AM'},
            'A06': {'Lamp_Post_ID': 'D009', 'Speed_Limit': 50, 'Vehicle_Speed': 65, 'Violation_Location': '台北市內湖區行善路233號', 'Record_Timestamp': '2024/1/10 12:05 AM'},
            'A07': {'Lamp_Post_ID': 'D010', 'Speed_Limit': 50, 'Vehicle_Speed': 76, 'Violation_Location': '台北市文山區羅斯福路6段226號', 'Record_Timestamp': '2024/1/10 12:06 AM'},
            'A08': {'Lamp_Post_ID': 'D011', 'Speed_Limit': 50, 'Vehicle_Speed': 60, 'Violation_Location': '台北市松山區健康路300號', 'Record_Timestamp': '2024/1/10 12:07 AM'},
            'A09': {'Lamp_Post_ID': 'D012', 'Speed_Limit': 50, 'Vehicle_Speed': 63, 'Violation_Location': '台北市萬華區和平西路3段199號', 'Record_Timestamp': '2024/1/10 12:08 AM'},
            'A10': {'Lamp_Post_ID': 'D013', 'Speed_Limit': 50, 'Vehicle_Speed': 75, 'Violation_Location': '台北市萬華區環河南路1段77號', 'Record_Timestamp': '2024/1/10 12:09 AM'},
            'A11': {'Lamp_Post_ID': 'D014', 'Speed_Limit': 50, 'Vehicle_Speed': 75, 'Violation_Location': '台北市北投區行義路241號', 'Record_Timestamp': '2024/1/10 12:10 AM'},
            'A12': {'Lamp_Post_ID': 'D015', 'Speed_Limit': 50, 'Vehicle_Speed': 60, 'Violation_Location': '台北市中山區明水路325號', 'Record_Timestamp': '2024/1/10 12:11 AM'},
        }

        for image_name in os.listdir(image_folder_path):
            if image_name.lower().endswith(('.png', '.jpg', '.jpeg')):  # 確保是圖片檔案
                try:
                    cursor.execute("SELECT COUNT(*) FROM violation_record WHERE Image = %s", (image_name,))
                    if cursor.fetchone()[0] == 0:  # 確保記錄不存在
                        # 取得圖片名稱的參數
                        image_key = image_name.split('.')[0]  # 假設圖片名稱格式為 "A01.jpg"
                        if image_key in image_data_mapping:
                            data = image_data_mapping[image_key]
                            
                            # 獲取經緯度
                            latitude, longitude = get_coordinates(data['Violation_Location'])

                            if latitude is not None and longitude is not None:
                                # 插入 violation_record
                                cursor.execute("""
                                    INSERT INTO violation_record 
                                    (Lamp_Post_ID, Speed_Limit, Vehicle_Speed, Violation_Location, Record_Timestamp, Image, Longitude, Latitude) 
                                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                                """, (data['Lamp_Post_ID'], data['Speed_Limit'], data['Vehicle_Speed'], data['Violation_Location'], datetime.strptime(data['Record_Timestamp'], date_format), image_name, longitude, latitude))
                                mysql.connection.commit()

                                # 通過唯一條件查詢剛剛插入的 Violation_Report_ID
                                cursor.execute("SELECT Violation_Report_ID FROM violation_record WHERE Image = %s LIMIT 1", (image_name,))
                                violation_id = cursor.fetchone()
                                if violation_id:
                                    violation_id = violation_id[0]
                                    print(f"Retrieved Violation_Report_ID: {violation_id}")

                                    # 插入到 national_case_report
                                    cursor.execute("""
                                        INSERT INTO national_case_report 
                                        (National_Violation_Report_ID, Lamp_Post_ID, Speed_Limit, Vehicle_Speed, Violation_Location, Record_Timestamp, Image, Longitude, Latitude) 
                                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                                    """, (violation_id, data['Lamp_Post_ID'], data['Speed_Limit'], data['Vehicle_Speed'], data['Violation_Location'], datetime.strptime(data['Record_Timestamp'], date_format), image_name, longitude, latitude))
                                    mysql.connection.commit()
                                else:
                                    print(f"Violation_Report_ID not found for Image: {image_name}")


                            else:
                                print(f"未能獲取經緯度: {data['Violation_Location']}")
                        else:
                            print(f"未找到對應的參數配置: {image_name}")
                except Exception as e:
                    print(f"Error while inserting image {image_name}: {e}")

        mysql.connection.commit()

        # 初始化 Roboflow
        rf = Roboflow(api_key="4mEMAmNqnjHEUnPWzmmg")
        project = rf.workspace().project("license-plate-recognition-rxg4e")
        model = project.version(4).model

        # 初始化 PaddleOCR
        ocr = PaddleOCR(use_angle_cls=True, lang='en')

        # 從資料庫中逐一提取圖片名稱，進行預測
        cursor.execute("SELECT Image FROM violation_record")
        image_records = cursor.fetchall()

        for record in image_records:
            image_name = record[0]  # 獲取圖片名稱
            image_path = os.path.join(image_folder_path, image_name)
            
            # 確保圖片檔案存在
            if os.path.exists(image_path):
                prediction = model.predict(image_path).json()
                original_image = Image.open(image_path)

                # 過濾低置信度的預測框
                high_conf_predictions = [
                    obj for obj in prediction['predictions'] if obj['confidence'] >= 0.75
                ]

                if len(high_conf_predictions) > 1:
                    #送至人工辨識資料庫程式碼
                    try:
                        # 插入資料到資料庫
                        cursor.execute("""
                        UPDATE violation_record
                        SET Recognition_Result = 'DD',
                            Final_Response_Time = %s
                        WHERE violation_record.Image = %s;
                        """, (current_time, image_name))
                        cursor.execute("""
                        UPDATE national_case_report
                        SET Recognition_Result = 'DD',
                            Final_Response_Time = %s
                        WHERE Image = %s;
                        """, (current_time, image_name))
                        mysql.connection.commit()
                    except Exception as e:
                        print(f"插入資料庫時出錯: {e}")
                    continue
                elif len(high_conf_predictions) == 0:
                    #送至人工辨識資料庫程式碼
                    try:
                        # 插入資料到資料庫
                        cursor.execute("""
                        UPDATE violation_record
                        SET Recognition_Result = 'NA',
                            Final_Response_Time = %s
                        WHERE violation_record.Image = %s;
                        """, (current_time, image_name))
                        cursor.execute("""
                        UPDATE national_case_report
                        SET Recognition_Result = 'NA',
                            Final_Response_Time = %s
                        WHERE Image = %s;
                        """, (current_time, image_name))
                        mysql.connection.commit()
                    except Exception as e:
                        print(f"插入資料庫時出錯: {e}")
                    continue

                # 定義車牌格式
                valid_formats = [
                    r"^[A-Z]{2}-\d{4}$",
                    r"^[A-Z]\d-\d{4}$",
                    r"^\d[A-Z]-\d{4}$",
                    r"^\d{4}-[A-Z]{2}$",
                    r"^\d{4}-[A-Z]\d$",
                    r"^[A-Z]{3}-\d{4}$",
                    r"^[A-Z]{3}-\d{3}$",
                    r"^[A-Z]{2}\d{4}$",
                    r"^[A-Z]\d\d{4}$",
                    r"^\d[A-Z]\d{4}$",
                    r"^\d{4}[A-Z]{2}$",
                    r"^\d{4}[A-Z]\d$",
                    r"^[A-Z]{3}\d{4}$",
                    r"^[A-Z]{3}\d{3}$",
                    r"^[A-Z]{2}:\d{4}$",
                    r"^[A-Z]\d:\d{4}$",
                    r"^\d[A-Z]:\d{4}$",
                    r"^\d{4}:[A-Z]{2}$",
                    r"^\d{4}:[A-Z]\d$",
                    r"^[A-Z]{3}:\d{4}$",
                    r"^[A-Z]{3}:\d{3}$",
                ]

                def normalize_license_plate(text):
                    # 替換 ':' 和 '.' 為 '-'
                    text = text.replace(':', '-').replace('.', '-')
                    # 只在英文字母和數字之間沒有符號時插入 '-'
                    text = re.sub(r'(?<=[A-Z])(?=\d)(?<!-)|(?<=\d)(?=[A-Z])(?<!-)', '-', text)
                    return text

                def is_valid_format(text):
                    return any(re.fullmatch(fmt, text) for fmt in valid_formats)

                # 處理車牌
                for obj in high_conf_predictions:
                    x, y, width, height = obj['x'], obj['y'], obj['width'], obj['height']
                    margin = 10  # 增加邊界
                    left = max(0, int(x - width / 2 - margin))
                    top = max(0, int(y - height / 2 - margin))
                    right = min(original_image.width, int(x + width / 2 + margin))
                    bottom = min(original_image.height, int(y + height / 2 + margin))
                    cropped_image = original_image.crop((left, top, right, bottom))

                    # 儲存裁切圖片
                    cropped_image.save("cropped_debug.png")

                    # 增強裁剪圖像
                    cropped_image_cv = np.array(cropped_image)
                    gray_image = cv2.cvtColor(cropped_image_cv, cv2.COLOR_RGB2GRAY)

                    # 二值化處理
                    _, binary_image = cv2.threshold(gray_image, 90, 255, cv2.THRESH_BINARY)

                    # 使用 PaddleOCR 辨識
                    results = ocr.ocr(binary_image, cls=True)

                    # 顯示辨識結果
                    for line in results[0]:
                        text = text = normalize_license_plate(line[1][0])
                        prob = line[1][1]

                        # 檢查是否符合格式
                        if is_valid_format(text):
                            if prob > 0.85:
                                try:
                                    # 插入資料到資料庫
                                    cursor.execute(
                                        """
                                        UPDATE violation_record
                                        SET License_Plate = %s,
                                            Recognition_Result = 'OK',
                                            Final_Response_Time = %s
                                        WHERE 
                                            violation_record.Image = %s;
                                        """, (text, current_time, image_name))
                                    cursor.execute(
                                        """
                                        UPDATE national_case_report
                                        SET License_Plate = %s,
                                            Recognition_Result = 'OK',
                                            Final_Response_Time = %s
                                        WHERE 
                                            Image = %s;
                                        """, (text, current_time, image_name))
                                    cursor.execute(
                                        """
                                        INSERT INTO vehicle_registration
                                        (License_Plate, Violation_Report_ID)
                                        VALUES (%s, (
                                            SELECT Violation_Report_ID
                                            FROM Violation_record
                                            WHERE License_Plate = %s
                                            LIMIT 1
                                        ))
                                        """, (text, text)
                                    )
                                    mysql.connection.commit()
                                    break

                                except Exception as e:
                                    print(f"插入資料庫時出錯: {e}")
                            else:
                                #送至人工辨識資料庫程式碼
                                try:
                                    # 插入資料到資料庫
                                    cursor.execute("""UPDATE violation_record
                                    SET License_Plate = %s, 
                                        Recognition_Result = 'NA',
                                        Final_Response_Time = %s
                                    WHERE violation_record.Image = %s;
                                    """, (text, current_time, image_name))
                                    cursor.execute(
                                        """
                                        UPDATE national_case_report
                                        SET License_Plate = %s,
                                            Recognition_Result = 'NA',
                                            Final_Response_Time = %s
                                        WHERE 
                                            Image = %s;
                                        """, (text, current_time, image_name))

                                    # 提交事務
                                    mysql.connection.commit()
                                except Exception as e:
                                    print(f"插入資料庫時出錯: {e}")
                        else:
                                #送至人工辨識資料庫程式碼
                                try:
                                    # 插入資料到資料庫
                                    cursor.execute("""UPDATE violation_record
                                    SET License_Plate = %s, 
                                        Recognition_Result = 'NA',
                                        Final_Response_Time = %s
                                    WHERE violation_record.Image = %s;
                                    """, (text, current_time, image_name))
                                    cursor.execute(
                                        """
                                        UPDATE national_case_report
                                        SET License_Plate = %s,
                                            Recognition_Result = 'NA',
                                            Final_Response_Time = %s
                                        WHERE Image = %s;
                                        """, (text, current_time, image_name))

                                    # 提交事務
                                    mysql.connection.commit()
                                except Exception as e:
                                    print(f"插入資料庫時出錯: {e}")
        cursor.close()

        # 將結果傳遞到前端
        return jsonify(status="success")
    
    except Exception as e:
        return jsonify(status="error", error=str(e)), 500

@app.route('/run-python2', methods=['POST'])
def run_python2():
    cursor = mysql.connection.cursor()
    cursor.execute("SELECT * FROM violation_record;")
    rows = cursor.fetchall()
    headers = [i[0] for i in cursor.description]  # 獲取欄位名稱

    # 定義 CSV 文件路徑
    file_path = r"C:\CYCU\SA\Final-Program\violation_record.csv"
    os.makedirs(os.path.dirname(file_path), exist_ok=True)  # 確保目錄存在

    # 將數據寫入 CSV 文件
    with open(file_path, mode="w", newline="", encoding="utf-8-sig") as file:
        writer = csv.writer(file)
        writer.writerow(headers)  # 寫入表頭
        writer.writerows(rows)    # 寫入數據

    # 關閉游標
    cursor.close()

    return jsonify(status="success", file_path=file_path), 200

if __name__ == '__main__':
    app.run(debug=True)