import io
import logging
from PIL import Image

try:
    from rembg import remove, new_session
except ImportError:
    remove = None
    new_session = None

logger = logging.getLogger("services.bg_remover")

_session = None


def get_rembg_session():
    global _session
    if remove is None or new_session is None:
        return None
    if _session is None:
        try:
            _session = new_session("u2net")
        except Exception as e:
            logger.warning("Could not initialize rembg session: %s", e)
    return _session


def remove_bg_and_apply_studio(
    image_bytes: bytes, studio_color: tuple = (248, 248, 250)
) -> bytes:
    """
    Automatically isolates the person and replaces cluttered backgrounds
    with an ultra-clean, high-fashion showroom studio white backdrop.
    """
    if remove is None:
        logger.info("rembg package not installed; skipping background isolation")
        return image_bytes
    try:
        input_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        session = get_rembg_session()

        # Extract isolated RGBA with transparent background
        isolated_rgba = remove(input_img, session=session) if session else remove(input_img)

        # Composite onto clean luxury studio backdrop
        studio_canvas = Image.new("RGB", isolated_rgba.size, studio_color)
        studio_canvas.paste(isolated_rgba, mask=isolated_rgba.split()[3])

        out_buf = io.BytesIO()
        studio_canvas.save(out_buf, format="JPEG", quality=95)
        return out_buf.getvalue()
    except Exception as e:
        logger.warning("Background removal skipped due to error: %s", e)
        return image_bytes
