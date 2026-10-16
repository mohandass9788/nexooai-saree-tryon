import os
from PIL import Image, ImageDraw, ImageFont

os.makedirs("backend/app/static/sarees", exist_ok=True)

APPAREL_SPECS = [
    ("kan-silk-001.jpg", (178, 34, 34), (255, 215, 0), "Kanchipuram Silk", "காஞ்சிபுரம் பட்டு", "₹18,500"),
    ("ban-silk-002.jpg", (0, 100, 50), (220, 220, 220), "Banarasi Brocade", "பனாரசி ப்ரோகேட்", "₹14,200"),
    ("cht-cot-003.jpg", (204, 119, 34), (128, 0, 0), "Chettinad Cotton", "செட்டிநாடு பருத்தி", "₹3,200"),
    ("mys-silk-004.jpg", (15, 45, 110), (255, 215, 0), "Mysore Crepe Silk", "மைசூர் பட்டு", "₹11,800"),
    ("w-chudi-005.jpg", (199, 105, 140), (255, 228, 196), "Chanderi Chudidhar", "சந்தேரி சுடிதார்", "₹5,400"),
    ("m-dhoti-006.jpg", (245, 245, 235), (218, 165, 32), "Silk Dhoti Set", "பட்டு வேட்டி", "₹7,800"),
    ("m-kurta-007.jpg", (110, 20, 45), (230, 200, 120), "Raw Silk Kurta", "ரா பட்டு குர்தா", "₹4,200"),
    ("k-pavadai-008.jpg", (0, 128, 128), (255, 105, 180), "Pattu Pavadai", "பட்டுப் பாவாடை", "₹4,800"),
]

for filename, base_color, accent_color, title_en, title_ta, price in APPAREL_SPECS:
    img = Image.new("RGB", (480, 640), color=base_color)
    draw = ImageDraw.Draw(img)
    
    # Outer gold/accent border
    draw.rectangle([16, 16, 464, 624], outline=accent_color, width=4)
    # Inner border
    draw.rectangle([24, 24, 456, 616], outline=accent_color, width=2)
    
    # Pallu / Motif patterns
    for y in range(40, 200, 16):
        draw.line([(32, y), (448, y)], fill=accent_color, width=2)
        
    for x in range(40, 440, 30):
        draw.polygon([(x, 120), (x+15, 95), (x+30, 120), (x+15, 145)], fill=accent_color)
        
    # Lower drape lines
    for y in range(260, 520, 32):
        draw.arc([40, y-15, 440, y+35], 0, 180, fill=accent_color, width=2)
        
    # Text badge at bottom
    draw.rectangle([32, 530, 448, 608], fill=(20, 20, 20))
    draw.text((45, 545), f"{title_en} • {price}", fill=(255, 255, 255))
    draw.text((45, 575), "NeXooAi Premium Collection", fill=accent_color)
    
    out_path = os.path.join("backend/app/static/sarees", filename)
    img.save(out_path, quality=92)
    print(f"Generated {out_path}")
