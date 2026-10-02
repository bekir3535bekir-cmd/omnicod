import os
import cv2
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

def create_squircle_mask(size, radius):
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), (size, size)], radius=radius, fill=255)
    return mask

def process_logo():
    src_path = r"C:\Users\root\.gemini\antigravity\brain\a77b92f0-cb24-4f4a-a573-42ed9035a9d6\.user_uploaded\media_1790969883426.png"
    img = cv2.imread(src_path, cv2.IMREAD_UNCHANGED)
    
    # 1. Background color detection & extraction
    # The original background is around [247, 248, 252] (BGR: 252, 248, 247)
    bg_bgr = np.array([252, 248, 247], dtype=float)
    diff = np.linalg.norm(img[:, :, :3].astype(float) - bg_bgr, axis=-1)
    
    # Soft alpha mask for anti-aliasing
    alpha = np.clip((diff - 6.0) / 8.0 * 255.0, 0, 255).astype(np.uint8)
    
    # Also in the camera lens hole, in the original image it is the background color.
    # Let's create a version where the lens is clean optical white or transparent.
    # Let's find the lens center and radius
    # The camera is in front, lens center is around x=471, y=624
    # Radius is about 92 px
    lens_center = (471, 624)
    lens_radius = 92
    
    # Create an RGBA image of the isolated foreground
    isolated = np.zeros((1024, 1024, 4), dtype=np.uint8)
    isolated[:, :, :3] = img[:, :, :3]
    isolated[:, :, 3] = alpha
    
    # Save transparent symbol
    cv2.imwrite(r"C:\Users\root\Desktop\studyom_sembol_transparent.png", isolated)
    
    # Convert to PIL for rich composition
    symbol_pil = Image.fromarray(cv2.cvtColor(isolated, cv2.COLOR_BGRA2RGBA))
    
    # Let's build a dedicated optical lens fill:
    # A lens inside the camera circle that looks like real camera optics:
    # Crisp white center with subtle cyan/blue ring, or clean white
    lens_layer = Image.new("RGBA", (1024, 1024), (0,0,0,0))
    lens_draw = ImageDraw.Draw(lens_layer)
    # Draw white lens
    cx, cy, r = 471, 624, 91
    lens_draw.ellipse([(cx-r, cy-r), (cx+r, cy+r)], fill=(255, 255, 255, 255))
    # Subtle inner reflection ring
    lens_draw.ellipse([(cx-r+8, cy-r+8), (cx+r-8, cy+r-8)], outline=(220, 235, 255, 180), width=4)
    
    # Combine lens and symbol:
    # Lens sits behind camera front, so composite lens first, then symbol over it
    symbol_with_lens = Image.alpha_composite(lens_layer, symbol_pil)
    
    desktop = r"C:\Users\root\Desktop"
    size = 1024
    squircle_radius = 224 # Apple standard ~22% curvature
    squircle_mask = create_squircle_mask(size, squircle_radius)
    
    # =========================================================================
    # VARIATION 1: "PRO DARK TITANIUM" (Derin Gece Mavisi & Arka Aydınlatmalı)
    # =========================================================================
    # Canvas
    var1 = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    var1_draw = ImageDraw.Draw(var1)
    
    # Rich Gradient Background: #0B101D at top to #030509 at bottom
    for y in range(size):
        ratio = y / size
        r_col = int(11 * (1 - ratio) + 3 * ratio)
        g_col = int(16 * (1 - ratio) + 5 * ratio)
        b_col = int(29 * (1 - ratio) + 9 * ratio)
        var1_draw.line([(0, y), (size, y)], fill=(r_col, g_col, b_col, 255))
    
    # Ambient Backlight Glow under the symbol (Teal on top right, Royal Blue on bottom left)
    glow_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_layer)
    # Blue glow behind camera
    glow_draw.ellipse([(200, 380), (740, 880)], fill=(54, 88, 245, 110))
    # Teal glow behind calendar
    glow_draw.ellipse([(380, 180), (840, 680)], fill=(0, 181, 148, 90))
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(70))
    var1 = Image.alpha_composite(var1, glow_layer)
    
    # Deep floating drop shadow for the symbol
    shadow_mask = symbol_with_lens.split()[3]
    shadow_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    shadow_layer.paste((0, 0, 0, 180), (0, 24), shadow_mask)
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(28))
    var1 = Image.alpha_composite(var1, shadow_layer)
    
    # Foreground symbol
    var1 = Image.alpha_composite(var1, symbol_with_lens)
    
    # Subtle Rim Highlight (Border)
    rim_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    rim_draw = ImageDraw.Draw(rim_layer)
    rim_draw.rounded_rectangle([(8, 8), (size-8, size-8)], radius=squircle_radius-4, outline=(255, 255, 255, 45), width=6)
    rim_draw.rounded_rectangle([(14, 14), (size-14, size-14)], radius=squircle_radius-8, outline=(54, 88, 245, 60), width=3)
    var1 = Image.alpha_composite(var1, rim_layer)
    
    # Upper Glass Reflection
    glass_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glass_draw = ImageDraw.Draw(glass_layer)
    for y in range(480):
        alpha_val = int(24 * (1 - y / 480))
        glass_draw.line([(30, y), (size-30, y)], fill=(255, 255, 255, alpha_val))
    glass_layer.putalpha(Image.composite(glass_layer.split()[3], squircle_mask, squircle_mask))
    var1 = Image.alpha_composite(var1, glass_layer)
    
    # Clip to squircle
    final_var1 = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    final_var1.paste(var1, (0, 0), squircle_mask)
    final_var1.save(os.path.join(desktop, "studyom_app_icon_dark_pro.png"))
    print("Saved: studyom_app_icon_dark_pro.png")
    
    # =========================================================================
    # VARIATION 2: "NORDIC LIGHT STUDIO" (Aydınlık Ferah Porselen Zemin)
    # =========================================================================
    var2 = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    var2_draw = ImageDraw.Draw(var2)
    
    # Crisp Light Gradient: #FFFFFF at top to #E8EEF5 at bottom
    for y in range(size):
        ratio = y / size
        r_col = int(255 * (1 - ratio) + 232 * ratio)
        g_col = int(255 * (1 - ratio) + 238 * ratio)
        b_col = int(255 * (1 - ratio) + 245 * ratio)
        var2_draw.line([(0, y), (size, y)], fill=(r_col, g_col, b_col, 255))
        
    # Soft ambient drop shadow under symbol
    shadow2 = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    shadow2.paste((20, 35, 60, 70), (0, 22), shadow_mask)
    shadow2 = shadow2.filter(ImageFilter.GaussianBlur(32))
    var2 = Image.alpha_composite(var2, shadow2)
    
    # Symbol
    var2 = Image.alpha_composite(var2, symbol_with_lens)
    
    # Light subtle inner border
    rim2 = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    rim2_draw = ImageDraw.Draw(rim2)
    rim2_draw.rounded_rectangle([(6, 6), (size-6, size-6)], radius=squircle_radius-3, outline=(0, 0, 0, 20), width=5)
    rim2_draw.rounded_rectangle([(10, 10), (size-10, size-10)], radius=squircle_radius-6, outline=(255, 255, 255, 160), width=4)
    var2 = Image.alpha_composite(var2, rim2)
    
    final_var2 = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    final_var2.paste(var2, (0, 0), squircle_mask)
    final_var2.save(os.path.join(desktop, "studyom_app_icon_nordic_light.png"))
    print("Saved: studyom_app_icon_nordic_light.png")

    # =========================================================================
    # VARIATION 3: "NEO CYBER SLATE" (Hafif Arduvaz Çerçeveli & Karbon Dokulu)
    # =========================================================================
    var3 = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    var3_draw = ImageDraw.Draw(var3)
    # Gradient: #161D2D to #0B0E17
    for y in range(size):
        ratio = y / size
        r_col = int(22 * (1 - ratio) + 11 * ratio)
        g_col = int(29 * (1 - ratio) + 14 * ratio)
        b_col = int(45 * (1 - ratio) + 23 * ratio)
        var3_draw.line([(0, y), (size, y)], fill=(r_col, g_col, b_col, 255))
        
    # Dual colored glow
    glow3 = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    g3_draw = ImageDraw.Draw(glow3)
    g3_draw.ellipse([(240, 420), (700, 840)], fill=(54, 88, 245, 140))
    g3_draw.ellipse([(420, 200), (820, 620)], fill=(0, 181, 148, 120))
    glow3 = glow3.filter(ImageFilter.GaussianBlur(60))
    var3 = Image.alpha_composite(var3, glow3)
    
    # Drop shadow
    var3 = Image.alpha_composite(var3, shadow_layer)
    var3 = Image.alpha_composite(var3, symbol_with_lens)
    
    # Electric bezel
    rim3 = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    rim3_draw = ImageDraw.Draw(rim3)
    rim3_draw.rounded_rectangle([(8, 8), (size-8, size-8)], radius=squircle_radius-4, outline=(54, 88, 245, 120), width=6)
    var3 = Image.alpha_composite(var3, rim3)
    
    final_var3 = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    final_var3.paste(var3, (0, 0), squircle_mask)
    final_var3.save(os.path.join(desktop, "studyom_app_icon_neo_slate.png"))
    print("Saved: studyom_app_icon_neo_slate.png")

    # =========================================================================
    # VARIATION 4: "FULL APP BANNER / HORIZONTAL LOGO" (Web Header & Antet)
    # =========================================================================
    # 1600x480 Horizontal Banner on Dark Slate
    h_w, h_h = 1600, 480
    h_banner = Image.new("RGBA", (h_w, h_h), (0,0,0,0))
    h_draw = ImageDraw.Draw(h_banner)
    # Rounded container for banner
    b_mask = create_squircle_mask(h_h, 36)
    for y in range(h_h):
        ratio = y / h_h
        r_col = int(14 * (1 - ratio) + 6 * ratio)
        g_col = int(20 * (1 - ratio) + 9 * ratio)
        b_col = int(35 * (1 - ratio) + 16 * ratio)
        h_draw.line([(0, y), (h_w, y)], fill=(r_col, g_col, b_col, 255))
        
    # Paste scaled symbol on the left
    scaled_sym = symbol_with_lens.resize((360, 360), Image.Resampling.LANCZOS)
    h_banner.paste(scaled_sym, (60, 60), scaled_sym)
    
    # Save Banner
    h_banner.save(os.path.join(desktop, "studyom_horizontal_brand.png"))
    print("Saved: studyom_horizontal_brand.png")
    
    # Also update Android launcher icons with the Pro Dark version (var1)
    android_res = r"C:\Users\root\Desktop\PhotoApp_Dev\android\app\src\main\res"
    mipmaps = [
        ("mipmap-xxxhdpi", 192),
        ("mipmap-xxhdpi", 144),
        ("mipmap-xhdpi", 96),
        ("mipmap-hdpi", 72),
        ("mipmap-mdpi", 48),
    ]
    for folder, sz in mipmaps:
        target_dir = os.path.join(android_res, folder)
        if os.path.exists(target_dir):
            icon_resized = final_var1.resize((sz, sz), Image.Resampling.LANCZOS)
            icon_resized.save(os.path.join(target_dir, "ic_launcher.png"))
            icon_resized.save(os.path.join(target_dir, "ic_launcher_round.png"))
            
    # Web icons
    web_public = r"C:\Users\root\Desktop\PhotoApp_Dev\public"
    if os.path.exists(web_public):
        final_var1.resize((64, 64), Image.Resampling.LANCZOS).save(os.path.join(web_public, "favicon.png"))
        final_var1.resize((192, 192), Image.Resampling.LANCZOS).save(os.path.join(web_public, "logo192.png"))
        final_var1.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(web_public, "logo512.png"))
        
    print("ALL APP BACKGROUND VARIATIONS CREATED SUCCESSFULLY!")

if __name__ == "__main__":
    process_logo()
