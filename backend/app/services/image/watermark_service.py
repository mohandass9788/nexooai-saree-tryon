"""
Watermark & Boutique Branding Compositor for Virtual Try-On Portraits.
Produces clean, luxury showroom signatures without obscuring customer attire or facial features.
Watermark is disabled by default to guarantee 100% clean, unobstructed customer portraits.
When enabled, it is placed strictly in the bottom corner, never touching the face or forehead.
"""

import io
import logging
from PIL import Image, ImageDraw, ImageFont
from backend.app.core.system_settings import get_setting

logger = logging.getLogger("watermark_service")


def apply_showroom_watermark(image_bytes: bytes, store_name: str | None = None) -> bytes:
    """
    Applies an optional, non-destructive luxury boutique signature to the try-on portrait.
    Returns JPEG encoded image bytes.
    If watermark_enabled is false (or position is 'none'), returns the clean image untouched.
    """
    try:
        # 1. Disabled by default
        enabled = str(get_setting("watermark_enabled", "false")).strip().lower() in ("true", "1", "yes")
        if not enabled:
            return image_bytes

        position = str(get_setting("watermark_position", "bottom_right")).strip().lower()
        if position == "none" or position == "off":
            return image_bytes

        active_store = store_name or str(get_setting("custom_store_name", "")).strip() or "NeXooAi Luxury Silks"

        img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
        width, height = img.size

        # Create transparent overlay
        overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        # Subtle luxury signature font - keep small and elegant
        font_size = max(11, int(min(width, height) * 0.016))
        try:
            font = ImageFont.truetype("arial.ttf", size=font_size)
        except Exception:
            font = ImageFont.load_default()

        label = f"✦ {active_store.upper()} ✦"

        # Calculate text bounding box
        bbox = draw.textbbox((0, 0), label, font=font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]

        pad_x = 12
        pad_y = 6
        pill_w = text_w + pad_x * 2
        pill_h = text_h + pad_y * 2

        # NEVER place at top (where face/eyes are)!
        # Bottom placement only:
        if position == "bottom_left":
            x0 = 20
            y0 = max(10, height - pill_h - 20)
        else:
            # Default for bottom_right, bottom_banner, or any other setting:
            # Placed unobtrusively at the lower-right margin
            x0 = max(10, width - pill_w - 20)
            y0 = max(10, height - pill_h - 20)

        x1 = x0 + pill_w
        y1 = y0 + pill_h

        # Translucent glassmorphic pill background
        draw.rounded_rectangle(
            [(x0, y0), (x1, y1)],
            radius=pill_h // 2,
            fill=(14, 10, 18, 130),
            outline=(212, 175, 55, 160),
            width=1,
        )

        # Refined warm champagne gold text
        draw.text(
            (x0 + pad_x, y0 + pad_y),
            label,
            font=font,
            fill=(250, 240, 220, 220),
        )

        final_img = Image.alpha_composite(img, overlay).convert("RGB")
        out_io = io.BytesIO()
        final_img.save(out_io, format="JPEG", quality=95, optimize=True)
        return out_io.getvalue()

    except Exception as e:
        logger.warning(f"Watermark rendering skipped due to error: {e}")
        return image_bytes
