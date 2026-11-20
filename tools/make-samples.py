"""Generate 4 original sample photos for the GTA-style cover app.

All scenes are drawn procedurally with PIL: gradients, sun, palms, buildings,
neon signs, water. No real people, no game artwork, no logos.
"""
import math, os, random
from PIL import Image, ImageDraw, ImageFilter

OUT = "/home/hatch/workspace/makefun/build/gta6-cover-art-01-v2/app/samples"
os.makedirs(OUT, exist_ok=True)
W, H = 1200, 900


def vgrad(size, top, bottom):
    img = Image.new("RGB", size)
    d = ImageDraw.Draw(img)
    for y in range(size[1]):
        t = y / max(1, size[1] - 1)
        d.line([(0, y), (size[0], y)], fill=tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return img


def sun(img, cx, cy, r, color):
    d = ImageDraw.Draw(img, "RGBA")
    for i in range(6, 0, -1):
        d.ellipse([cx - r * i / 3, cy - r * i / 3, cx + r * i / 3, cy + r * i / 3],
                  fill=color + (int(28 * (7 - i)),))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color + (255,))


def palm(d, x, y, s, color):
    d.line([x, y, x + s * 0.08, y - s], fill=color, width=max(4, int(s * 0.06)))
    for a in range(-70, 71, 28):
        rad = math.radians(a - 90)
        ex = x + s * 0.08 + math.cos(rad) * s * 0.55
        ey = y - s + math.sin(rad) * s * 0.55
        d.line([x + s * 0.08, y - s, ex, ey], fill=color, width=max(3, int(s * 0.045)))
        d.line([ex, ey, ex + math.cos(rad + 0.5) * s * 0.25, ey + s * 0.22], fill=color, width=max(2, int(s * 0.03)))


def person(d, x, y, s, shirt, skin=(214, 164, 120)):
    # Simple stylised figure: head, hair, torso. Original illustration, no likeness.
    d.ellipse([x - s * 0.16, y - s * 0.52, x + s * 0.16, y - s * 0.2], fill=skin)
    d.pieslice([x - s * 0.18, y - s * 0.56, x + s * 0.18, y - s * 0.28], 180, 360, fill=(30, 22, 16))
    d.rounded_rectangle([x - s * 0.3, y - s * 0.2, x + s * 0.3, y + s * 0.55], radius=int(s * 0.08), fill=shirt)
    d.line([x - s * 0.3, y - s * 0.1, x - s * 0.55, y + s * 0.35], fill=shirt, width=int(s * 0.12))
    d.line([x + s * 0.3, y - s * 0.1, x + s * 0.55, y + s * 0.35], fill=shirt, width=int(s * 0.12))


# 1. Boulevard at golden hour: convertible, palms, sun.
img = vgrad((W, H), (255, 150, 60), (255, 90, 120))
sun(img, 600, 330, 130, (255, 220, 120))
d = ImageDraw.Draw(img, "RGBA")
d.rectangle([0, 560, W, H], fill=(40, 20, 60))
for bx, bw, bh in [(40, 180, 260), (260, 140, 320), (900, 220, 280), (1140, 60, 200)]:
    d.rectangle([bx, 560 - bh, bx + bw, 560], fill=(52, 24, 70))
    for wy in range(560 - bh + 20, 540, 34):
        for wx in range(bx + 14, bx + bw - 20, 30):
            d.rectangle([wx, wy, wx + 14, wy + 18], fill=(255, 190, 90, 200))
palm(d, 120, 620, 260, (24, 60, 40))
palm(d, 1080, 640, 300, (24, 60, 40))
d.rounded_rectangle([330, 640, 870, 780], radius=40, fill=(178, 30, 40))  # car body
d.rounded_rectangle([380, 590, 640, 660], radius=30, fill=(20, 20, 30))   # windshield
d.ellipse([400, 740, 500, 840], fill=(18, 18, 22))
d.ellipse([700, 740, 800, 840], fill=(18, 18, 22))
person(d, 560, 700, 210, (240, 240, 235))
img = img.filter(ImageFilter.GaussianBlur(0.4))
img.save(f"{OUT}/boulevard.jpg", quality=82)

# 2. Rooftop at dusk: skyline, haze, figure with chain.
img = vgrad((W, H), (70, 40, 110), (255, 120, 80))
sun(img, 850, 420, 100, (255, 200, 110))
d = ImageDraw.Draw(img, "RGBA")
for bx, bw, bh in [(0, 150, 300), (170, 120, 420), (320, 180, 260), (520, 140, 380), (700, 200, 320), (940, 260, 460)]:
    d.rectangle([bx, 620 - bh, bx + bw, 620], fill=(38, 22, 66))
    for wy in range(620 - bh + 18, 600, 30):
        for wx in range(bx + 12, bx + bw - 16, 26):
            d.rectangle([wx, wy, wx + 10, wy + 14], fill=(255, 210, 130, 190))
d.rectangle([0, 620, W, H], fill=(30, 18, 50))
palm(d, 90, 700, 200, (16, 44, 30))
palm(d, 1120, 700, 220, (16, 44, 30))
person(d, 600, 720, 260, (20, 120, 90))
d.ellipse([560, 700, 640, 780], outline=(255, 210, 90), width=4)  # gold chain hint
img.save(f"{OUT}/rooftop.jpg", quality=82)

# 3. Neon night street: wet pavement reflections, two friends.
img = vgrad((W, H), (12, 8, 34), (40, 10, 60))
d = ImageDraw.Draw(img, "RGBA")
for bx, bw, bh, col in [(0, 200, 420, (255, 60, 160)), (240, 180, 520, (40, 220, 220)),
                        (1020, 180, 460, (255, 60, 160)), (820, 160, 380, (255, 190, 60))]:
    d.rectangle([bx, 560 - bh, bx + bw, 560], fill=(16, 10, 30))
    d.rectangle([bx + 14, 560 - bh + 16, bx + bw - 14, 560 - bh + 60], fill=col + (220,))
    d.rectangle([bx + 14, 560 - bh + 80, bx + bw - 14, 560 - bh + 110], fill=col + (140,))
d.rectangle([0, 560, W, H], fill=(22, 14, 40))
for x in range(0, W, 46):
    c = (255, 60, 160) if (x // 46) % 3 == 0 else (40, 220, 220) if (x // 46) % 3 == 1 else (255, 190, 60)
    d.line([x, 570, x + random.randint(-8, 8), 880], fill=c + (90,), width=5)
person(d, 480, 640, 230, (255, 80, 140))
person(d, 720, 640, 230, (60, 220, 200))
img = img.filter(ImageFilter.GaussianBlur(0.5))
img.save(f"{OUT}/neon.jpg", quality=82)

# 4. Pier over turquoise water: fisherman, bucket hat.
img = vgrad((W, H), (140, 220, 255), (255, 200, 140))
sun(img, 300, 240, 110, (255, 230, 150))
d = ImageDraw.Draw(img, "RGBA")
d.rectangle([0, 520, W, H], fill=(20, 160, 180))
for y in range(540, H, 46):
    d.line([0, y, W, y + 14], fill=(255, 255, 255, 40), width=3)
d.polygon([(0, 620), (W, 560), (W, H), (0, H)], fill=(120, 84, 52))  # pier deck
for x in range(30, W, 90):
    d.line([x, 620 - (x * 0.05), x, H], fill=(90, 60, 36), width=6)
person(d, 600, 560, 250, (245, 245, 240))
d.pieslice([540, 380, 660, 470], 180, 360, fill=(240, 220, 160))  # bucket hat
d.line([700, 520, 950, 300], fill=(60, 40, 24), width=6)  # fishing rod
img.save(f"{OUT}/pier.jpg", quality=82)

print("samples done:", sorted(os.listdir(OUT)))
