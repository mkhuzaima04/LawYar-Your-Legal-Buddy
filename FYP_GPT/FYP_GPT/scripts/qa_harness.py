import os
import re
import json
import argparse

from retrieval import LegalRetriever

# Reuse the same retrieval pipeline helpers as main.py
from main import (
    expand_queries,
    collect_candidates,
    _add_law_bias_candidates,
    _add_section_fallbacks,
    _add_crpc_schedule_snippet,
)


def _law_key(law: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (law or "").lower())


def _norm_section_num(value: str) -> str:
    v = str(value or "").strip()
    if v.lower().startswith("schedule"):
        v = "Schedule II"
    return re.sub(r"[^0-9A-Za-z]", "", v).upper()


def _parse_expected_section(s: str, default_law: str = None):
    s = (s or "").strip()
    if not s:
        return None

    if ":" in s:
        law, sec = s.split(":", 1)
        return _law_key(law), sec.strip()

    # If it's just a number and default law is provided
    if default_law and re.fullmatch(r"\d+[A-Za-z]?", s):
        return _law_key(default_law), s

    # Otherwise, assume first token is law, rest is section
    parts = s.split()
    if len(parts) == 1 and default_law:
        return _law_key(default_law), parts[0]
    if len(parts) >= 2:
        law = parts[0]
        sec = " ".join(parts[1:])
        return _law_key(law), sec.strip()

    return None


def _normalize_expected_sections(case: dict):
    expected = []
    default_law = case.get("law_filter")

    for item in case.get("expected_sections", []):
        if isinstance(item, dict):
            law = item.get("law") or default_law
            sec = item.get("section") or item.get("section_number") or item.get("section_id")
            if law and sec:
                sec_val = _norm_section_num(sec)
                expected.append((_law_key(law), sec_val))
        elif isinstance(item, str):
            parsed = _parse_expected_section(item, default_law)
            if parsed:
                law, sec = parsed
                expected.append((law, _norm_section_num(sec)))

    return expected


def _normalize_expected_laws(case: dict):
    return [_law_key(l) for l in case.get("expected_laws", []) if l]


def _build_found(results):
    found = set()
    for r in results:
        law = _law_key(r.get("law"))
        sec = _norm_section_num(r.get("section_number"))
        found.add((law, sec))
    return found


def _rank_lookup(results):
    lookup = {}
    for i, r in enumerate(results, start=1):
        key = (_law_key(r.get("law")), _norm_section_num(r.get("section_number")))
        if key not in lookup:
            lookup[key] = i
    return lookup


def _make_summary_table(summary: dict):
    rows = [
        {"metric": "Total", "value": summary["total"]},
        {"metric": "Passed", "value": summary["passed"]},
        {"metric": "Accuracy", "value": f"{summary['accuracy']:.2f}"},
    ]

    if summary.get("avg_section_recall") is not None:
        rows.append({
            "metric": "Avg Section Recall",
            "value": f"{summary['avg_section_recall']:.2f}",
        })
    else:
        rows.append({"metric": "Avg Section Recall", "value": "n/a"})

    md_lines = ["| Metric | Value |", "|---|---|"]
    for row in rows:
        md_lines.append(f"| {row['metric']} | {row['value']} |")

    return rows, "\n".join(md_lines)


def _pair_to_str(pair):
    law, sec = pair
    return f"{law.upper()} {sec}"


def _list_to_str(pairs, max_items=6):
    if not pairs:
        return ""
    items = [_pair_to_str(p) for p in pairs[:max_items]]
    if len(pairs) > max_items:
        items.append(f"+{len(pairs) - max_items} more")
    return "; ".join(items)


def _rank_str(ranks: dict, expected_pairs: list):
    if not expected_pairs:
        return ""
    parts = []
    for law, sec in expected_pairs:
        key = f"{law}:{sec}"
        rank = ranks.get(key)
        rank_val = "n/a" if rank is None else str(rank)
        parts.append(f"{law.upper()} {sec}: {rank_val}")
    return "; ".join(parts)


def _build_markdown_report(summary_md: str, results_out: list) -> str:
    lines = []
    lines.append("# QA Report")
    lines.append("")
    lines.append("## Summary")
    lines.append("")
    lines.append(summary_md)
    lines.append("")

    lines.append("## Cases")
    lines.append("")
    lines.append("| ID | Question | Expected | Passed | Missing | Ranks |")
    lines.append("|---|---|---|---|---|---|")
    for r in results_out:
        expected = _list_to_str(r.get("expected_sections", []))
        missing = _list_to_str(r.get("missing", []))
        ranks = _rank_str(r.get("ranks", {}), r.get("expected_sections", []))
        passed = "Yes" if r.get("passed") else "No"
        q = (r.get("question") or "").replace("|", "\\|")
        lines.append(f"| {r.get('id')} | {q} | {expected} | {passed} | {missing} | {ranks} |")

    misses = [r for r in results_out if not r.get("passed")]
    if misses:
        lines.append("")
        lines.append("## Miss Details")
        lines.append("")
        lines.append("| ID | Question | Expected | Found (Top K) |")
        lines.append("|---|---|---|---|")
        for r in misses:
            expected = _list_to_str(r.get("expected_sections", []))
            found = _list_to_str(r.get("found_sections", []), max_items=10)
            q = (r.get("question") or "").replace("|", "\\|")
            lines.append(f"| {r.get('id')} | {q} | {expected} | {found} |")

    return "\n".join(lines)


def run_case(retriever, case, top_k, candidate_k, rerank=True):
    question = case["question"]
    law_filter = case.get("law_filter")

    queries = expand_queries(question)
    candidates = collect_candidates(
        retriever,
        queries,
        candidate_k=candidate_k,
        law_filter=law_filter,
        min_score=case.get("min_score"),
    )

    _add_law_bias_candidates(retriever, candidates, question, candidate_k)
    pinned_ids = _add_section_fallbacks(retriever, candidates, question)
    pinned_ids.update(_add_crpc_schedule_snippet(retriever, candidates, question))

    candidate_list = list(candidates.values())
    if rerank and getattr(retriever, "reranker", None):
        results = retriever._rerank(question, candidate_list, top_k)
    else:
        candidate_list.sort(key=lambda x: x.get("score", 0), reverse=True)
        results = candidate_list[:top_k]

    # Ensure pinned appear in results
    if pinned_ids:
        existing = {r.get("chunk_id") for r in results}
        for pid in pinned_ids:
            if pid in existing:
                continue
            if pid in candidates:
                results.append(candidates[pid])

    return results


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--qa", default="D:/FYP_GPT/data/qa/qa_set.json")
    parser.add_argument("--report", default="D:/FYP_GPT/data/qa/qa_report.json")
    parser.add_argument("--report-md", default="D:/FYP_GPT/data/qa/qa_report.md")
    parser.add_argument("--index-dir", default="D:/FYP_GPT/data/index")
    parser.add_argument("--embed-model", default="intfloat/multilingual-e5-base")
    parser.add_argument("--reranker", default="cross-encoder/ms-marco-MiniLM-L-6-v2")
    parser.add_argument("--device", default=None)
    parser.add_argument("--top-k", type=int, default=10)
    parser.add_argument("--candidate-k", type=int, default=50)
    parser.add_argument("--no-rerank", action="store_true")
    parser.add_argument("--max-examples", type=int, default=None)
    parser.add_argument("--show-misses", action="store_true")
    args = parser.parse_args()

    if not os.path.exists(args.qa):
        raise FileNotFoundError(f"QA file not found: {args.qa}")

    with open(args.qa, "r", encoding="utf-8") as f:
        cases = json.load(f)

    if args.max_examples:
        cases = cases[: args.max_examples]

    retriever = LegalRetriever(
        index_dir=args.index_dir,
        model_name=args.embed_model,
        reranker_model=None if args.no_rerank else args.reranker,
        device=args.device,
    )

    results_out = []
    total = 0
    pass_count = 0
    recall_sum = 0.0
    recall_n = 0

    for case in cases:
        total += 1
        res = run_case(
            retriever,
            case,
            top_k=args.top_k,
            candidate_k=args.candidate_k,
            rerank=not args.no_rerank,
        )

        expected_sections = _normalize_expected_sections(case)
        expected_laws = _normalize_expected_laws(case)
        found = _build_found(res)
        rank_lookup = _rank_lookup(res)

        hits = []
        missing = []
        for ex in expected_sections:
            if ex in found:
                hits.append(ex)
            else:
                missing.append(ex)

        law_hit = False
        if expected_laws:
            found_laws = {law for (law, _) in found}
            law_hit = any(l in found_laws for l in expected_laws)

        # Pass criteria
        if expected_sections:
            passed = len(missing) == 0
            recall = len(hits) / max(1, len(expected_sections))
            recall_sum += recall
            recall_n += 1
        else:
            passed = law_hit
            recall = None

        if passed:
            pass_count += 1

        result_entry = {
            "id": case.get("id"),
            "question": case.get("question"),
            "expected_sections": expected_sections,
            "expected_laws": expected_laws,
            "found_sections": sorted(list(found)),
            "hits": hits,
            "missing": missing,
            "law_hit": law_hit,
            "passed": passed,
            "top_k": args.top_k,
            "ranks": {f"{k[0]}:{k[1]}": rank_lookup.get(k) for k in expected_sections},
        }
        results_out.append(result_entry)

        if args.show_misses and not passed:
            print(f"\nMISS: {case.get('question')}")
            if missing:
                print(f"  missing sections: {missing}")
            if expected_laws and not law_hit:
                print(f"  missing laws: {expected_laws}")

    summary = {
        "total": total,
        "passed": pass_count,
        "accuracy": (pass_count / total) if total else 0,
        "avg_section_recall": (recall_sum / recall_n) if recall_n else None,
    }

    summary_rows, summary_md = _make_summary_table(summary)

    report = {
        "summary": summary,
        "summary_table": summary_rows,
        "summary_table_md": summary_md,
        "results": results_out,
    }

    os.makedirs(os.path.dirname(args.report), exist_ok=True)
    with open(args.report, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    if args.report_md:
        md = _build_markdown_report(summary_md, results_out)
        os.makedirs(os.path.dirname(args.report_md), exist_ok=True)
        with open(args.report_md, "w", encoding="utf-8") as f:
            f.write(md)

    print("\nQA SUMMARY")
    print(f"  Total:   {summary['total']}")
    print(f"  Passed:  {summary['passed']}")
    print(f"  Acc:     {summary['accuracy']:.2f}")
    if summary["avg_section_recall"] is not None:
        print(f"  Recall:  {summary['avg_section_recall']:.2f}")

    print("\nSUMMARY TABLE")
    print(summary_md)
    print(f"\nReport saved to: {args.report}")
    if args.report_md:
        print(f"Markdown report saved to: {args.report_md}")


if __name__ == "__main__":
    main()
