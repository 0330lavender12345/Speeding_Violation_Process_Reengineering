from PIL import Image, ImageDraw, ImageFont
import os

def create_seal(name, save_path):
    # 確認目錄是否存在，若不存在則建立
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    
    # 建立透明背景圖片
    img = Image.new('RGBA', (400, 150), color=(255, 255, 255, 0))  # RGBA, 去背色為透明
    draw = ImageDraw.Draw(img)
    
    # 加上紅色邊框 (橫向長方形)
    border_color = 'red'
    draw.rectangle([0, 0, 399, 149], outline=border_color, width=3)  # 長方形邊框
    
    # 使用 kaiu.ttf 字型來顯示中文字
    font_path = "C:/Windows/Fonts/kaiu.ttf"  # 設定使用的字型路徑
    try:
        font = ImageFont.truetype(font_path, 36)  # 字號放大到 36
    except OSError:
        font = ImageFont.load_default()  # 若載入失敗使用系統預設字型
    
    # 設定文字
    text = f"警員印章 - {name}"
    
    # 計算文字尺寸和置中位置
    try:
        # 使用更新的方法來取得文字尺寸
        left, top, right, bottom = font.getbbox(text)
        text_width = right - left
        text_height = bottom - top
        
        # 計算置中位置
        width, height = img.size
        x = (width - text_width) // 2
        y = (height - text_height) // 2
        
        # 畫出文字
        draw.text((x, y), text, fill="red", font=font)
        
        # 儲存圖片
        img.save(save_path, format="PNG")
        print(f"印章已成功儲存至: {save_path}")
        
    except Exception as e:
        print(f"生成印章時發生錯誤: {str(e)}")

# 使用範例
if __name__ == "__main__":
    create_seal('John Doe', 'seals/johndoe_seal.png')