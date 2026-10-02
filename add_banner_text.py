import os
from PIL import Image, ImageDraw, ImageFont

def add_typography_to_banner():
    desktop = r"C:\Users\root\Desktop"
    banner_path = os.path.join(desktop, "studyom_banner_dark.png")
    img = Image.open(banner_path)
    draw = ImageDraw.Draw(img)
    
    # Try finding system fonts
    font_bold = None
    font_sub = None
    candidates = [
        r"C:\Windows\Fonts\segoeuib.ttf",
        r"C:\Windows\Fonts\arialbd.ttf",
        r"C:\Windows\Fonts\tahoma.ttf",
    ]
    for c in candidates:
        if os.path.exists(c):
            font_bold = ImageFont.truetype(c, 116)
            font_sub = ImageFont.truetype(c, 30)
            break
            
    if font_bold is None:
        font_bold = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        
    # Draw STÜDYO (White) and M (Royal Blue #3B5AF6)
    x = 490
    y = 135
    # STÜDYO
    draw.text((x, y), "STÜDYO", fill=(248, 250, 252), font=font_bold)
    # Measure width
    bbox = draw.textbbox((x, y), "STÜDYO", font=font_bold)
    m_x = bbox[2] + 4
    # M in royal blue
    draw.text((m_x, y), "M", fill=(54, 88, 245), font=font_bold)
    
    # Divider line
    line_y = y + 140
    for lx in range(x, x + 720):
        t = (lx - x) / 720.0
        r = int(54 * (1 - t) + 0 * t)
        g = int(88 * (1 - t) + 181 * t)
        b = int(245 * (1 - t) + 148 * t)
        draw.line([(lx, line_y), (lx, line_y + 3)], fill=(r, g, b, 230))
        
    # Subtitle
    draw.text((x + 4, line_y + 18), "FOTOĞRAFÇILIK & STÜDYO AJANDASI", fill=(148, 163, 184), font=font_sub)
    
    img.save(banner_path)
    # Also save to artifacts
    img.save(r"C:\Users\root\.gemini\antigravity\brain\a77b92f0-cb24-4f4a-a573-42ed9035a9d6\studyom_banner_dark.png")
    print("Banner updated with typography!")

if __name__ == "__main__":
    add_typography_to_banner()
