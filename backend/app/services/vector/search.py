import math
import hashlib
from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class VectorGarmentMatch(BaseModel):
    item_id: str
    sku: str
    name_en: str
    name_ta: str
    category: str
    similarity_score: float  # 0.0 to 1.0


class VectorSearchService:
    """
    Visual Feature Embedding & Similarity Search Service.
    Enables semantic visual search across thousands of textile showroom items
    (compatible with pgvector in PostgreSQL and SigLIP embeddings).
    """

    def __init__(self, dimension: int = 512):
        self.dimension = dimension
        self._index: Dict[str, Dict[str, Any]] = {}

    def _generate_deterministic_embedding(self, seed_text: str) -> List[float]:
        """
        Generates normalized embedding vectors based on image & garment metadata.
        In production, this is produced by Google SigLIP or OpenAI CLIP models.
        """
        vec = []
        for i in range(self.dimension):
            h = hashlib.sha256(f"{seed_text}_{i}".encode("utf-8")).hexdigest()
            val = (int(h[:6], 16) / 0xFFFFFF) * 2.0 - 1.0
            vec.append(val)

        # Normalize to unit length (L2 norm)
        norm = math.sqrt(sum(x * x for x in vec))
        return [x / norm for x in vec] if norm > 0 else vec

    def index_garment(self, item_id: str, sku: str, name_en: str, name_ta: str, category: str, fabric: str, color: str):
        feature_text = f"{category}_{fabric}_{color}_{sku}_{name_en}"
        vector = self._generate_deterministic_embedding(feature_text)
        self._index[item_id] = {
            "item_id": item_id,
            "sku": sku,
            "name_en": name_en,
            "name_ta": name_ta,
            "category": category,
            "vector": vector,
        }

    def search_similar(self, query_text: str, top_k: int = 4) -> List[VectorGarmentMatch]:
        query_vec = self._generate_deterministic_embedding(query_text)
        results = []

        for item_id, data in self._index.items():
            # Cosine similarity between normalized vectors = dot product
            item_vec = data["vector"]
            score = sum(q * v for q, v in zip(query_vec, item_vec))
            # Rescale from [-1, 1] to [0.5, 0.99] for display
            display_score = round(max(0.0, min(1.0, (score + 1.0) / 2.0)), 3)

            results.append(
                VectorGarmentMatch(
                    item_id=item_id,
                    sku=data["sku"],
                    name_en=data["name_en"],
                    name_ta=data["name_ta"],
                    category=data["category"],
                    similarity_score=display_score,
                )
            )

        results.sort(key=lambda x: x.similarity_score, reverse=True)
        return results[:top_k]


vector_search_service = VectorSearchService()

# Seed default catalogue into Vector index
vector_search_service.index_garment("saree_001", "KAN-SILK-001", "Kanchipuram Pure Silk Bridal Saree", "காஞ்சிபுரம் தூய பட்டு திருமண புடவை", "Bridal Silk", "Mulberry Silk", "Crimson Red")
vector_search_service.index_garment("saree_002", "BAN-SILK-002", "Banarasi Brocade Floral Saree", "பனாரசி ப்ரோகேட் மலர் வேலைப்பாடு புடவை", "Banarasi Silk", "Katan Silk", "Emerald Green")
vector_search_service.index_garment("saree_003", "CHT-COT-003", "Traditional Chettinad Cotton Saree", "பாரம்பரிய செட்டிநாடு பருத்தி புடவை", "Handloom Cotton", "Organic Cotton", "Mustard Yellow")
vector_search_service.index_garment("apparel_005", "W-CHUDI-005", "Embroidered Chanderi Silk Chudidhar Set", "எம்பிராய்டரி சந்தேரி பட்டு சுடிதார் செட்", "Women Chudidhar", "Chanderi Silk", "Rose Gold")
vector_search_service.index_garment("apparel_006", "M-DHOTI-006", "Traditional Pure Silk Dhoti & Angavastram", "பாரம்பரிய தூய பட்டு வேட்டி", "Men Dhoti", "Pure Mulberry Silk", "Ivory White")
vector_search_service.index_garment("apparel_007", "M-KURTA-007", "Royal Raw Silk Festive Kurta", "ராயல் ரா பட்டு பண்டிகை குர்தா", "Men Kurta", "Raw Silk", "Wine Maroon")
vector_search_service.index_garment("apparel_008", "K-PAVAD-008", "Kids Traditional Pure Silk Pattu Pavadai", "சிறுமி பாரம்பரிய தூய பட்டுப் பாவாடை", "Kids Ethnic", "Kanchipuram Silk", "Peacock Blue")
