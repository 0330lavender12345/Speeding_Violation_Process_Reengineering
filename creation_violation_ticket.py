from flask import Flask, jsonify, render_template
import mysql.connector
from PIL import Image, ImageDraw, ImageFont
from datetime import datetime
import qrcode
import barcode
from barcode.writer import ImageWriter
import os
import time


app = Flask(__name__)
OUTPUT_DIR = 'static/images'  
os.makedirs(OUTPUT_DIR, exist_ok=True)

def generate_barcode(data):
    code128 = barcode.get_barcode_class('code128')
    barcode_img = code128(data, writer=ImageWriter())
    return barcode_img.render()

def word_wrap(text, font, max_width, draw):
    """自動換行函數"""
    if not text:
        return []
    text = str(text)
    chars = list(text)
    lines = []
    current_line = ""
    for char in chars:
        test_line = current_line + char
        bbox = draw.textbbox((0, 0), test_line, font=font)
        width = bbox[2] - bbox[0]

        if width <= max_width:
            current_line = test_line
        else:
            lines.append(current_line)
            current_line = char

    if current_line:
        lines.append(current_line)

    return lines


def draw_cell_text(draw, text, x, y, width, height, font):
    """繪製儲存格文字"""
    lines = word_wrap(text, font, width - 10, draw)
    line_height = font.size + 4
    total_text_height = len(lines) * line_height

    # 垂直置中
    start_y = y + (height - total_text_height) // 2

    for i, line in enumerate(lines):
        line_y = start_y + (i * line_height)
        draw.text((x + 5, line_y), line, fill="black", font=font)

    return total_text_height + 10


def generate_ticket_image(violation_data):
    
    #罰單大小
    img_width, img_height = 1000, 500
    img = Image.new('RGB', (img_width, img_height), color=(255, 245, 245))
    draw = ImageDraw.Draw(img)

    #載入台北警察局印章
    seal_image = Image.open('seals/taipei_police_seal.png')
    seal_width, seal_height = seal_image.size
    new_width = 220  # 設定新的寬度
    new_height = int(seal_height * (new_width / seal_width))  # 等比例縮放
    seal_image = seal_image.resize((new_width, new_height), Image.LANCZOS)

    #字體
    font_path = "C:/Windows/Fonts/kaiu.ttf"
    regular_font = ImageFont.truetype(font_path, 16)
    small_font = ImageFont.truetype(font_path, 12)
    title_font = ImageFont.truetype(font_path, 24)

    # 左上table
    left_table_x = 30
    left_table_y = 20
    left_table_width = 150
    left_table_height = 80

    # Main box
    draw.rectangle([left_table_x, left_table_y,
                   left_table_x + left_table_width, left_table_y + left_table_height],
                   outline="black", width=1)

    # First checkbox and text
    draw.rectangle([left_table_x + 5, left_table_y + 5,
                   left_table_x + 15, left_table_y + 15],
                   outline="black", width=1)

    draw.line([left_table_x + 7, left_table_y + 10,
              left_table_x + 9, left_table_y + 13],
              fill="black", width=1)
    draw.line([left_table_x + 9, left_table_y + 13,
              left_table_x + 13, left_table_y + 8],
              fill="black", width=1)

    content_text = "得採網際網路、語音轉\n帳、郵繳或向經委託代\n收之機構繳納罰款"
    y_offset = 5
    for line in content_text.split('\n'):
        draw.text((left_table_x + 20, left_table_y + y_offset),
                  line, font=small_font, fill="black")
        y_offset += 15

    draw.rectangle([left_table_x + 5, left_table_y + 50,
                   left_table_x + 15, left_table_y + 60],
                   outline="black", width=1)

    draw.text((left_table_x + 20, left_table_y + 50),
              "須至應到案處所聽候截決", font=small_font, fill="black")

    right_table_x = left_table_x + left_table_width + 20
    right_table_width = 150

    draw.rectangle([right_table_x, left_table_y,
                   right_table_x + right_table_width, left_table_y + left_table_height],
                   outline="black", width=1)

    draw.text((right_table_x + 5, left_table_y + 5),
              "被通知人(受處罰對象)", font=small_font, fill="black")

    checkbox_items = ["汽車駕駛人", "汽車所有人", "其他行為人"]
    y_offset = 25
    for item in checkbox_items:
        draw.rectangle([right_table_x + 5, left_table_y + y_offset,
                       right_table_x + 15, left_table_y + y_offset + 10],
                       outline="black", width=1)

        if item == "汽車所有人":
            draw.line([right_table_x + 7, left_table_y + y_offset + 5,
                      right_table_x + 9, left_table_y + y_offset + 8],
                      fill="black", width=1)
            draw.line([right_table_x + 9, left_table_y + y_offset + 8,
                      right_table_x + 13, left_table_y + y_offset + 3],
                      fill="black", width=1)

        draw.text((right_table_x + 20, left_table_y + y_offset),
                  item, font=small_font, fill="black")
        y_offset += 20

    title_text = "臺北市政府警察局"
    title_bbox = draw.textbbox((0, 0), title_text, font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    title_x = (img_width - title_width) // 2
    draw.text((title_x, 30), title_text, font=title_font, fill="black")

    subtitle_text = "舉發違反道路交通管理事件通知單"
    subtitle_bbox = draw.textbbox((0, 0), subtitle_text, font=regular_font)
    subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
    subtitle_x = (img_width - subtitle_width) // 2
    draw.text((subtitle_x, 60), subtitle_text, font=regular_font, fill="black")

    table_width = 800
    table_start_x = (img_width - table_width) // 2
    table_start_y = 120
    min_cell_height = 40
    col_widths = [120, 280, 120, 280]

    def wrap_text(text, font, max_width):
        words = str(text).replace('\n', ' ').split(' ')
        lines = []
        current_line = []
        current_width = 0

        for word in words:
            word_width = draw.textlength(word + ' ', font=font)
            if current_width + word_width <= max_width:
                current_line.append(word)
                current_width += word_width
            else:
                if current_line:
                    lines.append(' '.join(current_line))
                current_line = [word]
                current_width = word_width

        if current_line:
            lines.append(' '.join(current_line))
        return lines

    def draw_wrapped_text(text, x, y, max_width, font, cell_height):
        lines = wrap_text(text, font, max_width)
        line_height = font.size + 2
        total_height = len(lines) * line_height
        start_y = y + (cell_height - total_height) // 2

        for i, line in enumerate(lines):
            draw.text((x, start_y + i * line_height),
                      line, font=font, fill="black")
        return total_height

        table_width = 800
    table_start_x = (img_width - table_width) // 2
    table_start_y = 120
    min_cell_height = 40
    col_widths = [120, 280, 120, 280]
    violation_description = f"該路段速限{violation_data['Speed_Limit']}公里，經測速時速{violation_data['Vehicle_Speed']}公里，超速{violation_data['Vehicle_Speed'] - violation_data['Speed_Limit']}公里"

    table_data = [
        [("駕駛人姓名", violation_data['Owner_Name']),
         ("違規時間", violation_data['Record_Timestamp'])],
        [("車號", violation_data['License_Plate']),
         ("違規事實", violation_description)],
        [("車輛種類", violation_data['Vehicle_Registration_Type']),
         ("舉發違反法條", "道路交通管理處罰條例第33條第1項(期限內自動繳納處新台幣3500元)")],
        [("地址", violation_data['Owner_Address']),
         ("違規地點", violation_data['Violation_Location'])],
         [("舉發單位",""),
         ("填單人職名章", "\n\n\n" )]
    ]

    current_y = table_start_y
    for row in table_data:
        row_height = min_cell_height
        for i, (label, value) in enumerate(row):
            label_width = col_widths[i * 2]
            value_width = col_widths[i * 2 + 1]

            label_lines = word_wrap(
                label, regular_font, label_width - 10, draw)
            value_lines = word_wrap(
                str(value), regular_font, value_width - 10, draw)

            label_height = len(label_lines) * (regular_font.size + 4) + 10
            value_height = len(value_lines) * (regular_font.size + 4) + 10

            row_height = max(row_height, label_height, value_height)

        if row[0][0] == "舉發單位" or row[0][0] == "填單人職名章":
            row_height = max(row_height, min_cell_height * 3)  

        # 繪製這一列的儲存格
        current_x = table_start_x
        for i, (label, value) in enumerate(row):

            label_width = col_widths[i * 2]
            draw.rectangle([current_x, current_y,
                            current_x + label_width, current_y + row_height],
                           outline="black", width=1)
            draw_cell_text(draw, label, current_x, current_y,
                           label_width, row_height, regular_font)

            # 繪製值儲存格
            value_width = col_widths[i * 2 + 1]
            draw.rectangle([current_x + label_width, current_y,
                            current_x + label_width + value_width, current_y + row_height],
                           outline="black", width=1)
            draw_cell_text(draw, str(value), current_x + label_width, current_y,
                           value_width, row_height, regular_font)

            current_x += label_width + value_width

        current_y += row_height

 
    #印章位置
    seal_cell_x = table_start_x + 210
    seal_cell_y = current_y - min_cell_height
    seal_x = seal_cell_x + (280 - seal_width) // 2
    offset = 5  
    seal_y = seal_cell_y + (min_cell_height - seal_height) // 2 + offset
    img.paste(seal_image, (seal_x, seal_y), seal_image)


    #條碼
    barcode_img = generate_barcode(violation_data['License_Plate'])
    barcode_img = barcode_img.resize((300, 50))
    barcode_x = (img_width - 300) // 2
    offset = 30  
    barcode_y = img_height - 100 + offset
    img.paste(barcode_img, (barcode_x, barcode_y))

    filename = f"{violation_data['License_Plate']}_{violation_data['Record_Timestamp'].strftime('%Y%m%d%H%M%S')}.png"
    img.save(os.path.join(OUTPUT_DIR, filename)) 
    return filename

def process_violation_tickets():
    db = None
    cursor = None
    try:
        db = mysql.connector.connect(
            host="localhost",
            user="root",
            password="1234",
            database="violation_db",
            connect_timeout=28800,
            autocommit=True,
            buffered=True
        )
        
        cursor = db.cursor(dictionary=True)
        
        # 檢查未處理的罰單
        cursor.execute("""
            SELECT f.* 
            FROM fineview f
            LEFT JOIN fine_print_log p ON f.National_Violation_Report_ID = p.Fine_Violation_Report_ID
            WHERE p.Fine_Violation_Report_ID IS NULL
        """)
        
        violations = cursor.fetchall()
        
        # 如果沒有新的違規記錄，直接返回 False
        if not violations:
            return False, "所有罰單都已處理過"
            
        new_files = []  
        
        for violation_data in violations:
            try:
                filename = generate_ticket_image(violation_data)
                print(f"已產生通知單: {filename}")
                new_files.append(filename)
                
                cursor.execute("""
                    INSERT INTO fine_print_log
                    (Fine_Violation_Report_ID, Printer_Staff_ID, Print_Timestamp, Processor_IP, Fine_Image)
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    violation_data['National_Violation_Report_ID'],
                    'tp001',
                    datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    '127.0.0.1',
                    filename
                ))
                db.commit()
            except Exception as e:
                print(f"處理單筆罰單時發生錯誤: {e}")
                continue
            
            time.sleep(0.1)
            
        return True, new_files  
            
    finally:
        if cursor:
            cursor.close()
        if db and db.is_connected():
            db.close()
            print("資料庫連接已關閉")

if __name__ == '__main__':
    process_violation_tickets()