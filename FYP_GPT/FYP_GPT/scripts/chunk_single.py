import pdfplumber
import json
import re
import argparse
import os
from datetime import datetime
from collections import Counter

TOC_SIGNALS = [
    r'CONTENTS',
    r'TABLE OF CONTENTS',
    r'INDEX',
    r'SECTIONS\s*:',
    r'^\s*PART\s+[IVX]+\s*$',
]
TOC_COMPILED = [re.compile(p, re.MULTILINE) for p in TOC_SIGNALS]

# A TOC page typically has MANY section refs but very little body text.
# If ratio of header-like lines to total lines exceeds this, skip the page.
TOC_HEADER_RATIO_THRESHOLD = 0.4
TOC_MAX_PAGES = 35
MIN_CHARS_DEFAULT = 80
HEADER_FOOTER_MIN_PCT = 0.3
MAX_TITLE_LEN = 140

BODY_CUES = re.compile(
    r'\b(shall|may|whoever|liable|punishable|imprisonment|fine|means|includes|deemed|extends|subject to|provided that|is guilty)\b',
    re.IGNORECASE,
)


# ─────────────────────────────────────────────
#  CHAPTER / PART DETECTION
# ─────────────────────────────────────────────
CHAPTER_PATTERN = re.compile(
    r'^(CHAPTER|Chapter|PART|Part)\s+([\dIVXLCivxlc]+)\s*[:\.\-]?\s*(.*)',
    re.MULTILINE
)


# ─────────────────────────────────────────────
#  SECTION HEADER PATTERNS
# ─────────────────────────────────────────────
SECTION_PATTERNS = [
    # "Section 1", "SECTION 302", "Sec. 14A"
    re.compile(r'^(Section|SECTION|Sec\.?)\s+(\d+[\w\-\(\)]*)\s*[:\.\-]?\s*(.*)'),

    # "Article 1", "ARTICLE 25"
    re.compile(r'^(Article|ARTICLE|Art\.?)\s+(\d+[\w\-\(\)]*)\s*[:\.\-]?\s*(.*)'),

    # "302." or "52 A." — bare numbered sections
    re.compile(r'^(\d{1,4})\s*[-]?\s*([A-Z]{0,2})\.\s*([A-Z\[][^.—\n]{0,80})'),
]


# ─────────────────────────────────────────────
#  NOISE CLEANING
# ─────────────────────────────────────────────
def clean_text(text: str) -> str:
    """Remove PDF noise from extracted text."""

    # Fix hyphenated line breaks: "inter-\nnational" -> "international"
    text = re.sub(r'(\w)-\n(\w)', r'\1\2', text)

    # Remove footnote markers: "1[", "2[", "]", superscript-style digits mid-word
    text = re.sub(r'\d{0,2}\[', '', text)
    text = re.sub(r'\]', '', text)

    # Remove asterisk noise: "* * *", "* * * * *"
    text = re.sub(r'(\*\s*){2,}', '', text)

    # Remove standalone superscript numbers at start of line (footnote refs)
    text = re.sub(r'^\s*\d{1,2}\s+[A-Z]', lambda m: m.group().lstrip('0123456789 '), text, flags=re.MULTILINE)

    # Remove page numbers: "Page 1 of 178", standalone page numbers
    text = re.sub(r'Page\s+\d+\s+of\s+\d+', '', text, flags=re.IGNORECASE)
    text = re.sub(r'^\s*\d{1,4}\s*$', '', text, flags=re.MULTILINE)

    # Remove "Subs. by...", "Ins. by...", "Rep. by..." footnote lines
    text = re.sub(r'^\s*(Subs\.|Ins\.|Rep\.|Added|Omitted|Substituted).*$', '', text, flags=re.MULTILINE)

    # Collapse excessive blank lines
    text = re.sub(r'\n{3,}', '\n\n', text)

    return text.strip()


def normalize_line(line: str) -> str:
    return re.sub(r'\s+', ' ', line.strip())

INLINE_HEADER_SPLIT = re.compile(
    r'(?:(?<=\.)|(?<=\))|(?<=;)|(?<=:))\s+(?=(?:\d{1,2}\[\s*)?\d{1,4}[A-Za-z]{0,2}\.\s*[A-Z])'
)


def split_inline_sections(line: str) -> list:
    if not line:
        return []
    parts = re.split(INLINE_HEADER_SPLIT, line)
    return [p.strip() for p in parts if p and p.strip()]

def is_page_number_line(line: str) -> bool:
    if re.match(r'^Page\s+\d+\s+of\s+\d+$', line, flags=re.IGNORECASE):
        return True
    return False


def is_header_footer_candidate(line: str) -> bool:
    if not line:
        return False
    if len(line) > 80:
        return False
    if re.search(r'\b(Section|SECTION|Article|ARTICLE|Chapter|CHAPTER|Part|PART)\b', line):
        return False
    if is_page_number_line(line):
        return False
    return True


def find_repeated_lines(page_texts: list) -> set:
    top_counts = Counter()
    bottom_counts = Counter()
    total_pages = len(page_texts)
    threshold = max(2, int(total_pages * HEADER_FOOTER_MIN_PCT))

    for text in page_texts:
        if not text:
            continue
        lines = [normalize_line(l) for l in text.split('\n') if l.strip()]
        if not lines:
            continue
        if is_header_footer_candidate(lines[0]):
            top_counts[lines[0]] += 1
        if len(lines) > 1 and is_header_footer_candidate(lines[1]):
            top_counts[lines[1]] += 1
        if is_header_footer_candidate(lines[-1]):
            bottom_counts[lines[-1]] += 1
        if len(lines) > 1 and is_header_footer_candidate(lines[-2]):
            bottom_counts[lines[-2]] += 1

    repeated = {line for line, count in top_counts.items() if count >= threshold}
    repeated |= {line for line, count in bottom_counts.items() if count >= threshold}
    return repeated


def strip_header_footer(lines: list, repeated: set) -> list:
    if not repeated:
        return lines
    return [l for l in lines if normalize_line(l) not in repeated]


# ─────────────────────────────────────────────
#  TOC PAGE DETECTION
# ─────────────────────────────────────────────
def is_body_like_line(line: str) -> bool:
    if BODY_CUES.search(line) and len(line) >= 80:
        return True
    if len(line) >= 140 and re.search(r"[a-z].{20,}\.", line):
        return True
    return False


def is_header_like_line(line: str) -> bool:
    if re.match(r'^\d{1,4}[\.\s]+[A-Z]', line) and len(line) < 100:
        return True
    if re.search(r'\b\d{1,4}\.\s+\d{1,4}\.', line):
        return True
    if line.isupper() and len(line) < 60:
        return True
    return False


def is_toc_entry_line(line: str) -> bool:
    # Typical TOC entries: dotted leaders ending with a page number.
    if re.search(r'\.{2,}\s*\d+\s*$', line):
        return True
    # Another common TOC style: "302. Punishment for ... 35"
    if re.match(r'^\d{1,4}[A-Za-z]{0,2}\.\s+\S+.*\s+\d+\s*$', line) and len(line) < 160:
        return True
    # Chapter/Part headings with trailing page number
    if re.match(r'^(CHAPTER|Chapter|PART|Part)\s+[\dIVXLCivxlc]+\b.*\s+\d+\s*$', line):
        return True
    return False


def count_section_numbers(line: str) -> int:
    return len(re.findall(r'\b\d{1,4}[A-Za-z]{0,2}\.', line))


def is_toc_page(text: str, page_num: int, prev_toc: bool) -> bool:
    """Returns True if this page looks like a Table of Contents."""
    if not text:
        return False

    lines = [normalize_line(l) for l in text.split('\n') if l.strip()]
    if not lines:
        return False

    # Check for explicit TOC signals near the top
    top_block = " ".join(lines[:5]).upper()
    has_signal = any(re.search(pat, top_block) for pat in TOC_SIGNALS)

    header_like = sum(1 for l in lines if is_header_like_line(l))
    body_like = sum(1 for l in lines if is_body_like_line(l))
    dot_leader = sum(1 for l in lines if re.search(r'\.{3,}\s*\d+\s*$', l))
    multi_num = sum(1 for l in lines if count_section_numbers(l) >= 3)
    toc_entry = sum(1 for l in lines if re.match(r'^\d{1,4}[A-Za-z]{0,2}\.\s+\S+', l))
    sec_only = sum(1 for l in lines if re.match(r'^\d{1,4}[A-Za-z]{0,2}\.?(\s*)$', l))

    ratio = header_like / len(lines)
    short_ratio = sum(1 for l in lines if len(l) < 60) / len(lines)
    entry_ratio = (toc_entry + sec_only) / len(lines)

    if has_signal and (ratio > 0.2 or dot_leader >= 2 or short_ratio > 0.6):
        return True

    if has_signal and (entry_ratio > 0.25 or multi_num > 0):
        return True

    # Hard-stop: only keep TOC classification in the early pages or during a TOC run
    if page_num > TOC_MAX_PAGES and not prev_toc:
        return False

    if prev_toc and page_num <= TOC_MAX_PAGES:
        if (entry_ratio > 0.15 or multi_num > 0 or ratio > 0.25 or short_ratio > 0.65 or sec_only >= 5) and body_like <= 2:
            return True

    toc_score = 0
    if multi_num > 0:
        toc_score += 2
    if sec_only >= 5:
        toc_score += 1
    if entry_ratio > 0.3:
        toc_score += 1
    if ratio > 0.3:
        toc_score += 1
    if body_like <= 1:
        toc_score += 1
    if dot_leader >= 2:
        toc_score += 1

    if toc_score >= 3:
        return True

    if prev_toc and toc_score >= 2:
        return True

    return ratio > TOC_HEADER_RATIO_THRESHOLD and body_like <= 1 and len(lines) > 10


def looks_like_title(line: str) -> bool:
    if not line:
        return False
    if len(line) > MAX_TITLE_LEN:
        return False
    if re.match(r'^[a-z]', line):
        return False
    if re.match(r'^(Provided|Provided that|Whereas|Notwithstanding|Subject to)\b', line):
        return False
    if re.search(r'[;:]$', line):
        return False
    return True


def normalize_section_num(num: str) -> str:
    return re.sub(r'[^0-9A-Za-z]+', '', num)


def looks_like_section_number_only(line: str) -> bool:
    if re.match(r'^(Section|SECTION|Sec\.?|Article|ARTICLE|Art\.?)\s+\d+[\w\-\(\)]*\s*[:\.\-]?\s*$', line):
        return True
    if re.match(r'^\d{1,4}\s*[-]?\s*[A-Za-z]{0,2}\s*[\.\),]\s*$', line):
        return True
    return False


def match_section_header(lines: list, idx: int):
    line = lines[idx]
    line = re.sub(r'^\s*\d{1,2}\[', '', line).strip()
    line = line.replace(']', '')
    # Prevent TOC entries from becoming chunks if a TOC page slips through.
    if is_toc_entry_line(line):
        return False, None, None, 1
    if re.match(r'^(19|20)\d{2}\b', line):
        return False, None, None, 1
    if re.search(r'\b\d+s(?=\b|[).:;\s])', line):
        return False, None, None, 1
    if re.search(r'\b\d{1,4}\.\s+\d{1,4}\.', line):
        return False, None, None, 1

    # Keyword-based patterns
    for i, pattern in enumerate(SECTION_PATTERNS):
        match = pattern.match(line)
        if match:
            groups = match.groups()
            if i == 2:
                num = normalize_section_num(groups[0] + groups[1])
                title = groups[2].strip()
            else:
                num = normalize_section_num(groups[1])
                title = groups[2].strip() if len(groups) > 2 else ""

            consume = 1
            if not title and idx + 1 < len(lines):
                next_line = lines[idx + 1]
                if looks_like_title(next_line) and not looks_like_section_number_only(next_line):
                    title = next_line.strip()
                    consume = 2

            return True, num, title, consume

    # Bare number with optional title
    # Some PDFs format inserted sections like "26A, Title..." (comma instead of a dot).
    bare = re.match(r'^(\d{1,4})\s*[-]?\s*([A-Za-z]{0,2})\s*[\.\),]\s*(.*)$', line)
    if bare:
        num = normalize_section_num(bare.group(1) + bare.group(2))
        title = bare.group(3).strip()
        consume = 1
        if not title and idx + 1 < len(lines):
            next_line = lines[idx + 1]
            if looks_like_title(next_line) and not looks_like_section_number_only(next_line):
                title = next_line.strip()
                consume = 2
        return True, num, title, consume

    return False, None, None, 1


def match_chapter_line(lines: list, idx: int):
    line = lines[idx]
    match = CHAPTER_PATTERN.match(line)
    if not match:
        return False, "", 1

    label = match.group(1).title()
    num = match.group(2)
    title = match.group(3).strip()
    consume = 1
    if not title and idx + 1 < len(lines) and looks_like_title(lines[idx + 1]):
        title = lines[idx + 1].strip()
        consume = 2
    chapter = f"{label} {num}"
    if title:
        chapter += f" - {title}"
    return True, chapter, consume


# ─────────────────────────────────────────────
#  MAIN EXTRACTION
# ─────────────────────────────────────────────
def extract_chunks(pdf_path: str, law_name: str, min_chars: int = MIN_CHARS_DEFAULT) -> list:
    chunks = []
    current_section_num = None
    current_section_title = ""
    current_chapter = ""
    current_text_lines = []
    chunk_index = 0
    toc_pages_skipped = 0
    prev_toc = False

    print(f"\n📄 Opening: {pdf_path}")

    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)
        print(f"   Total pages: {total_pages}")

        page_texts = []
        for page in pdf.pages:
            page_texts.append(page.extract_text() or "")

        repeated_lines = find_repeated_lines(page_texts)

        for page_num, raw_text in enumerate(page_texts, start=1):
            if not raw_text:
                prev_toc = False
                continue

            # ── Skip TOC pages ──────────────────────────
            if is_toc_page(raw_text, page_num, prev_toc):
                toc_pages_skipped += 1
                prev_toc = True
                print(f"   ⏭  Skipped TOC page {page_num}")
                continue
            prev_toc = False
            lines = [normalize_line(l) for l in raw_text.split('\n') if l.strip()]
            lines = [l for l in lines if not is_page_number_line(l)]
            lines = strip_header_footer(lines, repeated_lines)
            expanded = []
            for l in lines:
                expanded.extend(split_inline_sections(l))
            lines = [l for l in expanded if l]

            # If a TOC page wasn't detected, still drop obvious TOC entry lines early on.
            if page_num <= TOC_MAX_PAGES:
                body_like = sum(1 for l in lines if is_body_like_line(l))
                tocish = sum(1 for l in lines if is_toc_entry_line(l))
                if tocish >= 8 and body_like <= 2:
                    lines = [l for l in lines if not is_toc_entry_line(l)]
            i = 0
            while i < len(lines):
                line = lines[i]
                if not line:
                    i += 1
                    continue

                # ── Track chapter changes ────────────────
                is_chapter, chapter_text, consume = match_chapter_line(lines, i)
                if is_chapter:
                    current_chapter = chapter_text
                    i += consume
                    continue

                # ── Check for section header ─────────────
                is_header, sec_num, sec_title, consume = match_section_header(lines, i)
                if is_header:
                    if current_section_num and current_text_lines:
                        body = clean_text('\n'.join(current_text_lines))
                        if len(body) > min_chars:
                            chunks.append({
                                "id": f"{law_name}_{chunk_index:04d}",
                                "law": law_name,
                                "chapter": current_chapter,
                                "section_number": current_section_num,
                                "section_title": current_section_title,
                                "text": body,
                                "char_count": len(body),
                                "page_approx": page_num
                            })
                            chunk_index += 1

                    current_section_num = sec_num
                    current_section_title = sec_title
                    current_text_lines = [line]
                    if consume == 2 and i + 1 < len(lines):
                        current_text_lines.append(lines[i + 1])
                    i += consume
                    continue

                if current_section_num is not None:
                    current_text_lines.append(line)
                i += 1

        # Save final section
        if current_section_num and current_text_lines:
            body = clean_text('\n'.join(current_text_lines))
            if len(body) > min_chars:
                chunks.append({
                    "id": f"{law_name}_{chunk_index:04d}",
                    "law": law_name,
                    "chapter": current_chapter,
                    "section_number": current_section_num,
                    "section_title": current_section_title,
                    "text": body,
                    "char_count": len(body),
                    "page_approx": page_num
                })

    print(f"   ⏭  TOC pages skipped: {toc_pages_skipped}")
    return chunks


# ─────────────────────────────────────────────
#  SAVE + PREVIEW
# ─────────────────────────────────────────────
def save_json(chunks: list, law_name: str, output_dir: str):
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{law_name}.json")

    output = {
        "law": law_name,
        "processed_at": datetime.now().isoformat(),
        "total_chunks": len(chunks),
        "chunks": chunks
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Saved {len(chunks)} chunks → {output_path}")
    return output_path


def print_preview(chunks: list, n: int = 3):
    print(f"\n{'='*60}")
    print(f"PREVIEW — First {n} chunks:")
    print('='*60)
    for chunk in chunks[:n]:
        print(f"\n🔹 ID:      {chunk['id']}")
        print(f"   Chapter: {chunk['chapter']}")
        print(f"   Section: {chunk['section_number']} — {chunk['section_title']}")
        print(f"   Chars:   {chunk['char_count']}")
        print(f"   Text:    {chunk['text'][:300]}...")
    print('='*60)


# ─────────────────────────────────────────────
#  MAIN
# ─────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", required=True)
    parser.add_argument("--law", required=True)
    parser.add_argument("--out", default="../data/processed")
    parser.add_argument("--min-chars", type=int, default=MIN_CHARS_DEFAULT)
    args = parser.parse_args()

    if not os.path.exists(args.pdf):
        print(f"❌ PDF not found: {args.pdf}")
        exit(1)

    chunks = extract_chunks(args.pdf, args.law, min_chars=args.min_chars)

    if not chunks:
        print("\n⚠️  WARNING: No chunks extracted — check patterns for this law")
    else:
        print_preview(chunks)
        save_json(chunks, args.law, args.out)
        print(f"\n📊 Stats: {len(chunks)} total chunks")




