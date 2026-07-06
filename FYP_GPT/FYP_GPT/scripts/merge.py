import os
import json
from datetime import datetime

BASE_DIR = os.path.dirname(__file__)
PROCESSED_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "data", "processed"))
MERGED_DIR    = os.path.abspath(os.path.join(BASE_DIR, "..", "data", "merged"))
OUTPUT_FILE   = os.path.join(MERGED_DIR, "all_laws.json")


def merge_all():
    json_files = [
        f for f in os.listdir(PROCESSED_DIR)
        if f.endswith(".json") and not f.startswith("_")  # skip log files
    ]

    if not json_files:
        print(f"No JSON files found in {PROCESSED_DIR}")
        return

    print(f"\nFound {len(json_files)} law JSONs to merge")

    all_chunks = []
    law_stats = []

    for filename in sorted(json_files):
        path = os.path.join(PROCESSED_DIR, filename)
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        chunks = data.get("chunks", [])
        all_chunks.extend(chunks)
        law_stats.append({
            "law": data.get("law"),
            "chunks": len(chunks)
        })
        print(f"  {data.get('law'):30s} → {len(chunks):4d} chunks")

    # Build final merged DB
    merged = {
        "merged_at": datetime.now().isoformat(),
        "total_laws": len(json_files),
        "total_chunks": len(all_chunks),
        "law_breakdown": law_stats,
        "chunks": all_chunks
    }

    os.makedirs(MERGED_DIR, exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*60}")
    print(f"Merged DB saved → {OUTPUT_FILE}")
    print(f"   Total laws  : {len(json_files)}")
    print(f"   Total chunks: {len(all_chunks)}")
    print(f"{'='*60}")


if __name__ == "__main__":
    merge_all()


