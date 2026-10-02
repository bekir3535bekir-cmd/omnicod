import os
import cv2
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

def render_flawless_icons():
    src_path = r"C:\Users\root\.gemini\antigravity\brain\a77b92f0-cb24-4f4a-a573-42ed9035a9d6\.user_uploaded\media_1790969883426.png"
    img_bgr = cv2.imread(src_path, cv2.IMREAD_UNCHANGED)
    
    # 1. Cleanly separate foreground from the #F7F8FC background
    bg_bgr = np.array([252, 248, 247], dtype=float)
    diff = np.linalg.norm(img_bgr[:, :, :3].astype(float) - bg_bgr, axis=-1)
    
    # Anti-aliased alpha mask for the outer shapes
    # Transition zone between 4 and 14 for razor sharp, silky smooth edges
    alpha = np.clip((diff - 4.0) / 10.0 * 255.0, 0, 255).astype(np.uint8)
    
    # The lens circle center is at (471, 624), radius ~91 px
    # Let's create two versions of the symbol:
    # Version A: Lens is WHITE (looks iconic and visible on dark backgrounds)
    # Version B: Lens is CUTOUT (transparent)
    
    # Let's create an RGBA image where camera & calendar are preserved
    # And lens hole is filled with solid white #FFFFFF
    h, w = 1024, 1024
    symbol_rgba = np.zeros((h, w, 4), dtype=np.uint8)
    symbol_rgba[:, :, 0] = img_bgr[:, :, 2] # R
    symbol_rgba[:, :, 1] = img_bgr[:, :, 1] # G
    symbol_rgba[:, :, 2] = img_bgr[:, :, 0] # B
    symbol_rgba[:, :, 3] = alpha
    
    # Create the white lens element
    lens_mask = np.zeros((h, w), dtype=np.uint8)
    cv2.circle(lens_mask, (471, 624), 92, 255, -1, cv2.LINE_AA)
    
    # Symbol with White Lens
    sym_white_lens = symbol_rgba.copy()
    # Where lens_mask is 255, set color to White #FFFFFF and alpha 255
    sym_white_lens[lens_mask > 200, 0] = 255
    sym_white_lens[lens_mask > 200, 1] = 255
    sym_white_lens[lens_mask > 200, 2] = 255
    sym_white_lens[lens_mask > 200, 3] = 255
    
    pil_sym = Image.fromarray(sym_white_lens)
    
    # Save pure transparent symbol
    desktop = r"C:\Users\root\Desktop"
    pil_sym.save(os.path.join(desktop, "studyom_logo_transparent.png"))
    print("Saved transparent symbol")
    
    # Function to create clean squircle canvas
    def create_squircle_canvas(radius=224):
        mask = Image.new('L', (w, h), 0)
        draw = ImageDraw.Draw(mask)
        draw.rounded_rectangle([(0, 0), (w, h)], radius=radius, fill=255)
        return mask

    squircle_mask = create_squircle_canvas(224)
    
    # =========================================================================
    # OPTION 1: "DARK TITANIUM PRO" (Karanlık Derin Gece & Canlı Arka Işık)
    # =========================================================================
    bg_dark = Image.new("RGBA", (w, h), (0, 0, 0, 255))
    d_draw = ImageDraw.Draw(bg_dark)
    
    # Deep midnight slate gradient: #0D1424 (top) -> #05080F (bottom)
    for y in range(h):
        t = y / h
        r = int(13 * (1 - t) + 4 * t)
        g = int(20 * (1 - t) + 7 * t)
        b = int(36 * (1 - t) + 15 * t)
        d_draw.line([(0, y), (w, y)], fill=(r, g, b, 255))
        
    # Ambient Backlight Glow (Teal glow behind calendar, Royal Blue glow behind camera)
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    # Teal backlight top-right
    glow_draw.ellipse([(380, 160), (840, 640)], fill=(0, 181, 148, 120))
    # Royal blue backlight bottom-left
    glow_draw.ellipse([(160, 360), (740, 880)], fill=(54, 88, 245, 140))
    glow = glow.filter(ImageFilter.GaussianBlur(75))
    bg_dark = Image.alpha_composite(bg_dark, glow)
    
    # 3D Floating Shadow under symbol
    shadow_map = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    shadow_map.paste((0, 0, 0, 190), (0, 26), pil_sym.split()[3])
    shadow_map = shadow_map.filter(ImageFilter.GaussianBlur(30))
    bg_dark = Image.alpha_composite(bg_dark, shadow_map)
    
    # Overlay Symbol
    bg_dark = Image.alpha_composite(bg_dark, pil_sym)
    
    # Inner border / Glass bevel
    bevel = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    b_draw = ImageDraw.Draw(bevel)
    b_draw.rounded_rectangle([(3, 3), (w-3, h-3)], radius=222, outline=(255, 255, 255, 35), width=4)
    b_draw.rounded_rectangle([(7, 7), (w-7, h-7)], radius=218, outline=(54, 88, 245, 55), width=3)
    bg_dark = Image.alpha_composite(bg_dark, bevel)
    
    # Mask to squircle
    final_dark = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    final_dark.paste(bg_dark, (0, 0), squircle_mask)
    final_dark.save(os.path.join(desktop, "studyom_app_icon_dark.png"))
    print("Saved studyom_app_icon_dark.png")
    
    # =========================================================================
    # OPTION 2: "NORDIC STUDIO WHITE" (Aydınlık Ferah Porselen Zemin)
    # =========================================================================
    bg_light = Image.new("RGBA", (w, h), (0, 0, 0, 255))
    l_draw = ImageDraw.Draw(bg_light)
    # Smooth light gradient: #FFFFFF -> #EDF2F8
    for y in range(h):
        t = y / h
        r = int(255 * (1 - t) + 237 * t)
        g = int(255 * (1 - t) + 242 * t)
        b = int(255 * (1 - t) + 248 * t)
        l_draw.line([(0, y), (w, y)], fill=(r, g, b, 255))
        
    # Soft ambient drop shadow for white theme
    shadow_light = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    shadow_light.paste((18, 32, 58, 65), (0, 22), pil_sym.split()[3])
    shadow_light = shadow_light.filter(ImageFilter.GaussianBlur(28))
    bg_light = Image.alpha_composite(bg_light, shadow_light)
    
    # Symbol
    bg_light = Image.alpha_composite(bg_light, pil_sym)
    
    # Light subtle inner border
    bevel_light = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    bl_draw = ImageDraw.Draw(bevel_light)
    bl_draw.rounded_rectangle([(3, 3), (w-3, h-3)], radius=222, outline=(0, 0, 0, 18), width=3)
    bl_draw.rounded_rectangle([(6, 6), (w-6, h-6)], radius=219, outline=(255, 255, 255, 220), width=4)
    bg_light = Image.alpha_composite(bg_light, bevel_light)
    
    final_light = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    final_light.paste(bg_light, (0, 0), squircle_mask)
    final_light.save(os.path.join(desktop, "studyom_app_icon_light.png"))
    print("Saved studyom_app_icon_light.png")

    # =========================================================================
    # OPTION 3: "ROYAL SAPPHIRE VIBRANT" (Mavi & Cam Efektli Lüks Arka Plan)
    # =========================================================================
    bg_blue = Image.new("RGBA", (w, h), (0, 0, 0, 255))
    b_draw = ImageDraw.Draw(bg_blue)
    # Gradient: #1E293B -> #0F172A
    for y in range(h):
        t = y / h
        r = int(24 * (1 - t) + 10 * t)
        g = int(32 * (1 - t) + 16 * t)
        b = int(52 * (1 - t) + 28 * t)
        b_draw.line([(0, y), (w, y)], fill=(r, g, b, 255))
        
    # Vibrant centered glow
    glow_v = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gv_draw = ImageDraw.Draw(glow_v)
    gv_draw.ellipse([(200, 200), (824, 824)], fill=(54, 88, 245, 160))
    gv_draw.ellipse([(350, 150), (850, 650)], fill=(0, 181, 148, 140))
    glow_v = glow_v.filter(ImageFilter.GaussianBlur(85))
    bg_blue = Image.alpha_composite(bg_blue, glow_v)
    
    # Shadow & symbol
    bg_blue = Image.alpha_composite(bg_blue, shadow_map)
    bg_blue = Image.alpha_composite(bg_blue, pil_sym)
    
    final_blue = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    final_blue.paste(bg_blue, (0, 0), squircle_mask)
    final_blue.save(os.path.join(desktop, "studyom_app_icon_vibrant.png"))
    print("Saved studyom_app_icon_vibrant.png")

    # =========================================================================
    # OPTION 4: HORIZONTAL BRAND BANNER (Web ve App Başlığı İçin)
    # =========================================================================
    bw, bh = 1600, 480
    banner = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
    b_draw = ImageDraw.Draw(banner)
    
    # Background
    for y in range(bh):
        t = y / bh
        r = int(13 * (1 - t) + 4 * t)
        g = int(20 * (1 - t) + 7 * t)
        b = int(36 * (1 - t) + 15 * t)
        b_draw.line([(0, y), (bw, y)], fill=(r, g, b, 255))
        
    # Rounded banner border
    b_draw.rounded_rectangle([(2, 2), (bw-2, bh-2)], radius=24, outline=(255, 255, 255, 25), width=2)
    
    # Scale symbol to 360x360
    sym_scaled = pil_sym.resize((360, 360), Image.Resampling.LANCZOS)
    
    # Drop shadow for banner symbol
    sym_shadow = Image.new("RGBA", (360, 360), (0, 0, 0, 0))
    sym_shadow.paste((0, 0, 0, 160), (0, 12), sym_scaled.split()[3])
    sym_shadow = sym_shadow.filter(ImageFilter.GaussianBlur(16))
    
    banner.alpha_composite(sym_shadow, (70, 60))
    banner.alpha_composite(sym_scaled, (70, 60))
    
    banner.save(os.path.join(desktop, "studyom_banner_dark.png"))
    print("Saved studyom_banner_dark.png")
    
    # Update Android Launcher Icons with the Dark Pro Icon
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
            final_dark.resize((sz, sz), Image.Resampling.LANCZOS).save(os.path.join(target_dir, "ic_launcher.png"))
            final_dark.resize((sz, sz), Image.Resampling.LANCZOS).save(os.path.join(target_dir, "ic_launcher_round.png"))
            
    # Web icons
    web_public = r"C:\Users\root\Desktop\PhotoApp_Dev\public"
    if os.path.exists(web_public):
        final_dark.resize((64, 64), Image.Resampling.LANCZOS).save(os.path.join(web_public, "favicon.png"))
        final_dark.resize((192, 192), Image.Resampling.LANCZOS).save(os.path.join(web_public, "logo192.png"))
        final_dark.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(web_public, "logo512.png"))

    print("ALL APP BACKGROUNDS BUILT FLAWLESSLY!")

if __name__ == "__main__":
    render_flawless_icons()
