import os
import cv2
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

def main():
    src_path = r"C:\Users\root\.gemini\antigravity\brain\a77b92f0-cb24-4f4a-a573-42ed9035a9d6\.user_uploaded\media_1790969883426.png"
    img = cv2.imread(src_path, cv2.IMREAD_UNCHANGED)
    h, w = img.shape[:2]

    # 1. Precise FloodFill to find the exact OUTSIDE background
    mask = np.zeros((h+2, w+2), np.uint8)
    cv2.floodFill(img[:, :, :3].copy(), mask, (0, 0), (0, 0, 0), (14, 14, 14), (14, 14, 14), cv2.FLOODFILL_MASK_ONLY | (255 << 8))
    outside_bg = mask[1:-1, 1:-1]

    # Calculate color difference from background for smooth antialiased outer edge
    bg_bgr = np.array([252, 248, 247], dtype=float)
    diff = np.linalg.norm(img[:, :, :3].astype(float) - bg_bgr, axis=-1)
    
    # Base alpha: 255 everywhere inside the symbol (including the lens!)
    alpha = np.ones((h, w), dtype=np.uint8) * 255
    # For outside background pixels, make transparent with antialiased transition
    edge_alpha = np.clip((diff - 4.0) / 10.0 * 255.0, 0, 255).astype(np.uint8)
    alpha[outside_bg == 255] = edge_alpha[outside_bg == 255]

    # Build the RGBA symbol (Camera + Calendar + Original White Lens)
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[:, :, 0] = img[:, :, 2] # R
    rgba[:, :, 1] = img[:, :, 1] # G
    rgba[:, :, 2] = img[:, :, 0] # B
    rgba[:, :, 3] = alpha

    # Save transparent symbol
    desktop = r"C:\Users\root\Desktop"
    pil_sym = Image.fromarray(rgba)
    pil_sym.save(os.path.join(desktop, "studyom_logo_transparent.png"))
    print("Saved: studyom_logo_transparent.png")

    # Helper: smooth squircle mask
    def get_squircle_mask(size=1024, radius=224):
        # 2x supersampling for perfect antialiased corners
        s2 = size * 2
        r2 = radius * 2
        mask = Image.new('L', (s2, s2), 0)
        draw = ImageDraw.Draw(mask)
        draw.rounded_rectangle([(0, 0), (s2, s2)], radius=r2, fill=255)
        return mask.resize((size, size), Image.Resampling.LANCZOS)

    squircle = get_squircle_mask(1024, 224)

    # =========================================================================
    # VARIATION 1: "DARK TITANIUM PRO" (Koyu Gece Laciverti & Çift Arka Işık)
    # =========================================================================
    v1 = Image.new("RGBA", (w, h), (0, 0, 0, 255))
    v1_draw = ImageDraw.Draw(v1)
    
    # Premium dark gradient: #0C1220 to #04070D
    for y in range(h):
        t = y / h
        r = int(12 * (1 - t) + 4 * t)
        g = int(18 * (1 - t) + 7 * t)
        b = int(32 * (1 - t) + 13 * t)
        v1_draw.line([(0, y), (w, y)], fill=(r, g, b, 255))

    # Dual Ambient Backlight Glow:
    # 1. Vibrant Teal Glow behind Calendar (top-right)
    # 2. Electric Royal Blue Glow behind Camera (bottom-left)
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    g_draw = ImageDraw.Draw(glow)
    g_draw.ellipse([(360, 160), (840, 640)], fill=(0, 181, 148, 140))
    g_draw.ellipse([(160, 360), (740, 880)], fill=(54, 88, 245, 160))
    glow = glow.filter(ImageFilter.GaussianBlur(80))
    v1 = Image.alpha_composite(v1, glow)

    # Floating 3D Drop Shadow under symbol
    shadow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    shadow.paste((0, 0, 0, 200), (0, 28), pil_sym.split()[3])
    shadow = shadow.filter(ImageFilter.GaussianBlur(32))
    v1 = Image.alpha_composite(v1, shadow)

    # Composite Symbol
    v1 = Image.alpha_composite(v1, pil_sym)

    # Subtle Frosted Rim Bevel
    bevel = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    b_draw = ImageDraw.Draw(bevel)
    b_draw.rounded_rectangle([(4, 4), (w-4, h-4)], radius=220, outline=(255, 255, 255, 40), width=4)
    b_draw.rounded_rectangle([(8, 8), (w-8, h-8)], radius=216, outline=(54, 88, 245, 60), width=3)
    v1 = Image.alpha_composite(v1, bevel)

    # Subtle upper glass sheen
    sheen = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(sheen)
    for y in range(400):
        val = int(22 * (1 - y / 400))
        s_draw.line([(0, y), (w, y)], fill=(255, 255, 255, val))
    v1 = Image.alpha_composite(v1, sheen)

    # Apply squircle mask
    final_v1 = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    final_v1.paste(v1, (0, 0), squircle)
    final_v1.save(os.path.join(desktop, "studyom_app_icon_dark.png"))
    print("Saved: studyom_app_icon_dark.png")

    # =========================================================================
    # VARIATION 2: "NORDIC STUDIO LIGHT" (Aydınlık Ferah Porselen Zemin)
    # =========================================================================
    v2 = Image.new("RGBA", (w, h), (0, 0, 0, 255))
    v2_draw = ImageDraw.Draw(v2)
    for y in range(h):
        t = y / h
        r = int(255 * (1 - t) + 238 * t)
        g = int(255 * (1 - t) + 243 * t)
        b = int(255 * (1 - t) + 248 * t)
        v2_draw.line([(0, y), (w, y)], fill=(r, g, b, 255))

    # Soft ambient drop shadow for light theme
    s2 = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    s2.paste((18, 32, 58, 70), (0, 24), pil_sym.split()[3])
    s2 = s2.filter(ImageFilter.GaussianBlur(30))
    v2 = Image.alpha_composite(v2, s2)
    v2 = Image.alpha_composite(v2, pil_sym)

    # Delicate light border
    b2 = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    b2_draw = ImageDraw.Draw(b2)
    b2_draw.rounded_rectangle([(4, 4), (w-4, h-4)], radius=220, outline=(0, 0, 0, 22), width=3)
    b2_draw.rounded_rectangle([(7, 7), (w-7, h-7)], radius=217, outline=(255, 255, 255, 240), width=4)
    v2 = Image.alpha_composite(v2, b2)

    final_v2 = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    final_v2.paste(v2, (0, 0), squircle)
    final_v2.save(os.path.join(desktop, "studyom_app_icon_light.png"))
    print("Saved: studyom_app_icon_light.png")

    # =========================================================================
    # VARIATION 3: "ROYAL LIQUID GLASS" (Cam Dokulu & Canlı Elektrik Vurgu)
    # =========================================================================
    v3 = Image.new("RGBA", (w, h), (0, 0, 0, 255))
    v3_draw = ImageDraw.Draw(v3)
    for y in range(h):
        t = y / h
        r = int(18 * (1 - t) + 8 * t)
        g = int(26 * (1 - t) + 12 * t)
        b = int(48 * (1 - t) + 24 * t)
        v3_draw.line([(0, y), (w, y)], fill=(r, g, b, 255))

    # Radial central backlight
    radial_glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    rg_draw = ImageDraw.Draw(radial_glow)
    rg_draw.ellipse([(180, 180), (844, 844)], fill=(54, 88, 245, 170))
    rg_draw.ellipse([(340, 140), (860, 660)], fill=(0, 181, 148, 160))
    radial_glow = radial_glow.filter(ImageFilter.GaussianBlur(95))
    v3 = Image.alpha_composite(v3, radial_glow)

    v3 = Image.alpha_composite(v3, shadow)
    v3 = Image.alpha_composite(v3, pil_sym)

    # Vibrant glowing neon rim
    b3 = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    b3_draw = ImageDraw.Draw(b3)
    b3_draw.rounded_rectangle([(4, 4), (w-4, h-4)], radius=220, outline=(54, 88, 245, 120), width=5)
    v3 = Image.alpha_composite(v3, b3)

    final_v3 = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    final_v3.paste(v3, (0, 0), squircle)
    final_v3.save(os.path.join(desktop, "studyom_app_icon_vibrant.png"))
    print("Saved: studyom_app_icon_vibrant.png")

    # =========================================================================
    # VARIATION 4: HORIZONTAL BRAND BANNER (1600x480)
    # =========================================================================
    bw, bh = 1600, 480
    banner = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
    b_draw = ImageDraw.Draw(banner)
    
    # Dark rounded container
    for y in range(bh):
        t = y / bh
        r = int(12 * (1 - t) + 4 * t)
        g = int(18 * (1 - t) + 7 * t)
        b = int(32 * (1 - t) + 13 * t)
        b_draw.line([(0, y), (bw, y)], fill=(r, g, b, 255))
        
    b_draw.rounded_rectangle([(2, 2), (bw-2, bh-2)], radius=24, outline=(255, 255, 255, 25), width=2)
    
    # Scale symbol to 360x360
    sym_scaled = pil_sym.resize((360, 360), Image.Resampling.LANCZOS)
    
    # Shadow for banner symbol
    sym_shadow = Image.new("RGBA", (360, 360), (0, 0, 0, 0))
    sym_shadow.paste((0, 0, 0, 180), (0, 14), sym_scaled.split()[3])
    sym_shadow = sym_shadow.filter(ImageFilter.GaussianBlur(18))
    
    banner.alpha_composite(sym_shadow, (70, 60))
    banner.alpha_composite(sym_scaled, (70, 60))
    
    # Save Banner
    banner.save(os.path.join(desktop, "studyom_banner_dark.png"))
    print("Saved: studyom_banner_dark.png")

    # Also update Android launcher icons with the final dark pro icon
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
            final_v1.resize((sz, sz), Image.Resampling.LANCZOS).save(os.path.join(target_dir, "ic_launcher.png"))
            final_v1.resize((sz, sz), Image.Resampling.LANCZOS).save(os.path.join(target_dir, "ic_launcher_round.png"))

    # Web public icons
    web_public = r"C:\Users\root\Desktop\PhotoApp_Dev\public"
    if os.path.exists(web_public):
        final_v1.resize((64, 64), Image.Resampling.LANCZOS).save(os.path.join(web_public, "favicon.png"))
        final_v1.resize((192, 192), Image.Resampling.LANCZOS).save(os.path.join(web_public, "logo192.png"))
        final_v1.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(web_public, "logo512.png"))

    print("ALL 4 VARIATIONS CREATED WITH MATHEMATICAL PRECISION!")

if __name__ == "__main__":
    main()
