"""
Bespoke Virtual Apparel Try-On Prompt Engineering for NeXooAi.
Constructs targeted prompts for:
1. Google Gemini & Imagen 3
2. OpenAI GPT-4o Vision & DALL-E 3
3. FASHN.ai Apparel Parameters
"""

from typing import Dict, Any, Optional
from backend.app.core.system_settings import get_setting


def generate_gemini_tryon_prompt(options: Optional[Dict[str, Any]] = None) -> str:
    options = options or {}
    name_en = options.get("name_en") or "Traditional Silk Saree"
    category = options.get("category") or "Bridal Silk"
    fabric = options.get("fabric") or "Mulberry Silk"
    color = options.get("color") or "Royal Red & Gold"
    pallu = options.get("pallu_type") or "Rich zari border with peacock motifs"

    custom_template = get_setting("custom_ai_prompt_template")
    if custom_template and "{garment_name}" in custom_template:
        return custom_template.format(
            garment_name=name_en,
            category=category,
            fabric=fabric,
            color=color,
            pallu=pallu
        )

    return (
        f"Professional virtual apparel try-on synthesis. "
        f"Take the person from the portrait photo and realistically dress them in the authentic {name_en}. "
        f"Garment Details: Category: {category}, Fabric: {fabric}, Primary Color: {color}, Pallu / Border: {pallu}. "
        f"Critical Instructions: "
        f"1. Drape the saree seamlessly around the person's body in traditional Indian Nivi draping style. "
        f"2. Waist pleats should fall cleanly down the center, and the ornate pallu must drape diagonally across the torso and over the left shoulder. "
        f"3. Strictly preserve the person's natural face, identity, hair, skin complexion, expression, body proportions, and natural pose. "
        f"4. Do NOT stitch, stack, or tile the two images side-by-side. The output MUST be a single unified photograph of the person wearing the garment. "
        f"5. Maintain photorealistic textile luster, zari metallic sheen, natural cloth fold shadows, and warm luxury boutique lighting."
    )


def generate_openai_tryon_prompt(options: Optional[Dict[str, Any]] = None) -> str:
    options = options or {}
    name_en = options.get("name_en") or "Traditional Silk Saree"
    category = options.get("category") or "Bridal Silk"
    fabric = options.get("fabric") or "Mulberry Silk"
    color = options.get("color") or "Royal Red & Gold"

    return (
        f"Ultra-realistic Indian fashion showroom portrait: The person from the input photo gracefully wearing "
        f"the authentic {name_en} ({category}, fabric: {fabric}, color: {color}). "
        f"The saree is naturally draped with authentic waist pleats and the ornate zari pallu draped across the chest and over the left shoulder. "
        f"Preserve facial identity, hair, skin tone, and body pose exactly. Single unified editorial fashion photograph with luxury warm studio lighting."
    )


def generate_fashn_category(category_name: str) -> str:
    cat = (category_name or "").lower()
    if any(k in cat for k in ["saree", "dhoti", "chudi", "pavadai", "gown", "dress", "lehenga"]):
        return "one-pieces"
    elif any(k in cat for k in ["shirt", "kurta", "blouse", "top"]):
        return "tops"
    elif any(k in cat for k in ["pant", "skirt", "trouser"]):
        return "bottoms"
    return "one-pieces"
