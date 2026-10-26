"""
Bridal Styling Engine: Jewellery Virtual Try-On & Wedding Lighting Simulator.
Composites realistic South Indian bridal jewellery accents (Temple Gold, Polki Diamond, Antique Ruby)
and applies realistic Wedding Lighting Simulation (Daylight Muhurtham, Golden Mandapam, Royal Reception)
onto virtual try-on drape portraits.
"""

import io
import math
import logging
from PIL import Image, ImageEnhance, ImageDraw, ImageFilter, ImageColor

logger = logging.getLogger("bridal_styling_service")


def apply_wedding_lighting(img: Image.Image, lighting_mode: str = "daylight") -> Image.Image:
    """
    Simulates real-world wedding hall illumination environments:
    - 'daylight': 5500K natural sunlight, high color-fidelity, crisp authentic silk weave sheen.
    - 'mandapam': 3000K warm incandescent mandapam lighting, rich golden zari luster, romantic warm ambient cast.
    - 'reception': 4500K royal reception lighting with dramatic evening contrast and magenta-gold rim glow.
    """
    mode = (lighting_mode or "daylight").lower()
    rgb_img = img.convert("RGB")

    if mode == "mandapam":
        # 1. Warm Golden Color Cast (Boost Red & Yellow tones, soft candle/incandescent glow)
        r, g, b = rgb_img.split()
        r = r.point(lambda i: min(255, int(i * 1.08 + 8)))
        g = g.point(lambda i: min(255, int(i * 1.03 + 4)))
        b = b.point(lambda i: max(0, int(i * 0.90 - 4)))
        warmed = Image.merge("RGB", (r, g, b))

        # 2. Rich Zari Luster (Slight saturation & warm contrast boost)
        enhancer_sat = ImageEnhance.Color(warmed)
        warmed = enhancer_sat.enhance(1.15)
        enhancer_con = ImageEnhance.Contrast(warmed)
        warmed = enhancer_con.enhance(1.06)

        # 3. Soft Ambient Golden Vignette
        width, height = warmed.size
        glow_mask = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(glow_mask)
        # Gentle golden perimeter illumination
        draw.rectangle([0, 0, width, height], outline=(255, 200, 80, 25), width=int(width * 0.04))
        warmed.paste(glow_mask, (0, 0), glow_mask)
        return warmed

    elif mode == "reception":
        # Evening Reception: Royal Glamour (High contrast, deep velvet tones, subtle cool magenta tint)
        r, g, b = rgb_img.split()
        r = r.point(lambda i: min(255, int(i * 1.04 + 5)))
        g = g.point(lambda i: max(0, int(i * 0.98)))
        b = b.point(lambda i: min(255, int(i * 1.06 + 8)))
        royal = Image.merge("RGB", (r, g, b))

        enhancer_con = ImageEnhance.Contrast(royal)
        royal = enhancer_con.enhance(1.12)
        enhancer_sat = ImageEnhance.Color(royal)
        royal = enhancer_sat.enhance(1.08)
        return royal

    else:
        # Daylight Muhurtham: Pure Natural Color Fidelity
        enhancer_con = ImageEnhance.Contrast(rgb_img)
        crisp = enhancer_con.enhance(1.03)
        enhancer_sharp = ImageEnhance.Sharpness(crisp)
        return enhancer_sharp.enhance(1.08)


def draw_temple_gold_jewellery(overlay: Image.Image, width: int, height: int):
    """
    Renders high-definition South Indian Temple Gold Kasu Malai & Lakshmi Haram
    with ruby cabochons, gold coin tassels, and Goddess Lakshmi medallion.
    """
    draw = ImageDraw.Draw(overlay)
    cx = width // 2
    # Neckline center is typically around 30% - 34% of 9:16 portrait height
    neck_y = int(height * 0.315)
    radius_x = int(width * 0.165)
    radius_y = int(height * 0.095)

    gold_dark = (184, 134, 11, 235)
    gold_mid = (218, 165, 32, 255)
    gold_bright = (255, 215, 0, 255)
    ruby_red = (180, 20, 50, 250)
    pearl_white = (250, 248, 240, 240)

    # 1. Inner Choker Collar Arc (Kasulaperu / Coin Choker)
    coin_count = 21
    for i in range(coin_count):
        theta = math.pi * 0.12 + (math.pi * 0.76) * (i / float(coin_count - 1))
        x = cx + int(radius_x * 0.85 * math.cos(theta))
        y = neck_y + int(radius_y * 0.70 * math.sin(theta))

        coin_r = max(4, int(width * 0.012))
        # Drop shadow for 3D depth
        draw.ellipse([x - coin_r + 1, y - coin_r + 2, x + coin_r + 1, y + coin_r + 2], fill=(0, 0, 0, 110))
        # Gold Coin Disc
        draw.ellipse([x - coin_r, y - coin_r, x + coin_r, y + coin_r], fill=gold_mid, outline=gold_bright, width=1)
        # Embossed Center Dot (Kasu Motif)
        draw.point((x, y), fill=gold_bright)

    # 2. Outer Grand Haram (Long Kasu Malai Arc)
    outer_rx = int(radius_x * 1.15)
    outer_ry = int(radius_y * 1.35)
    haram_coins = 27
    for i in range(haram_coins):
        theta = math.pi * 0.10 + (math.pi * 0.80) * (i / float(haram_coins - 1))
        x = cx + int(outer_rx * math.cos(theta))
        y = neck_y + int(outer_ry * math.sin(theta))

        coin_r = max(5, int(width * 0.016))
        draw.ellipse([x - coin_r + 1, y - coin_r + 2, x + coin_r + 1, y + coin_r + 2], fill=(0, 0, 0, 120))
        draw.ellipse([x - coin_r, y - coin_r, x + coin_r, y + coin_r], fill=gold_bright, outline=gold_dark, width=1)
        # Ruby inset on every 3rd coin
        if i % 3 == 0:
            draw.ellipse([x - 2, y - 2, x + 2, y + 2], fill=ruby_red)
        # Hanging tiny gold bead
        draw.line([x, y + coin_r, x, y + coin_r + 3], fill=gold_dark, width=1)
        draw.ellipse([x - 1, y + coin_r + 2, x + 1, y + coin_r + 4], fill=gold_bright)

    # 3. Centerpiece: Ornate Goddess Lakshmi Medallion Pendant
    pendant_y = neck_y + outer_ry + max(8, int(height * 0.012))
    p_w = max(18, int(width * 0.055))
    p_h = max(24, int(height * 0.038))

    # Shadow
    draw.polygon([
        (cx, pendant_y - p_h + 3),
        (cx + p_w + 2, pendant_y + 3),
        (cx, pendant_y + p_h + 3),
        (cx - p_w + 2, pendant_y + 3)
    ], fill=(0, 0, 0, 140))

    # Temple Dome / Crest
    draw.polygon([
        (cx, pendant_y - p_h),
        (cx + p_w, pendant_y),
        (cx, pendant_y + p_h),
        (cx - p_w, pendant_y)
    ], fill=gold_mid, outline=gold_bright, width=2)

    # Center Cabochon Kemp Ruby Gem
    gem_r = max(4, int(width * 0.014))
    draw.ellipse([cx - gem_r, pendant_y - gem_r, cx + gem_r, pendant_y + gem_r], fill=ruby_red, outline=gold_bright, width=1)

    # Hanging South Sea Pearl Drop
    pearl_y = pendant_y + p_h + 8
    draw.line([cx, pendant_y + p_h, cx, pearl_y], fill=gold_mid, width=2)
    draw.ellipse([cx - 4, pearl_y - 4, cx + 4, pearl_y + 4], fill=pearl_white, outline=(200, 190, 175, 255), width=1)


def draw_polki_diamond_jewellery(overlay: Image.Image, width: int, height: int):
    """
    Renders Royal Rajasthani / South Indian Kundan Polki Diamond Bridal Choker
    with uncut luminescent polki crystals, 22K gold bezel, and dangling emerald droplets.
    """
    draw = ImageDraw.Draw(overlay)
    cx = width // 2
    neck_y = int(height * 0.315)
    radius_x = int(width * 0.16)
    radius_y = int(height * 0.088)

    gold_rim = (212, 175, 55, 255)
    polki_diamond = (255, 255, 255, 250)
    emerald_green = (16, 140, 75, 255)

    polki_count = 17
    for i in range(polki_count):
        theta = math.pi * 0.15 + (math.pi * 0.70) * (i / float(polki_count - 1))
        x = cx + int(radius_x * math.cos(theta))
        y = neck_y + int(radius_y * math.sin(theta))

        size = max(6, int(width * 0.017))
        # Drop shadow
        draw.rectangle([x - size + 2, y - size + 2, x + size + 2, y + size + 2], fill=(0, 0, 0, 110))
        # Gold Bezel Frame
        draw.rectangle([x - size, y - size, x + size, y + size], fill=gold_rim, outline=(255, 235, 150, 255), width=1)
        # Uncut Polki Facet
        draw.polygon([(x, y - size + 2), (x + size - 2, y), (x, y + size - 2), (x - size + 2, y)], fill=polki_diamond)
        # Sparkle Highlight
        draw.point((x - 1, y - 1), fill=(255, 255, 255, 255))

        # Dangling Emerald Drop
        em_y = y + size + 6
        draw.line([x, y + size, x, em_y], fill=gold_rim, width=1)
        draw.ellipse([x - 3, em_y - 2, x + 3, em_y + 6], fill=emerald_green, outline=(80, 220, 140, 255), width=1)


def draw_antique_ruby_jewellery(overlay: Image.Image, width: int, height: int):
    """
    Renders Antique Matte Nakshi Peacock Haram
    with deep kemp rubies, matte antique gold patina, and pearl tassels.
    """
    draw = ImageDraw.Draw(overlay)
    cx = width // 2
    neck_y = int(height * 0.315)
    radius_x = int(width * 0.175)
    radius_y = int(height * 0.105)

    antique_gold = (165, 120, 40, 245)
    antique_gold_light = (205, 160, 65, 255)
    kemp_ruby = (155, 15, 45, 255)
    pearl = (245, 240, 230, 240)

    # Peacock filigree links
    links = 19
    for i in range(links):
        theta = math.pi * 0.12 + (math.pi * 0.76) * (i / float(links - 1))
        x = cx + int(radius_x * math.cos(theta))
        y = neck_y + int(radius_y * math.sin(theta))

        r = max(5, int(width * 0.015))
        # Shadow
        draw.ellipse([x - r + 1, y - r + 2, x + r + 1, y + r + 2], fill=(0, 0, 0, 120))
        # Antique matte gold base
        draw.ellipse([x - r, y - r, x + r, y + r], fill=antique_gold, outline=antique_gold_light, width=1)
        # Kemp Ruby center stone
        draw.ellipse([x - 3, y - 3, x + 3, y + 3], fill=kemp_ruby)

    # Grand Antique Peacock Center Pendant
    pendant_y = neck_y + radius_y + max(10, int(height * 0.015))
    pw = max(24, int(width * 0.07))
    ph = max(20, int(height * 0.03))

    draw.ellipse([cx - pw + 2, pendant_y - ph + 2, cx + pw + 2, pendant_y + ph + 2], fill=(0, 0, 0, 130))
    draw.ellipse([cx - pw, pendant_y - ph, cx + pw, pendant_y + ph], fill=antique_gold, outline=antique_gold_light, width=2)
    # Three Ruby droplets
    draw.ellipse([cx - 8, pendant_y - 4, cx - 2, pendant_y + 4], fill=kemp_ruby)
    draw.ellipse([cx - 3, pendant_y - 6, cx + 3, pendant_y + 6], fill=kemp_ruby)
    draw.ellipse([cx + 2, pendant_y - 4, cx + 8, pendant_y + 4], fill=kemp_ruby)

    # Pearl tassel fringe (5 pearl drops)
    for offset in [-16, -8, 0, 8, 16]:
        px = cx + offset
        py = pendant_y + ph + 6
        draw.line([px, pendant_y + ph, px, py], fill=antique_gold, width=1)
        draw.ellipse([px - 2, py - 2, px + 2, py + 3], fill=pearl)


def apply_bridal_styling(
    image_bytes: bytes,
    jewellery_type: str = "none",
    lighting_mode: str = "daylight",
) -> bytes:
    """
    Master pipeline:
    1. Loads portrait image
    2. Applies Wedding Lighting Environment Shader
    3. Composites chosen Bridal Jewellery Accents
    Returns JPEG bytes.
    """
    try:
        base_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        width, height = base_img.size

        # Step 1: Apply Wedding Lighting Simulation
        lit_img = apply_wedding_lighting(base_img, lighting_mode)

        # Step 2: Overlay Jewellery if selected
        j_type = (jewellery_type or "none").lower()
        if j_type != "none":
            overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))

            if j_type == "temple":
                draw_temple_gold_jewellery(overlay, width, height)
            elif j_type == "polki":
                draw_polki_diamond_jewellery(overlay, width, height)
            elif j_type == "antique":
                draw_antique_ruby_jewellery(overlay, width, height)

            # Soften edges slightly for photorealistic natural blending
            overlay = overlay.filter(ImageFilter.GaussianBlur(radius=0.4))

            # Composite onto lit image
            lit_rgba = lit_img.convert("RGBA")
            final_img = Image.alpha_composite(lit_rgba, overlay).convert("RGB")
        else:
            final_img = lit_img

        out_io = io.BytesIO()
        final_img.save(out_io, format="JPEG", quality=95, optimize=True)
        return out_io.getvalue()

    except Exception as e:
        logger.error(f"Bridal styling failed, returning original image: {e}")
        return image_bytes


def generate_couple_twinning_drape(
    bride_image_bytes: bytes,
    groom_attire: str = "dhoti",
    saree_color_hex: str = "#c99738",
    saree_name: str = "Traditional Saree",
) -> bytes:
    """
    Renders a Coordinated Couple & Groom Lookbook portrait:
    Presents the bride in her selected saree alongside the groom in a color-matched
    mulberry silk dhoti or royal sherwani kurta with gold zari border coordination.
    """
    try:
        bride_img = Image.open(io.BytesIO(bride_image_bytes)).convert("RGB")
        b_w, b_h = bride_img.size

        # Create a majestic 16:9 or expanded 9:16 couple presentation canvas
        canvas_w = int(b_w * 1.55)
        canvas_h = b_h
        couple_canvas = Image.new("RGB", (canvas_w, canvas_h), (18, 14, 22))
        draw = ImageDraw.Draw(couple_canvas)

        # 1. Subtle warm temple silk background gradient
        for y in range(canvas_h):
            ratio = y / float(canvas_h)
            r = int(24 + 18 * ratio)
            g = int(18 + 12 * ratio)
            b = int(28 + 8 * ratio)
            draw.line([(0, y), (canvas_w, y)], fill=(r, g, b))

        # 2. Paste Bride Image on Left/Center
        couple_canvas.paste(bride_img, (0, 0))

        # 3. Render Groom Coordinated Portrait Area on Right
        groom_x = b_w
        groom_w = canvas_w - b_w

        # Draw soft glowing background panel for groom
        draw.rectangle([groom_x, 0, canvas_w, canvas_h], fill=(22, 18, 28))

        # Render Groom Silk Silhouette / Attire Showcase Card
        card_margin_x = int(groom_w * 0.08)
        card_margin_y = int(canvas_h * 0.06)
        card_rect = [groom_x + card_margin_x, card_margin_y, canvas_w - card_margin_x, canvas_h - card_margin_y]

        # Card Backdrop with gold border
        draw.rectangle(card_rect, fill=(30, 24, 38), outline=(212, 175, 55), width=2)

        # Determine Groom Accent Color from Saree
        try:
            accent_rgb = ImageColor.getrgb(saree_color_hex)
        except Exception:
            accent_rgb = (201, 151, 56)

        gold_color = (212, 175, 55)

        # Draw Attire Badge / Motif
        center_x = (card_rect[0] + card_rect[2]) // 2
        top_y = card_rect[1] + int(canvas_h * 0.05)

        # Ornate Gold Diamond Crest
        crest_r = 16
        draw.polygon([
            (center_x, top_y - crest_r),
            (center_x + crest_r, top_y),
            (center_x, top_y + crest_r),
            (center_x - crest_r, top_y)
        ], fill=gold_color)

        # Draw Groom Silk Dhoti or Kurta Representation
        figure_top = top_y + 40
        fig_w = int(groom_w * 0.55)
        fig_h = int(canvas_h * 0.45)
        fig_rect = [center_x - fig_w // 2, figure_top, center_x + fig_w // 2, figure_top + fig_h]

        if groom_attire == "kurta":
            # Royal Kurta Silhouette
            draw.rectangle(fig_rect, fill=(45, 36, 56), outline=accent_rgb, width=2)
            # Center placket & gold buttons
            draw.line([(center_x, fig_rect[1]), (center_x, fig_rect[1] + int(fig_h * 0.6))], fill=gold_color, width=3)
            for btn_y in range(fig_rect[1] + 15, fig_rect[1] + int(fig_h * 0.55), 25):
                draw.ellipse([center_x - 3, btn_y - 3, center_x + 3, btn_y + 3], fill=gold_color)
            # Matching Saree Border Pocket Square / Trim
            draw.rectangle([center_x + 15, fig_rect[1] + 35, center_x + 45, fig_rect[1] + 55], fill=accent_rgb, outline=gold_color, width=1)
        else:
            # Traditional Pure Silk Dhoti & Angavastram (Veshti)
            draw.rectangle(fig_rect, fill=(245, 240, 228), outline=(218, 165, 32), width=2)
            # Pure silk pleats & Angavastram draped across chest
            draw.line([(fig_rect[0] + 15, fig_rect[1]), (fig_rect[2] - 15, fig_rect[3] - 40)], fill=accent_rgb, width=12)
            draw.line([(fig_rect[0] + 15, fig_rect[1]), (fig_rect[2] - 15, fig_rect[3] - 40)], fill=gold_color, width=2)
            # Traditional Kasavu / Zari Gold Border Bottom
            draw.rectangle([fig_rect[0], fig_rect[3] - 25, fig_rect[2], fig_rect[3]], fill=gold_color)

        # Matching Silk Palette Swatches
        swatch_y = fig_rect[3] + 30
        draw.line([card_rect[0] + 20, swatch_y, card_rect[2] - 20, swatch_y], fill=(70, 56, 88), width=1)

        # Draw Couple Harmony Ribbon at bottom
        banner_h = int(canvas_h * 0.08)
        draw.rectangle([0, canvas_h - banner_h, canvas_w, canvas_h], fill=(12, 10, 16))
        draw.line([(0, canvas_h - banner_h), (canvas_w, canvas_h - banner_h)], fill=gold_color, width=2)

        out_io = io.BytesIO()
        couple_canvas.save(out_io, format="JPEG", quality=95, optimize=True)
        return out_io.getvalue()
    except Exception as e:
        logger.error(f"Couple twinning generation failed: {e}")
        return bride_image_bytes

