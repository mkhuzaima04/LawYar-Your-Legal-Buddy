import os
import json
import argparse
from datetime import datetime

import numpy as np
import faiss
from sentence_transformers import SentenceTransformer


def build_text(chunk: dict) -> str:
    law = chunk.get("law", "")
    sec_num = chunk.get("section_number", "")
    sec_title = chunk.get("section_title", "")
    text = chunk.get("text", "")

    return f"{law} Section {sec_num}: {sec_title}.\n{text}".strip()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="D:/FYP_GPT/data/merged/all_laws.json")
    parser.add_argument("--out-dir", default="D:/FYP_GPT/data/index")
    parser.add_argument("--model", default="intfloat/multilingual-e5-base")
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--max-chars", type=int, default=0, help="0 = no truncation")
    parser.add_argument("--device", default=None, help="e.g. cpu or cuda")
    args = parser.parse_args()

    if not os.path.exists(args.input):
        raise FileNotFoundError(f"Merged JSON not found: {args.input}")

    with open(args.input, "r", encoding="utf-8") as f:
        data = json.load(f)

    chunks = data.get("chunks", [])
    if not chunks:
        raise ValueError("No chunks found in merged JSON")

    texts = []
    metadata = []

    use_e5 = "e5" in args.model.lower()
    for idx, ch in enumerate(chunks):
        text = build_text(ch)
        if args.max_chars and len(text) > args.max_chars:
            text = text[: args.max_chars]
        if use_e5:
            text = "passage: " + text
        texts.append(text)
        metadata.append({
            "index": idx,
            "id": ch.get("id"),
            "law": ch.get("law"),
            "chapter": ch.get("chapter"),
            "section_number": ch.get("section_number"),
            "section_title": ch.get("section_title"),
            "page_approx": ch.get("page_approx"),
            "char_count": ch.get("char_count"),
            "text": ch.get("text"),
        })

    model = SentenceTransformer(args.model, device=args.device)
    embeddings = model.encode(
        texts,
        batch_size=args.batch_size,
        show_progress_bar=True,
        normalize_embeddings=True,
    )

    embeddings = np.asarray(embeddings, dtype="float32")
    dim = embeddings.shape[1]

    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)

    os.makedirs(args.out_dir, exist_ok=True)
    index_path = os.path.join(args.out_dir, "faiss.index")
    meta_path = os.path.join(args.out_dir, "metadata.json")
    info_path = os.path.join(args.out_dir, "index_info.json")

    faiss.write_index(index, index_path)

    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False)

    info = {
        "created_at": datetime.now().isoformat(),
        "model": args.model,
        "vector_dim": dim,
        "num_chunks": len(metadata),
        "input": os.path.abspath(args.input),
        "index": os.path.abspath(index_path),
        "metadata": os.path.abspath(meta_path),
        "normalize_embeddings": True,
        "distance": "cosine (via inner product)",
        "notes": "Use 'query: ' prefix for e5 models during search.",
    }

    with open(info_path, "w", encoding="utf-8") as f:
        json.dump(info, f, indent=2)

    print("Index built successfully")
    print(f"Chunks: {len(metadata)}")
    print(f"Dim: {dim}")
    print(f"Index: {index_path}")
    print(f"Metadata: {meta_path}")


if __name__ == "__main__":
    main()
