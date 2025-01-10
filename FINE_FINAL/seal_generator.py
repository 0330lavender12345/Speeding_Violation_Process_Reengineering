from PIL import Image, ImageDraw, ImageFont
import os


class SealGenerator:
    def __init__(self, font_path="C:/Windows/Fonts/kaiu.ttf"):
        self.font_path = font_path
        self.seal_size = (200, 50)  # 使用較小的尺寸

    def create_officer_seal(self, officer_name):
        """生成警員印章"""
        text_lines = [f"警員 {officer_name}"]

        img = Image.new('RGBA', self.seal_size, color=(255, 255, 255, 0))
        draw = ImageDraw.Draw(img)

        draw.rectangle([0, 0, self.seal_size[0]-1, self.seal_size[1]-1],
                       outline='red', width=2)

        try:
            font = ImageFont.truetype(self.font_path, 28)
        except OSError:
            font = ImageFont.load_default()

        y_start = (self.seal_size[1] - 32) // 2

        for line in text_lines:
            bbox = font.getbbox(line)
            text_width = bbox[2] - bbox[0]
            x = (self.seal_size[0] - text_width) // 2 + 4
            draw.text((x, y_start), line, fill="red", font=font)

        save_path = os.path.join(
            'static/seals', f'officer_{officer_name}_seal.png')
        os.makedirs('static/seals', exist_ok=True)
        img.save(save_path, format="PNG")
        return save_path

    def apply_seal_to_ticket(self, ticket_path, officer_name, position=(800, 800)):
        """將印章套用到罰單圖片上"""
        seal_path = self.create_officer_seal(officer_name)
        ticket = Image.open(ticket_path)
        seal = Image.open(seal_path)
        ticket.paste(seal, position, seal)
        stamped_path = ticket_path.replace('.png', '_stamped.png')
        ticket.save(stamped_path)
        return stamped_path
