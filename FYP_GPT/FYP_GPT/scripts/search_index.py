import os
import json
import argparse

import numpy as np
import faiss
from sentence_transformers import SentenceTransformer


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--index", default="D:/FYP_GPT/data/index/faiss.index")
    parser.add_argument("--meta", default="D:/FYP_GPT/data/index/metadata.json")
    parser.add_argument("--model", default="intfloat/multilingual-e5-base")
    parser.add_argument("--query", required=True)
    parser.add_argument("--top-k", type=int, default=5)
    parser.add_argument("--device", default=None)
    args = parser.parse_args()

    if not os.path.exists(args.index):
        raise FileNotFoundError(f"Index not found: {args.index}")
    if not os.path.exists(args.meta):
        raise FileNotFoundError(f"Metadata not found: {args.meta}")

    with open(args.meta, "r", encoding="utf-8") as f:
        metadata = json.load(f)

    index = faiss.read_index(args.index)
    model = SentenceTransformer(args.model, device=args.device)

    query = args.query.strip()
    if "e5" in args.model.lower():
        query = "query: " + query

    q_emb = model.encode([query], normalize_embeddings=True)
    q_emb = np.asarray(q_emb, dtype="float32")

    scores, idxs = index.search(q_emb, args.top_k)

    print(f"\nTop {args.top_k} results for: {args.query}\n")
    for rank, (score, idx) in enumerate(zip(scores[0], idxs[0]), start=1):
        if idx < 0 or idx >= len(metadata):
            continue
        m = metadata[idx]
        print(f"{rank}. {m.get('law')} | Section {m.get('section_number')} — {m.get('section_title')}")
        print(f"   Score: {score:.4f} | Chunk ID: {m.get('id')}")
        text = (m.get("text") or "").strip().replace("\n", " ")
        print(f"   {text[:400]}...")
        print()


if __name__ == "__main__":
    main()
