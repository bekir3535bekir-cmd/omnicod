import os
import sys
from PyQt6.QtCore import QByteArray, QRectF
from PyQt6.QtGui import QGuiApplication, QImage, QPainter, QColor
from PyQt6.QtSvg import QSvgRenderer

# Base SVG for the App Icon (1024x1024)
ICON_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0E1626"/>
      <stop offset="50%" stop-color="#080C15"/>
      <stop offset="100%" stop-color="#04060A"/>
    </linearGradient>

    <!-- Bezel Border Gradient -->
    <linearGradient id="bezelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.6"/>
      <stop offset="35%" stop-color="#1E293B" stop-opacity="0.4"/>
      <stop offset="70%" stop-color="#38BDF8" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#0F172A" stop-opacity="0.8"/>
    </linearGradient>

    <!-- Primary Blade Gradient -->
    <linearGradient id="bladeGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60A5FA"/>
      <stop offset="60%" stop-color="#2563EB"/>
      <stop offset="100%" stop-color="#1D4ED8"/>
    </linearGradient>

    <linearGradient id="bladeGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8"/>
      <stop offset="50%" stop-color="#3B82F6"/>
      <stop offset="100%" stop-color="#1E40AF"/>
    </linearGradient>

    <!-- Ring Dial Gradient -->
    <linearGradient id="dialGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#1E3A8A"/>
      <stop offset="50%" stop-color="#38BDF8"/>
      <stop offset="100%" stop-color="#60A5FA"/>
    </linearGradient>

    <!-- Golden Hour Glow Radial -->
    <radialGradient id="goldenHourGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1"/>
      <stop offset="25%" stop-color="#93C5FD" stop-opacity="0.9"/>
      <stop offset="55%" stop-color="#3B82F6" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#1D4ED8" stop-opacity="0"/>
    </radialGradient>

    <!-- Lens Glass Reflection -->
    <linearGradient id="glassReflect" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.12"/>
      <stop offset="40%" stop-color="#FFFFFF" stop-opacity="0.02"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>

    <!-- Filter for subtle shadow -->
    <filter id="bladeShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.7"/>
    </filter>
  </defs>

  <!-- Container Squircle Background -->
  <rect x="24" y="24" width="976" height="976" rx="224" fill="url(#bgGrad)" stroke="url(#bezelGrad)" stroke-width="12"/>

  <!-- Glass Highlight Upper Arc -->
  <rect x="36" y="36" width="952" height="476" rx="212" fill="url(#glassReflect)"/>

  <!-- ================= LOGO EMBLEM GROUP ================= -->
  <g transform="translate(512, 512)">

    <!-- 1. VIEWFINDER FOCUS BRACKETS (4 Corners) -->
    <g stroke="#94A3B8" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="0.38">
      <!-- Top Left -->
      <path d="M -300 -240 L -300 -300 L -240 -300" />
      <!-- Top Right -->
      <path d="M 300 -240 L 300 -300 L 240 -300" />
      <!-- Bottom Right -->
      <path d="M 300 240 L 300 300 L 240 300" />
      <!-- Bottom Left -->
      <path d="M -300 240 L -300 300 L -240 300" />
    </g>

    <!-- 2. 12-HOUR APPOINTMENT CHRONO DIAL (Zaman & Ajanda Döngüsü) -->
    <!-- Dial Ring -->
    <circle cx="0" cy="0" r="340" stroke="url(#dialGrad)" stroke-width="4" stroke-dasharray="8 14" opacity="0.55"/>
    <circle cx="0" cy="0" r="365" stroke="#3B82F6" stroke-width="2" opacity="0.25"/>

    <!-- 12 Hour Appointment Dots -->
    <!-- 12:00 --> <circle cx="0" cy="-340" r="10" fill="#60A5FA" />
    <!-- 01:00 --> <circle cx="170" cy="-294" r="6" fill="#38BDF8" opacity="0.8"/>
    <!-- 02:00 --> <circle cx="294" cy="-170" r="6" fill="#38BDF8" opacity="0.8"/>
    <!-- 03:00 --> <circle cx="340" cy="0" r="10" fill="#60A5FA" />
    <!-- 04:00 --> <circle cx="294" cy="170" r="6" fill="#38BDF8" opacity="0.8"/>
    <!-- 05:00 --> <circle cx="170" cy="294" r="6" fill="#38BDF8" opacity="0.8"/>
    <!-- 06:00 --> <circle cx="0" cy="340" r="10" fill="#60A5FA" />
    <!-- 07:00 --> <circle cx="-170" cy="294" r="6" fill="#38BDF8" opacity="0.8"/>
    <!-- 08:00 --> <circle cx="-294" cy="170" r="6" fill="#38BDF8" opacity="0.8"/>
    <!-- 09:00 --> <circle cx="-340" cy="0" r="10" fill="#60A5FA" />
    <!-- 10:00 --> <circle cx="-294" cy="-170" r="6" fill="#38BDF8" opacity="0.8"/>
    <!-- 11:00 --> <circle cx="-170" cy="-294" r="6" fill="#38BDF8" opacity="0.8"/>

    <!-- Outer Aperture Support Ring -->
    <circle cx="0" cy="0" r="275" stroke="#1E3A8A" stroke-width="14" opacity="0.5"/>
    <circle cx="0" cy="0" r="275" stroke="#38BDF8" stroke-width="3" opacity="0.7"/>

    <!-- 3. SIX INTERLOCKING APERTURE BLADES (Diyafram Kanatları) -->
    <g filter="url(#bladeShadow)">
      <!-- Blade 0 deg -->
      <path d="M 0 -260 L 140 -220 C 180 -140, 200 -80, 160 0 L 70 -50 Z" fill="url(#bladeGrad1)"/>
      <!-- Blade 60 deg -->
      <path d="M 0 -260 L 140 -220 C 180 -140, 200 -80, 160 0 L 70 -50 Z" fill="url(#bladeGrad2)" transform="rotate(60)"/>
      <!-- Blade 120 deg -->
      <path d="M 0 -260 L 140 -220 C 180 -140, 200 -80, 160 0 L 70 -50 Z" fill="url(#bladeGrad1)" transform="rotate(120)"/>
      <!-- Blade 180 deg -->
      <path d="M 0 -260 L 140 -220 C 180 -140, 200 -80, 160 0 L 70 -50 Z" fill="url(#bladeGrad2)" transform="rotate(180)"/>
      <!-- Blade 240 deg -->
      <path d="M 0 -260 L 140 -220 C 180 -140, 200 -80, 160 0 L 70 -50 Z" fill="url(#bladeGrad1)" transform="rotate(240)"/>
      <!-- Blade 300 deg -->
      <path d="M 0 -260 L 140 -220 C 180 -140, 200 -80, 160 0 L 70 -50 Z" fill="url(#bladeGrad2)" transform="rotate(300)"/>
    </g>

    <!-- Blade Crisp Outlines -->
    <g stroke="#93C5FD" stroke-width="2.5" stroke-linecap="round" opacity="0.6">
      <path d="M 0 -260 L 140 -220" />
      <path d="M 0 -260 L 140 -220" transform="rotate(60)"/>
      <path d="M 0 -260 L 140 -220" transform="rotate(120)"/>
      <path d="M 0 -260 L 140 -220" transform="rotate(180)"/>
      <path d="M 0 -260 L 140 -220" transform="rotate(240)"/>
      <path d="M 0 -260 L 140 -220" transform="rotate(300)"/>
    </g>

    <!-- 4. INNER CALENDAR & AGENDA MATRIX (4 Planlama Segmenti) -->
    <g transform="rotate(45)">
      <rect x="-95" y="-95" width="190" height="190" rx="42" fill="#080E1A" stroke="#38BDF8" stroke-width="4.5"/>
      <!-- Grid Lines -->
      <line x1="-95" y1="0" x2="95" y2="0" stroke="#1E3A8A" stroke-width="3"/>
      <line x1="0" y1="-95" x2="0" y2="95" stroke="#1E3A8A" stroke-width="3"/>
      <!-- 4 Scheduled Booking Badges in the Calendar -->
      <circle cx="-46" cy="-46" r="10" fill="#3B82F6" />
      <circle cx="46" cy="-46" r="10" fill="#60A5FA" />
      <circle cx="46" cy="46" r="10" fill="#38BDF8" />
      <circle cx="-46" cy="46" r="10" fill="#2563EB" />
    </g>

    <!-- 5. GOLDEN HOUR RADIANT CORE (Altın Saat & Odak Güneşi) -->
    <circle cx="0" cy="0" r="120" fill="url(#goldenHourGlow)"/>
    <!-- Center Catchlight Sparkle -->
    <circle cx="0" cy="0" r="28" fill="#FFFFFF"/>
    <circle cx="0" cy="0" r="12" fill="#1D4ED8"/>

    <!-- Subtle Optical Flare Crosshair -->
    <g stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.85">
      <line x1="-50" y1="0" x2="-22" y2="0"/>
      <line x1="22" y1="0" x2="50" y2="0"/>
      <line x1="0" y1="-50" x2="0" y2="-22"/>
      <line x1="0" y1="22" x2="0" y2="50"/>
    </g>
  </g>
</svg>"""

# Transparent Emblem SVG (Just the mark, without squircle background)
EMBLEM_TRANSPARENT_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <linearGradient id="bladeGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60A5FA"/>
      <stop offset="60%" stop-color="#2563EB"/>
      <stop offset="100%" stop-color="#1D4ED8"/>
    </linearGradient>
    <linearGradient id="bladeGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8"/>
      <stop offset="50%" stop-color="#3B82F6"/>
      <stop offset="100%" stop-color="#1E40AF"/>
    </linearGradient>
    <linearGradient id="dialGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#1E3A8A"/>
      <stop offset="50%" stop-color="#38BDF8"/>
      <stop offset="100%" stop-color="#60A5FA"/>
    </linearGradient>
    <radialGradient id="goldenHourGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1"/>
      <stop offset="25%" stop-color="#93C5FD" stop-opacity="0.9"/>
      <stop offset="55%" stop-color="#3B82F6" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#1D4ED8" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <g transform="translate(512, 512)">
    <!-- 1. VIEWFINDER FOCUS BRACKETS -->
    <g stroke="#94A3B8" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.6">
      <path d="M -340 -280 L -340 -340 L -280 -340" />
      <path d="M 340 -280 L 340 -340 L 280 -340" />
      <path d="M 340 280 L 340 340 L 280 340" />
      <path d="M -340 280 L -340 340 L -280 340" />
    </g>

    <!-- 2. 12-HOUR APPOINTMENT DIAL -->
    <circle cx="0" cy="0" r="340" stroke="url(#dialGrad)" stroke-width="4" stroke-dasharray="8 14" opacity="0.75"/>
    <circle cx="0" cy="-340" r="11" fill="#60A5FA" />
    <circle cx="170" cy="-294" r="7" fill="#38BDF8" opacity="0.85"/>
    <circle cx="294" cy="-170" r="7" fill="#38BDF8" opacity="0.85"/>
    <circle cx="340" cy="0" r="11" fill="#60A5FA" />
    <circle cx="294" cy="170" r="7" fill="#38BDF8" opacity="0.85"/>
    <circle cx="170" cy="294" r="7" fill="#38BDF8" opacity="0.85"/>
    <circle cx="0" cy="340" r="11" fill="#60A5FA" />
    <circle cx="-170" cy="294" r="7" fill="#38BDF8" opacity="0.85"/>
    <circle cx="-294" cy="170" r="7" fill="#38BDF8" opacity="0.85"/>
    <circle cx="-340" cy="0" r="11" fill="#60A5FA" />
    <circle cx="-294" cy="-170" r="7" fill="#38BDF8" opacity="0.85"/>
    <circle cx="-170" cy="-294" r="7" fill="#38BDF8" opacity="0.85"/>

    <!-- Support Ring -->
    <circle cx="0" cy="0" r="275" stroke="#38BDF8" stroke-width="5" opacity="0.8"/>

    <!-- 3. SIX INTERLOCKING APERTURE BLADES -->
    <g>
      <path d="M 0 -260 L 140 -220 C 180 -140, 200 -80, 160 0 L 70 -50 Z" fill="url(#bladeGrad1)"/>
      <path d="M 0 -260 L 140 -220 C 180 -140, 200 -80, 160 0 L 70 -50 Z" fill="url(#bladeGrad2)" transform="rotate(60)"/>
      <path d="M 0 -260 L 140 -220 C 180 -140, 200 -80, 160 0 L 70 -50 Z" fill="url(#bladeGrad1)" transform="rotate(120)"/>
      <path d="M 0 -260 L 140 -220 C 180 -140, 200 -80, 160 0 L 70 -50 Z" fill="url(#bladeGrad2)" transform="rotate(180)"/>
      <path d="M 0 -260 L 140 -220 C 180 -140, 200 -80, 160 0 L 70 -50 Z" fill="url(#bladeGrad1)" transform="rotate(240)"/>
      <path d="M 0 -260 L 140 -220 C 180 -140, 200 -80, 160 0 L 70 -50 Z" fill="url(#bladeGrad2)" transform="rotate(300)"/>
    </g>

    <!-- Outlines -->
    <g stroke="#93C5FD" stroke-width="3" stroke-linecap="round" opacity="0.8">
      <path d="M 0 -260 L 140 -220" />
      <path d="M 0 -260 L 140 -220" transform="rotate(60)"/>
      <path d="M 0 -260 L 140 -220" transform="rotate(120)"/>
      <path d="M 0 -260 L 140 -220" transform="rotate(180)"/>
      <path d="M 0 -260 L 140 -220" transform="rotate(240)"/>
      <path d="M 0 -260 L 140 -220" transform="rotate(300)"/>
    </g>

    <!-- 4. INNER CALENDAR MATRIX -->
    <g transform="rotate(45)">
      <rect x="-95" y="-95" width="190" height="190" rx="42" fill="#080E1A" stroke="#38BDF8" stroke-width="5"/>
      <line x1="-95" y1="0" x2="95" y2="0" stroke="#1E3A8A" stroke-width="3"/>
      <line x1="0" y1="-95" x2="0" y2="95" stroke="#1E3A8A" stroke-width="3"/>
      <circle cx="-46" cy="-46" r="10" fill="#3B82F6" />
      <circle cx="46" cy="-46" r="10" fill="#60A5FA" />
      <circle cx="46" cy="46" r="10" fill="#38BDF8" />
      <circle cx="-46" cy="46" r="10" fill="#2563EB" />
    </g>

    <!-- 5. GOLDEN HOUR GLOW -->
    <circle cx="0" cy="0" r="120" fill="url(#goldenHourGlow)"/>
    <circle cx="0" cy="0" r="28" fill="#FFFFFF"/>
    <circle cx="0" cy="0" r="12" fill="#1D4ED8"/>

    <g stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round">
      <line x1="-50" y1="0" x2="-22" y2="0"/>
      <line x1="22" y1="0" x2="50" y2="0"/>
      <line x1="0" y1="-50" x2="0" y2="-22"/>
      <line x1="0" y1="22" x2="0" y2="50"/>
    </g>
  </g>
</svg>"""

# Horizontal Dark Background Logo (1600x480)
HORIZONTAL_DARK_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 480" width="1600" height="480">
  <defs>
    <linearGradient id="hBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0E1626"/>
      <stop offset="100%" stop-color="#04060A"/>
    </linearGradient>
    <linearGradient id="bladeGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60A5FA"/>
      <stop offset="60%" stop-color="#2563EB"/>
      <stop offset="100%" stop-color="#1D4ED8"/>
    </linearGradient>
    <linearGradient id="bladeGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8"/>
      <stop offset="50%" stop-color="#3B82F6"/>
      <stop offset="100%" stop-color="#1E40AF"/>
    </linearGradient>
    <linearGradient id="dialGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#1E3A8A"/>
      <stop offset="50%" stop-color="#38BDF8"/>
      <stop offset="100%" stop-color="#60A5FA"/>
    </linearGradient>
    <radialGradient id="goldenHourGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1"/>
      <stop offset="25%" stop-color="#93C5FD" stop-opacity="0.9"/>
      <stop offset="55%" stop-color="#3B82F6" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#1D4ED8" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="1600" height="480" fill="url(#hBgGrad)" rx="24"/>

  <!-- Left Emblem (Scale ~0.48 to fit 380x380 in 480 height) -->
  <g transform="translate(240, 240) scale(0.48)">
    <g stroke="#94A3B8" stroke-width="8" stroke-linecap="round" opacity="0.6">
      <path d="M -340 -280 L -340 -340 L -280 -340" />
      <path d="M 340 -280 L 340 -340 L 280 -340" />
      <path d="M 340 280 L 340 340 L 280 340" />
      <path d="M -340 280 L -340 340 L -280 340" />
    </g>
    <circle cx="0" cy="0" r="340" stroke="url(#dialGrad)" stroke-width="4" stroke-dasharray="8 14" opacity="0.75"/>
    <circle cx="0" cy="-340" r="11" fill="#60A5FA" />
    <circle cx="340" cy="0" r="11" fill="#60A5FA" />
    <circle cx="0" cy="340" r="11" fill="#60A5FA" />
    <circle cx="-340" cy="0" r="11" fill="#60A5FA" />
    <circle cx="0" cy="0" r="275" stroke="#38BDF8" stroke-width="5" opacity="0.8"/>
    <path d="M 0 -260 L 140 -220 C 180 -140, 200 -80, 160 0 L 70 -50 Z" fill="url(#bladeGrad1)"/>
    <path d="M 0 -260 L 140 -220 C 180 -140, 200 -80, 160 0 L 70 -50 Z" fill="url(#bladeGrad2)" transform="rotate(60)"/>
    <path d="M 0 -260 L 140 -220 C 180 -140, 200 -80, 160 0 L 70 -50 Z" fill="url(#bladeGrad1)" transform="rotate(120)"/>
    <path d="M 0 -260 L 140 -220 C 180 -140, 200 -80, 160 0 L 70 -50 Z" fill="url(#bladeGrad2)" transform="rotate(180)"/>
    <path d="M 0 -260 L 140 -220 C 180 -140, 200 -80, 160 0 L 70 -50 Z" fill="url(#bladeGrad1)" transform="rotate(240)"/>
    <path d="M 0 -260 L 140 -220 C 180 -140, 200 -80, 160 0 L 70 -50 Z" fill="url(#bladeGrad2)" transform="rotate(300)"/>
    <g transform="rotate(45)">
      <rect x="-95" y="-95" width="190" height="190" rx="42" fill="#080E1A" stroke="#38BDF8" stroke-width="5"/>
      <circle cx="-46" cy="-46" r="10" fill="#3B82F6" />
      <circle cx="46" cy="-46" r="10" fill="#60A5FA" />
      <circle cx="46" cy="46" r="10" fill="#38BDF8" />
      <circle cx="-46" cy="46" r="10" fill="#2563EB" />
    </g>
    <circle cx="0" cy="0" r="120" fill="url(#goldenHourGlow)"/>
    <circle cx="0" cy="0" r="28" fill="#FFFFFF"/>
    <circle cx="0" cy="0" r="12" fill="#1D4ED8"/>
  </g>

  <!-- Typography Right -->
  <g transform="translate(480, 250)">
    <text x="0" y="0" font-family="'Plus Jakarta Sans', 'Inter', 'Segoe UI', sans-serif" font-size="124" font-weight="900" letter-spacing="4">
      <tspan fill="#F8FAFC">STÜDYO</tspan><tspan fill="#3B82F6">M</tspan>
    </text>
    <rect x="0" y="24" width="760" height="4" rx="2" fill="url(#bladeGrad1)"/>
    <text x="4" y="68" font-family="'Plus Jakarta Sans', 'Inter', 'Segoe UI', sans-serif" font-size="30" font-weight="700" fill="#94A3B8" letter-spacing="7">
      FOTOĞRAFÇILIK &amp; STÜDYO AJANDASI
    </text>
  </g>
</svg>"""

def render_svg_to_png(svg_string, out_path, width, height, transparent=False):
    renderer = QSvgRenderer(QByteArray(svg_string.encode('utf-8')))
    image = QImage(width, height, QImage.Format.Format_ARGB32)
    if transparent:
        image.fill(QColor(0, 0, 0, 0))
    else:
        image.fill(QColor("#070B12"))
    painter = QPainter(image)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
    painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform, True)
    renderer.render(painter, QRectF(0, 0, width, height))
    painter.end()
    image.save(out_path, "PNG")
    print(f"Saved: {out_path} ({os.path.getsize(out_path)} bytes)")

def main():
    app = QGuiApplication(sys.argv)
    desktop = r"C:\Users\root\Desktop"
    
    # 1. Master SVG Files
    svg_icon_path = os.path.join(desktop, "studyom_app_icon.svg")
    with open(svg_icon_path, "w", encoding="utf-8") as f:
        f.write(ICON_SVG)
    print(f"Saved SVG: {svg_icon_path}")

    svg_emblem_path = os.path.join(desktop, "studyom_emblem.svg")
    with open(svg_emblem_path, "w", encoding="utf-8") as f:
        f.write(EMBLEM_TRANSPARENT_SVG)
    print(f"Saved SVG: {svg_emblem_path}")

    # 2. Render 1024x1024 Master App Icon PNG
    icon_png_path = os.path.join(desktop, "studyom_app_icon_1024.png")
    render_svg_to_png(ICON_SVG, icon_png_path, 1024, 1024)

    # 3. Render 1024x1024 Transparent Emblem PNG
    emblem_png_path = os.path.join(desktop, "studyom_emblem_transparent_1024.png")
    render_svg_to_png(EMBLEM_TRANSPARENT_SVG, emblem_png_path, 1024, 1024, transparent=True)

    # 4. Render 1600x480 Horizontal Dark Logo PNG
    h_dark_png_path = os.path.join(desktop, "studyom_logo_horizontal_dark.png")
    render_svg_to_png(HORIZONTAL_DARK_SVG, h_dark_png_path, 1600, 480)

    # 5. Also copy into Android mipmap icons
    android_res = r"C:\Users\root\Desktop\PhotoApp_Dev\android\app\src\main\res"
    mipmaps = [
        ("mipmap-xxxhdpi", 192),
        ("mipmap-xxhdpi", 144),
        ("mipmap-xhdpi", 96),
        ("mipmap-hdpi", 72),
        ("mipmap-mdpi", 48),
    ]
    for folder, size in mipmaps:
        target_dir = os.path.join(android_res, folder)
        if os.path.exists(target_dir):
            out_file = os.path.join(target_dir, "ic_launcher.png")
            render_svg_to_png(ICON_SVG, out_file, size, size)
            out_round = os.path.join(target_dir, "ic_launcher_round.png")
            render_svg_to_png(ICON_SVG, out_round, size, size)

    # 6. Web Favicon & App public icon
    web_public = r"C:\Users\root\Desktop\PhotoApp_Dev\public"
    if os.path.exists(web_public):
        render_svg_to_png(ICON_SVG, os.path.join(web_public, "favicon.png"), 64, 64)
        with open(os.path.join(web_public, "favicon.svg"), "w", encoding="utf-8") as f:
            f.write(ICON_SVG)
        render_svg_to_png(ICON_SVG, os.path.join(web_public, "logo192.png"), 192, 192)
        render_svg_to_png(ICON_SVG, os.path.join(web_public, "logo512.png"), 512, 512)

    print("ALL LOGOS GENERATED SUCCESSFULLY!")

if __name__ == "__main__":
    main()
