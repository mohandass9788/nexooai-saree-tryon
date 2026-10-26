"""
Watermark & Boutique Branding Compositor for Virtual Try-On Portraits.
Adds high-end luxury branding, showroom identity, and subtle gold accents to customer portraits.
"""

import io
import logging
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont
from backend.app.core.system_settings import get_setting

logger = logging.getLogger("watermark_service")


def apply_showroom_watermark(image_bytes: bytes) -> bytes:
    """
    Applies luxury showroom branding banner to the bottom of the try-on portrait.
    Returns JPEG encoded image bytes.
    """
    try:
        enabled = str(get_setting("watermark_enabled", "true")).lower() == "true"
        if not enabled:
            return image_bytes

        store_name = str(get_setting("custom_store_name", "NeXooAi Luxury Silks")).strip()
        watermark_text = str(get_setting("watermark_text", store_name)).strip() or store_name
        subtext = str(get_setting("watermark_subtext", "Exclusively Styled in Virtual 3D Drape")).strip()

        img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
        width, height = img.size

        # Create overlay canvas with transparency
        overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        # Luxury bottom gradient banner (Height ~ 12% of total height)
        banner_height = int(height * 0.11)
        banner_top = height - banner_height

        # Render subtle gradient bar from transparent to obsidian black
        for y in range(banner_top, height):
            progress = (y - banner_top) / float(banner_height)
            alpha = int(220 * progress)  # smooth dark gradient
            draw.line([(0, y), (width, y)], fill=(12, 10, 16, alpha))

        # Thin luxury gold separator line at top of banner
        gold_color = (212, 175, 55, 230)  # Metallic Gold
        draw.line([(0, banner_top), (width, banner_top)], fill=gold_color, width=3)

        # Accentuate with a center gold diamond crest ornament
        cx = width // 2
        cy = banner_top
        d_size = 6
        draw.polygon(
            [(cx, cy - d_size), (cx + d_size, cy), (cx, cy + d_size), (cx - d_size, cy)],
            fill=gold_color,
        )

        # Try loading default font or scalable font
        try:
            # Attempt to use a larger font if available
            font_title = ImageFont.truetype("arial.ttf", size=max(20, int(width * 0.032)))
            font_sub = ImageFont.truetype("arial.ttf", size=max(13, int(width * 0.020)))
        except Exception:
            font_title = ImageFont.load_default()
            font_sub = ImageFont.load_default()

        # Center texts
        title_y = banner_top + int(banner_height * 0.22)
        sub_y = title_y + max(26, int(width * 0.040))

        # Brand title in Warm Cream / Pale Gold
        draw.text(
            (cx, title_y),
            watermark_text.upper(),
            font=font_title,
            fill=(250, 240, 215, 255),
            anchor="mm",
        )

        # Subtext & Date in Soft White
        today_str = datetime.now().strftime("%d %b %Y")
        full_subtext = f"✨ {subtext} • {today_str} ✨"
        draw.text(
            (cx, sub_y),
            full_subtext,
            font=font_sub,
            fill=(205, 195, 175, 220),
            anchor="mm",
        )

        # Composite the overlay onto the original image
        final_img = Image.alpha_composite(img, overlay).convert("RGB")

        out_io = io.BytesIO()
        final_img.save(out_io, format="JPEG", quality=95, optimize=True)
        return out_io.getvalue()

    except Exception as e:
        logger.warning(f"Watermark rendering failed, returning original image: {e}")
        return image_bytes
