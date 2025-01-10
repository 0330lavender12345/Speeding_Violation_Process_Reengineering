from PIL import Image, ImageDraw, ImageFont
import os

def create_seal(text_lines, save_path):
    # 確認目錄是否存在，若不存在則建立
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    
    # 建立透明背景圖片
    img = Image.new('RGBA', (400, 200), color=(255, 255, 255, 0))  # RGBA, 透明背景
    draw = ImageDraw.Draw(img)
    
    # 加上紅色邊框 (橫向長方形)
    border_color = 'red'
    draw.rectangle([0, 0, 399, 199], outline=border_color, width=3)  # 長方形邊框
    
    # 使用 kaiu.ttf 字型來顯示中文字
    font_path = "C:/Windows/Fonts/kaiu.ttf"  # 設定使用的字型路徑
    try:
        font = ImageFont.truetype(font_path, 36)  # 字號放大到 36
    except OSError:
        font = ImageFont.load_default()  # 若載入失敗使用系統預設字型
    
    # 計算文字尺寸和置中位置
    total_height = 0
    y_start = 40  # 設定起始 Y 位置
    for line in text_lines:
        left, top, right, bottom = font.getbbox(line)
        text_width = right - left
        text_height = bottom - top
        
        # 計算置中位置
        x = (img.width - text_width) // 2
        y = y_start + total_height
        total_height += text_height + 10  # 每行間隔 10px
        
        # 畫出文字
        draw.text((x, y), line, fill="red", font=font)
    
    # 儲存圖片
    img.save(save_path, format="PNG")
    print(f"印章已成功儲存至: {save_path}")

# 使用範例
if __name__ == "__main__":
    text = ["台北市政府警察局", "交通隊", "TEL: 02-12345678"]  
    save_path = "seals/taipei_police_seal.png"
    create_seal(text, save_path)
