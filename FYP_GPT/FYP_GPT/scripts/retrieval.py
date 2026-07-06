import os
import json
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer, CrossEncoder


class LegalRetriever:
    def __init__(
        self,
        index_dir="D:/FYP_GPT/data/index",
        model_name="intfloat/multilingual-e5-base",
        reranker_model="cross-encoder/ms-marco-MiniLM-L-6-v2",
        device=None,
    ):
        print("Loading metadata...")
        meta_path = os.path.join(index_dir, "metadata.json")
        with open(meta_path, "r", encoding="utf-8") as f:
            self.metadata = json.load(f)

        print("Loading FAISS index...")
        index_path = os.path.join(index_dir, "faiss.index")
        self.index = faiss.read_index(index_path)

        print(f"Loading embedding model: {model_name}...")
        self.model = SentenceTransformer(model_name, device=device)

        self.use_e5 = "e5" in model_name.lower()
        self.model_name = model_name
        self.device = device

        self.reranker = None
        if reranker_model:
            print(f"Loading reranker: {reranker_model}...")
            self.reranker = CrossEncoder(reranker_model, device=device)
            self.reranker_name = reranker_model
        else:
            self.reranker_name = None

        print("Retriever is ready.\n")

    def _encode_query(self, query: str):
        query_text = f"query: {query}" if self.use_e5 else query
        vec = self.model.encode([query_text], normalize_embeddings=True)
        return np.asarray(vec, dtype="float32")

    def _rerank(self, query: str, candidates: list, top_k: int):
        if not self.reranker or not candidates:
            return candidates[:top_k]

        pairs = [(query, c["text"]) for c in candidates]
        scores = self.reranker.predict(pairs)

        for c, s in zip(candidates, scores):
            c["rerank_score"] = float(s)

        candidates.sort(key=lambda x: x["rerank_score"], reverse=True)
        return candidates[:top_k]

    def search(self, query: str, top_k: int = 3, law_filter: str = None, min_score: float = None, rerank: bool = True):
        if not query or not query.strip():
            return []

        query_vector = self._encode_query(query.strip())

        # Fetch more for reranking and/or law filtering
        if law_filter or rerank:
            fetch_k = min(len(self.metadata), max(top_k * 10, 50))
        else:
            fetch_k = min(len(self.metadata), top_k)

        distances, indices = self.index.search(query_vector, fetch_k)

        candidates = []
        for i, idx in enumerate(indices[0]):
            if idx == -1:
                continue

            chunk_meta = self.metadata[idx]

            if law_filter and chunk_meta.get("law") != law_filter:
                continue

            score = float(distances[0][i])
            if min_score is not None and score < min_score:
                continue

            candidates.append({
                "score": score,
                "law": chunk_meta.get("law"),
                "section_number": chunk_meta.get("section_number"),
                "section_title": chunk_meta.get("section_title"),
                "section": f"Section {chunk_meta.get('section_number')} - {chunk_meta.get('section_title')}",
                "chunk_id": chunk_meta.get("id"),
                "page_approx": chunk_meta.get("page_approx"),
                "text": chunk_meta.get("text"),
            })

        if rerank:
            return self._rerank(query, candidates, top_k)

        return candidates[:top_k]


if __name__ == "__main__":
    retriever = LegalRetriever()

    test_query = "What are the rules for qatl-i-amd and giving diyat?"

    print(f"Searching for: '{test_query}'")

    results = retriever.search(test_query, top_k=3, law_filter="PPC", rerank=True)

    print("\n" + "=" * 50)
    for i, res in enumerate(results, 1):
        print(f"RESULT {i} (Similarity Score: {res['score']:.4f})")
        if "rerank_score" in res:
            print(f"Rerank Score: {res['rerank_score']:.4f}")
        print(f"Law: {res['law']}")
        print(f"Heading: {res['section']}")
        print(f"Chunk ID: {res['chunk_id']} | Page: {res['page_approx']}")
        print(f"Text Preview: {res['text'][:250]}...")
        print("-" * 50)
