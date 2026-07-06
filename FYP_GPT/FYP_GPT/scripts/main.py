import os
import re
import time
import argparse
from typing import List, Dict

from openai import OpenAI, RateLimitError, APIError, APITimeoutError, APIConnectionError

try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None
from retrieval import LegalRetriever

DEFAULT_INDEX_DIR = "D:/FYP_GPT/data/index"
DEFAULT_EMBED_MODEL = "intfloat/multilingual-e5-base"
DEFAULT_RERANKER = "cross-encoder/ms-marco-MiniLM-L-6-v2"


ALLOWED_MODELS = [
    "google/gemini-2.5-flash",
    "openai/gpt-oss-120b:free",
]
DEFAULT_MODEL = "google/gemini-2.5-flash"
DEFAULT_MODELS = ALLOWED_MODELS[:]

SYSTEM_PROMPT = (
    "You are LawYar, an expert assistant on Pakistani law. "
    "Answer using the provided context. "
    "Explain in simple language for a non-lawyer. "
    "Prefer short sentences and everyday words; if you use legal terms, explain them briefly. "
    "Cite each claim in parentheses with the law and section, for example: (PPC Section 379). "
    "If the answer is not in the context, say: 'I cannot find that information in the provided laws.'\n\n"
    "CRITICAL LANGUAGE RULE: Detect the language of the user's query. "
    "If the user asks in English, reply in English. "
    "If the user asks in Urdu OR Roman Urdu (e.g., 'chori ki saza'), reply entirely in Urdu script."
)
SYSTEM_PROMPT_STRICT = (
    "You are LawYar, an expert assistant on Pakistani law. "
    "Answer only using the provided context. "
    "Do not infer or add facts not explicitly stated. "
    "Explain in simple language for a non-lawyer. "
    "Prefer short sentences and everyday words; if you use legal terms, explain them briefly. "
    "Use short bullet points, and end every bullet with a citation in parentheses. "
    "If the answer is not in the context, say: 'I cannot find that information in the provided laws.'\n\n"
    "CRITICAL LANGUAGE RULE: Detect the language of the user's query. "
    "If the user asks in English, reply in English. "
    "If the user asks in Urdu OR Roman Urdu (e.g., 'chori ki saza'), reply entirely in Urdu script."
)

SYSTEM_PROMPT_URDU_LENIENT = (
    "You are LawYar, an expert assistant on Pakistani law. "
    "Always reply entirely in Urdu script. "
    "Explain in simple language for a non-lawyer. "
    "Prefer short sentences and everyday words; if you use legal terms, explain them briefly. "
    "Use the provided context as the primary source. "
    "If the context is missing an exact detail, give best-effort guidance and list the most likely relevant laws/sections, "
    "but clearly label it as general guidance and do not invent exact punishments unless they are shown in the context."
)


def contains_urdu(text: str) -> bool:
    # Arabic/Urdu block: U+0600–U+06FF
    return bool(re.search(r"[\u0600-\u06FF]", text or ""))


def normalize_query(q: str) -> str:
    q = (q or "").strip()
    # Remove Arabic diacritics (e.g., in "قتلِ") to make simple regex matching work.
    q = re.sub(r"[\u064B-\u065F\u0670]", "", q)

    # Urdu -> English/legal-term mapping for retrieval.
    # Keyword-focused (not a full translator).
    urdu_map = [
        (r"قتل\s*عمد", "qatl e amd"),
        (r"قتل\s*امد", "qatl e amd"),
        (r"قتل", "qatl"),
        (r"دیت", "diyat"),
        (r"قصاص", "qisas"),
        (r"چوری", "theft"),
        (r"ڈکیتی", "dacoity"),
        (r"اغوا|اغواء", "kidnapping"),
        (r"ہتک\s*عزت|بدنامی", "defamation"),
        (r"بلیک\s*میل", "blackmail"),
        (r"منشیات", "narcotics"),
        (r"ہیروئن", "heroin"),
        (r"چرس", "charas"),
        (r"کوکین", "cocaine"),
        (r"جعلی", "fake"),
        (r"جھوٹی\s*(گواہی|شہادت)", "false evidence"),
        (r"جھوٹ", "false"),
        (r"گواہی|شہادت", "evidence"),
        (r"ہراسانی", "harassment"),
        (r"پولیس", "police"),
        (r"مجسٹریٹ", "magistrate"),
        (r"گرفتار(ی)?", "arrest"),
        (r"حراست", "custody"),
        (r"قتل\s*خطا", "qatl i khata"),
        (r"قتل\s*شبہ\s*عمد", "qatl shibh i amd"),
        (r"ارش", "arsh"),
        (r"دَمن|دمان", "daman"),
        (r"راہزنی", "robbery"),
        (r"تاوان", "ransom"),
        (r"غیر\s*قانونی\s*حراست", "wrongful confinement"),
        (r"دھمکی(اں)?", "threat"),
        (r"بھتہ", "extortion"),
        (r"افیون", "opium"),
        (r"بھنگ", "bhang"),
        (r"فیس\s*بک|فیس\u200cبک", "facebook"),
        (r"واٹس\s*ایپ|واٹس\u200cایپ", "whatsapp"),
        (r"انسٹا\s*گرام", "instagram"),
        (r"سوشل\s*میڈیا", "social media"),
        (r"فوٹوشاپ", "photoshopped"),
        (r"تصویر(یں)?", "photo"),
        (r"ویڈیو", "video"),
        (r"اکاؤنٹ", "account"),
        (r"زیادتی|عصمت\s*دری", "zina bil jabr"),
        (r"ضمانت", "bail"),
        (r"وارنٹ", "warrant"),
        (r"تلاشی", "search"),
        (r"عدالت", "court"),
        (r"کرایہ|مالک\s*مکان|کرایہ\s*دار", "landlord tenant rent"),
        (r"بے\s*دھلی|نکالنا", "evict eviction vacate"),
        (r"شوہر|مار\s*پیٹ|گھریلو\s*تشدد", "husband domestic abuse violence"),
    ]
    for pat, rep in urdu_map:
        q = re.sub(pat, rep, q, flags=re.IGNORECASE)

    q = q.lower().strip()
    q = re.sub(r"[-_]+", " ", q)
    q = re.sub(r"\s+", " ", q).strip()

    # Roman Urdu / Hinglish spellings that commonly appear in user queries.
    roman_urdu_map = [
        (r"\bchori\b", "theft"),
        (r"\bchor\b", "theft"),
        (r"\bchori\s+ki\s+saza\b", "punishment for theft"),
        (r"\bdaka(i)?ti\b|\bdakayti\b|\bdacoity\b", "dacoity"),
        (r"\bqatl[-\s]?e[-\s]?amd\b|\bqatl[-\s]?i[-\s]?amd\b", "qatl e amd"),
        (r"\bqisas\b", "qisas"),
        (r"\bdiyat\b", "diyat"),
        (r"\bharasan(i)?\b", "harassment"),
        (r"\bdhamki\b|\bdhamk(i|iyan)\b", "threat"),
        (r"\bzamanat\b|\bzamaanat\b", "bail"),
        (r"\bgiriftar(i)?\b", "arrest"),
        (r"\bhirasat\b", "custody"),
        (r"\btalash\b|\btalaash\b", "search"),
        (r"\bwhatsapp\b|\bwa\s*ts\s*app\b", "whatsapp"),
        (r"\bfacebook\b|\bfb\b", "facebook"),
        (r"\b24\s*ghante\b", "24 hours"),
        (r"\bjhoti\s*gawahi\b|\bjhooti\s*gawahi\b", "false evidence"),
        (r"\bmalik\s*makan\b|\bkirayedar\b|\bkarayedar\b", "landlord tenant"),
        (r"\bshohar\b|\bmiyan\b|\bmar\s*pit\b|\bgharelu\s*tashaddud\b", "husband domestic violence abuse"),
    ]
    for pat, rep in roman_urdu_map:
        q = re.sub(pat, rep, q, flags=re.IGNORECASE)

    # Scenario -> legal-term mapping (helps retrieval when users don't name the exact section).
    replacements = {
        # Common crimes and keywords
        "murder": "qatl e amd",
        "homicide": "qatl e amd",
        "killing": "qatl e amd",
        "rape": "zina bil jabr",
        "sexual assault": "zina bil jabr",
        "sexual harassment": "harassment",
        "stealing": "theft",
        "stole": "theft",
        "pickpocket": "theft",
        "pickpocketing": "theft",
        "robbery": "dacoity",
        "snatching": "dacoity",
        "kidnap": "kidnapping",
        "false testimony": "false evidence",
        "perjury": "false evidence",
        "false statement": "false evidence",
        "photoshopped": "fake",
        "deepfake": "fake",
        "impersonation": "spoofing",
        "fake profile": "fake account",
        "fake account": "spoofing",
        "threatening": "threat",
        "threaten": "threat",
        "extortion": "criminal intimidation",
        "self defense": "private defence",
        "self-defence": "private defence",
        "private defense": "private defence",

        # Business/embezzlement
        "embezzlement": "criminal breach of trust",
        "misappropriation": "criminal breach of trust",
        "misappropriate": "criminal breach of trust",
        "breach of trust": "criminal breach of trust",
        "diverted funds": "criminal breach of trust",
        "diverted money": "criminal breach of trust",
        "company funds": "criminal breach of trust",
        "company money": "criminal breach of trust",
        "business funds": "criminal breach of trust",
        "business money": "criminal breach of trust",
        "partner transferred": "criminal breach of trust",
        "partner took": "criminal breach of trust",
        "partner moved": "criminal breach of trust",
    }
    for k, v in replacements.items():
        if k in q:
            q = q.replace(k, v)

    return q


def _norm_section_num(value: str) -> str:
    return re.sub(r"[^0-9A-Za-z]", "", str(value or "")).upper()


def expand_queries(q: str) -> List[str]:
    variants = []
    if q and q.strip():
        variants.append(q.strip())

    norm = normalize_query(q)
    if norm and norm not in variants:
        variants.append(norm)

    # Small, targeted romanization fallback for qatl-i-amd style terms
    if "qatl i amd" in norm:
        variants.append(norm.replace("qatl i amd", "qatl e amd"))
        variants.append(norm.replace("qatl i amd", "qatl-i-amd"))
        variants.append(norm.replace("qatl i amd", "qatl-e-amd"))
    elif "qatl e amd" in norm:
        variants.append(norm.replace("qatl e amd", "qatl i amd"))
        variants.append(norm.replace("qatl e amd", "qatl-i-amd"))
        variants.append(norm.replace("qatl e amd", "qatl-e-amd"))

    # Murder / qatl scenarios: add highly targeted retrieval variants
    if any(t in norm for t in ["qatl", "murder", "homicide", "killing", "qisas", "diyat"]):
        variants.append("punishment of qatl e amd")
        variants.append("PPC section 302 punishment of qatl e amd")
        variants.append("PPC section 304 proof of qatl e amd")

    # Theft
    if "theft" in norm or "steal" in norm:
        variants.append("punishment for theft")
        variants.append("PPC section 379 punishment for theft")

    # Dacoity / robbery
    if "dacoity" in norm or "robbery" in norm:
        variants.append("punishment for dacoity")
        variants.append("PPC section 395 punishment for dacoity")
        variants.append("PPC section 391 dacoity")

    # Kidnapping / abduction
    if "kidnapping" in norm or "abduct" in norm:
        variants.append("punishment for kidnapping")
        variants.append("PPC section 363 punishment for kidnapping")

    # False evidence / false testimony
    if "false evidence" in norm or ("false" in norm and "evidence" in norm):
        variants.append("punishment for false evidence")
        variants.append("PPC section 193 punishment for false evidence")

    # Police detention / production before magistrate
    custody_triggers = ["police", "arrest", "custody", "detain", "detention", "magistrate", "24 hours"]
    if any(t in norm for t in custody_triggers):
        variants.append("police cannot detain more than twenty four hours")
        variants.append("CRPC section 61 detention twenty four hours")
        variants.append("CRPC section 60 without unnecessary delay magistrate")
        variants.append("CRPC section 167 detention by magistrate")

    # Add a secondary variant for misappropriation vs breach of trust
    if "criminal breach of trust" in norm:
        variants.append(norm.replace("criminal breach of trust", "dishonest misappropriation"))

    # Business/partner fund diversion fallback queries
    biz_triggers = [
        "partner", "company", "business", "funds", "money", "embezzlement",
        "misappropriation", "diverted", "divert", "stole", "stolen"
    ]
    if any(t in norm for t in biz_triggers):
        variants.append("criminal breach of trust")
        variants.append("dishonest misappropriation")
        variants.append("PPC section 405 criminal breach of trust")
        variants.append("PPC section 406 criminal breach of trust")
        variants.append("PPC section 403 dishonest misappropriation")
        variants.append("PPC section 420 cheating")

    # Forgery / false signature fallback queries
    forgery_triggers = ["forg", "signature", "false document", "fake document", "board resolution"]
    if any(t in norm for t in forgery_triggers):
        variants.append("forgery")
        variants.append("PPC section 463 forgery")
        variants.append("PPC section 464 making a false document")
        variants.append("PPC section 465 punishment for forgery")
        variants.append("PPC section 468 forgery for purpose of cheating")
        variants.append("PPC section 471 using as genuine a forged document")

    # Defamation fallback queries
    defamation_triggers = ["defamation", "slander", "libel"]
    if any(t in norm for t in defamation_triggers):
        variants.append("defamation")
        variants.append("PPC section 499 defamation")
        variants.append("PPC section 500 punishment for defamation")
        variants.append("PPC section 501 printing defamatory matter")
        variants.append("PPC section 502 sale of printed defamatory matter")

    # Blackmail / cyber harassment fallback queries
    blackmail_triggers = ["blackmail", "threat", "threaten", "facebook", "photoshopped", "fake photos", "fake pictures"]
    if any(t in norm for t in blackmail_triggers):
        variants.append("cyberbullying")
        variants.append("cyber stalking")
        variants.append("PECA section 24A cyberbullying")
        variants.append("PECA section 24 cyber stalking")
        variants.append("PECA section 21 offences against dignity")
        variants.append("PECA section 26 spoofing")
        variants.append("PPC section 503 criminal intimidation")
        variants.append("PPC section 507 criminal intimidation by anonymous communication")

    # False and fake information (PECA 26A)
    fake_info_triggers = [
        "false and fake information",
        "false information",
        "fake information",
        "fake news",
        "false news",
        "misinformation",
        "disinformation",
    ]
    if any(t in norm for t in fake_info_triggers):
        variants.append("false and fake information")
        variants.append("PECA section 26A false and fake information")

    # Landlord / tenant tenancy rules query expansions
    rent_triggers = ["landlord", "tenant", "evict", "vacate", "rent", "notice to vacate", "notice period"]
    if any(t in norm for t in rent_triggers):
        variants.append("Punjab Rented Premises Act section 19 notice to vacate")
        variants.append("landlord eviction notice period requirements")
        variants.append("eviction of tenant rented premises")

    # De-duplicate while preserving order
    seen = set()
    out = []
    for v in variants:
        if v and v not in seen:
            seen.add(v)
            out.append(v)
    return out


def collect_candidates(
    retriever: LegalRetriever,
    queries: List[str],
    candidate_k: int,
    law_filter: str = None,
    min_score: float = None,
) -> Dict[str, Dict]:
    seen = {}
    for q in queries:
        results = retriever.search(
            q,
            top_k=candidate_k,
            law_filter=law_filter,
            min_score=min_score,
            rerank=False,
        )
        for r in results:
            cid = r.get("chunk_id")
            prev = seen.get(cid)
            if not prev or r.get("score", 0) > prev.get("score", 0):
                seen[cid] = r
    return seen


def _add_section_fallbacks(retriever: LegalRetriever, candidates: Dict[str, Dict], query: str) -> set:
    norm = normalize_query(query)
    law_to_sections = {}
    pinned_ids = set()

    # Business partner / embezzlement
    biz_triggers = [
        "partner", "company", "business", "funds", "money", "embezzlement",
        "misappropriation", "diverted", "divert", "stole", "stolen"
    ]
    if any(t in norm for t in biz_triggers):
        law_to_sections.setdefault("PPC", set()).update({"403", "405", "406", "420"})

    # Forgery / signature / false document
    if any(t in norm for t in ["forg", "signature", "false document", "fake document", "resolution"]):
        law_to_sections.setdefault("PPC", set()).update({"463", "464", "465", "468", "471"})

    # Defamation
    if any(t in norm for t in ["defamation", "slander", "libel"]):
        law_to_sections.setdefault("PPC", set()).update({"499", "500", "501", "502"})

    # Blackmail / cyber harassment
    if any(t in norm for t in ["blackmail", "threat", "facebook", "photoshopped", "fake photos", "fake pictures"]):
        law_to_sections.setdefault("PPC", set()).update({"503", "506", "507"})
        law_to_sections.setdefault("PECA2016", set()).update({"21", "24", "24A", "26"})

    # False and fake information (PECA 26A)
    if any(t in norm for t in ["false and fake information", "false information", "fake information", "fake news", "false news"]):
        law_to_sections.setdefault("PECA2016", set()).update({"26A"})

    # Qatl / murder / diyat / qisas
    if any(t in norm for t in ["qatl", "murder", "homicide", "killing", "qisas", "diyat"]):
        law_to_sections.setdefault("PPC", set()).update({"302", "304"})

    # Theft
    if any(t in norm for t in ["theft", "steal", "stolen"]):
        law_to_sections.setdefault("PPC", set()).update({"379"})

    # Dacoity
    if any(t in norm for t in ["dacoity", "robbery"]):
        law_to_sections.setdefault("PPC", set()).update({"391", "395", "396", "397", "398"})

    # Kidnapping
    if any(t in norm for t in ["kidnapping", "abduct", "abduction", "ransom"]):
        law_to_sections.setdefault("PPC", set()).update({"363", "364", "364A"})

    # False evidence
    if any(t in norm for t in ["false evidence", "false testimony", "perjury"]):
        law_to_sections.setdefault("PPC", set()).update({"193"})

    # Police custody / production before magistrate
    if any(t in norm for t in ["police", "arrest", "custody", "detain", "detention", "magistrate", "24 hours"]):
        law_to_sections.setdefault("CRPC", set()).update({"60", "61", "167"})

    # Landlord / Tenant Eviction Notice fallbacks (Section 19 = Notice to vacate)
    rent_triggers = ["landlord", "tenant", "vacate", "notice to vacate", "evict", "eviction"]
    if any(t in norm for t in rent_triggers):
        law_to_sections.setdefault("PunjabRentedPremises", set()).update({"19", "21", "22"})
        law_to_sections.setdefault("TenancyPunjab", set()).update({"113"})

    # Domestic violence / protection orders fallback
    dv_triggers = ["husband", "abuse", "abuses", "beating", "domestic", "violence", "threatens me"]
    if any(t in norm for t in dv_triggers):
        law_to_sections.setdefault("DomesticViolenceAct", set()).update({"4", "5", "6", "7"})

    if not law_to_sections:
        return pinned_ids

    # Normalize section numbers for matching (handles 26A vs 26-A, etc.)
    for law in list(law_to_sections.keys()):
        law_to_sections[law] = {_norm_section_num(s) for s in law_to_sections[law]}

    for m in retriever.metadata:
        law = m.get("law")
        if law not in law_to_sections:
            continue
        sec = str(m.get("section_number")).strip()
        if _norm_section_num(sec) in law_to_sections[law]:
            cid = m.get("id")
            if cid in candidates:
                pinned_ids.add(cid)
                continue
            candidates[cid] = {
                "score": 0.0,
                "law": law,
                "section_number": m.get("section_number"),
                "section_title": m.get("section_title"),
                "section": f"Section {m.get('section_number')} - {m.get('section_title')}",
                "chunk_id": cid,
                "page_approx": m.get("page_approx"),
                "text": m.get("text"),
            }
            pinned_ids.add(cid)

    return pinned_ids


def _add_law_bias_candidates(retriever: LegalRetriever, candidates: Dict[str, Dict], query: str, candidate_k: int):
    norm = normalize_query(query)
    narcotics_triggers = [
        "narcotic", "narcotics", "drug", "drugs", "heroin", "charas", "cocaine",
        "opium", "hashish", "bhang", "ice", "meth", "amphetamine", "smuggling"
    ]
    if any(t in norm for t in narcotics_triggers):
        results = retriever.search(
            query,
            top_k=min(candidate_k, 50),
            law_filter="ControlOfNarcotics",
            min_score=None,
            rerank=False,
        )
        for r in results:
            cid = r.get("chunk_id")
            prev = candidates.get(cid)
            if not prev or r.get("score", 0) > prev.get("score", 0):
                candidates[cid] = r

    # Bias PPC for common criminal-law questions
    ppc_triggers = [
        "partner", "company", "business", "funds", "money", "embezzlement",
        "misappropriation", "diverted", "divert", "stole", "stolen",
        "forg", "signature", "false document", "fake document", "resolution",
        "defamation", "slander", "libel",
        "blackmail", "threat", "threaten",
        "theft", "steal", "false evidence", "perjury",
        "qatl", "murder", "homicide", "killing", "qisas", "diyat",
        "dacoity", "robbery", "kidnapping", "abduct", "ransom",
    ]
    if any(t in norm for t in ppc_triggers):
        results = retriever.search(
            query,
            top_k=min(candidate_k, 50),
            law_filter="PPC",
            min_score=None,
            rerank=False,
        )
        for r in results:
            cid = r.get("chunk_id")
            prev = candidates.get(cid)
            if not prev or r.get("score", 0) > prev.get("score", 0):
                candidates[cid] = r

    # Bias PECA for cyber harassment/blackmail
    peca_triggers = ["blackmail", "facebook", "photoshopped", "fake photos", "fake pictures", "cyber", "online"]
    if any(t in norm for t in peca_triggers):
        results = retriever.search(
            query,
            top_k=min(candidate_k, 50),
            law_filter="PECA2016",
            min_score=None,
            rerank=False,
        )
        for r in results:
            cid = r.get("chunk_id")
            prev = candidates.get(cid)
            if not prev or r.get("score", 0) > prev.get("score", 0):
                candidates[cid] = r

    # Bias CRPC for police/arrest/custody procedure questions
    crpc_triggers = ["police", "arrest", "custody", "detain", "detention", "magistrate", "confession", "remand", "24 hours"]
    if any(t in norm for t in crpc_triggers):
        results = retriever.search(
            query,
            top_k=min(candidate_k, 50),
            law_filter="CRPC",
            min_score=None,
            rerank=False,
        )
        for r in results:
            cid = r.get("chunk_id")
            prev = candidates.get(cid)
            if not prev or r.get("score", 0) > prev.get("score", 0):
                candidates[cid] = r

    # Bias Domestic Violence Act for family abuse queries
    dv_triggers = ["husband", "abuse", "abuses", "beating", "beaten", "threatens me", "domestic", "violence"]
    if any(t in norm for t in dv_triggers):
        results = retriever.search(
            query,
            top_k=min(candidate_k, 50),
            law_filter="DomesticViolenceAct",
            min_score=None,
            rerank=False,
        )
        for r in results:
            cid = r.get("chunk_id")
            prev = candidates.get(cid)
            if not prev or r.get("score", 0) > prev.get("score", 0):
                candidates[cid] = r

    # Bias Tenancy Acts for eviction queries
    rent_triggers = ["landlord", "rent", "tenant", "evict", "eviction", "vacate", "notice to vacate"]
    if any(t in norm for t in rent_triggers):
        results = retriever.search(
            query,
            top_k=min(candidate_k, 50),
            law_filter="PunjabRentedPremises",
            min_score=None,
            rerank=False,
        )
        for r in results:
            cid = r.get("chunk_id")
            prev = candidates.get(cid)
            if not prev or r.get("score", 0) > prev.get("score", 0):
                candidates[cid] = r


def _find_crpc_schedule_text(retriever: LegalRetriever) -> str:
    for m in retriever.metadata:
        if m.get("law") != "CRPC":
            continue
        text = (m.get("text") or "")
        t = text.lower()
        if "schedule" in t and "tabular statement of offences" in t:
            return text
    return ""


def _find_crpc_row_text(retriever: LegalRetriever, norm_query: str, nums: List[str]) -> str:
    # Prefer schedule rows that include bailable/warrant/cognizable columns
    prefer_tokens = ["bail", "warrant", "cognizable", "non bailable", "non-bailable"]

    for m in retriever.metadata:
        if m.get("law") != "CRPC":
            continue
        text = (m.get("text") or "")
        lower = text.lower()

        if any(p in lower for p in prefer_tokens):
            if "defamation" in norm_query and "defamation" in lower:
                return text
            for n in nums:
                if n and n in lower:
                    return text

    return ""


def _extract_schedule_snippet(schedule_text: str, keywords: List[str], window: int = 900) -> str:
    if not schedule_text:
        return ""
    lower = schedule_text.lower()
    hit = -1
    for kw in keywords:
        k = kw.lower()
        idx = lower.find(k)
        if idx != -1 and (hit == -1 or idx < hit):
            hit = idx
    if hit == -1:
        return ""
    half = window // 2
    start = max(0, hit - half)
    end = min(len(schedule_text), start + window)
    if end - start < window and start > 0:
        start = max(0, end - window)
    return schedule_text[start:end].strip()


def _add_crpc_schedule_snippet(retriever: LegalRetriever, candidates: Dict[str, Dict], query: str) -> set:
    norm = normalize_query(query)
    triggers = ["bailable", "non bailable", "cognizable", "non cognizable", "warrant", "arrest without warrant"]
    if not any(t in norm for t in triggers):
        return set()

    # Keywords to locate in the schedule
    keywords = []
    if "defamation" in norm:
        keywords.extend(["defamation", " 499 ", " 500 ", " 501 ", " 502 "])
    if "criminal intimidation" in norm or "intimidation" in norm:
        keywords.extend(["criminal intimidation", " 503 ", " 506 ", " 507 "])
    if not keywords:
        # Fallback: try any section numbers mentioned in the query
        nums = re.findall(r"\b\d{2,4}\b", norm)
        for n in nums:
            keywords.append(f" {n} ")

    # Try to locate a specific row chunk first (often separate from the schedule header)
    nums = re.findall(r"\b\d{2,4}\b", norm)
    row_text = _find_crpc_row_text(retriever, norm, nums)
    schedule_text = row_text or _find_crpc_schedule_text(retriever)
    snippet = _extract_schedule_snippet(schedule_text, keywords, window=900)
    if not snippet:
        return set()

    cid = "CRPC_SCHEDULE_II_SNIPPET"
    if cid in candidates:
        return {cid}

    candidates[cid] = {
        "score": 0.0,
        "law": "CRPC",
        "section_number": "Schedule II",
        "section_title": "Tabular Statement of Offences (bailability/cognizable)",
        "section": "Schedule II - Tabular Statement of Offences",
        "chunk_id": cid,
        "page_approx": None,
        "text": snippet,
    }
    return {cid}


def _extract_keywords(query: str) -> List[str]:
    q = normalize_query(query)
    stop = {
        "what", "is", "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with",
        "from", "that", "this", "will", "would", "can", "could", "should", "may", "might",
        "i", "you", "we", "they", "he", "she", "it", "my", "your", "our", "their", "his", "her",
        "do", "does", "did", "how", "when", "where", "why", "who", "whom", "which", "at", "by",
        # Too-generic legal words that appear early in many chunks (hurts snippet selection).
        "punishment", "penalty", "liable", "punishable", "offence", "offense",
        "law", "act", "code", "section", "chapter",
    }
    words = [w for w in re.split(r"\s+", q) if len(w) >= 3 and w not in stop]
    return words


def _select_snippet(text: str, query: str, max_chunk_chars: int) -> str:
    if not text:
        return ""

    if max_chunk_chars is None or max_chunk_chars <= 0:
        return text

    if len(text) <= max_chunk_chars:
        return text

    qnorm = normalize_query(query)
    keywords = _extract_keywords(query)
    lower = text.lower()

    # Prefer domain-specific keywords (e.g., "heroin") over generic ones (e.g., "punishment").
    priority_terms = [
        # Narcotics / substances
        "heroin", "morphine", "charas", "cocaine", "opium", "hashish", "bhang", "methamphetamine", "ice",
        "psychotropic", "controlled",
        # Common legal scenario anchors
        "theft", "defamation", "blackmail", "cyber", "confession", "magistrate", "detention", "bailable", "cognizable",
        "qatl", "qisas", "diyat", "landlord", "tenant", "evict", "vacate", "husband", "abuse", "violence",
    ]

    preferred = [t for t in priority_terms if t in qnorm]
    hit = -1
    for kw in preferred + keywords:
        if not kw:
            continue
        idx = lower.find(kw)
        if idx != -1:
            hit = idx
            break

    if hit == -1:
        return text[:max_chunk_chars].strip()

    half = max_chunk_chars // 2
    start = max(0, hit - half)
    end = min(len(text), start + max_chunk_chars)
    if end - start < max_chunk_chars and start > 0:
        start = max(0, end - max_chunk_chars)
    return text[start:end].strip()


def _order_with_priority(results: List[Dict], priority_ids: set) -> List[Dict]:
    if not priority_ids:
        return results
    ordered = []
    seen = set()
    for r in results:
        cid = r.get("chunk_id")
        if cid in priority_ids and cid not in seen:
            ordered.append(r)
            seen.add(cid)
    for r in results:
        cid = r.get("chunk_id")
        if cid not in seen:
            ordered.append(r)
            seen.add(cid)
    return ordered


def build_context(results: List[Dict], query: str, max_chars: int, max_chunk_chars: int, priority_ids: set) -> str:
    parts = []
    total = 0
    ordered = _order_with_priority(results, priority_ids)
    for r in ordered:
        header = (
            f"Law: {r.get('law')}\n"
            f"Section: {r.get('section_number')} - {r.get('section_title')}\n"
            f"Chunk: {r.get('chunk_id')} | Page: {r.get('page_approx')}\n"
        )
        text = (r.get("text") or "").strip()
        snippet = _select_snippet(text, query, max_chunk_chars)
        block = header + snippet

        if total + len(block) > max_chars:
            if not parts and max_chars > len(header) + 50:
                remaining = max_chars - len(header)
                parts.append(header + snippet[: max(0, remaining)].strip())
            break
        parts.append(block)
        total += len(block)
    return "\n\n---\n\n".join(parts)


def _dedupe_models(models: List[str]) -> List[str]:
    seen = set()
    out = []
    for m in models:
        if not m:
            continue
        m = m.strip()
        if not m or m in seen:
            continue
        seen.add(m)
        out.append(m)
    return out


def call_openrouter(
    client: OpenAI,
    models: List[str],
    system_prompt: str,
    user_prompt: str,
    max_tokens: int,
):
    last_err = None
    for model in models:
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=max_tokens,
                temperature=0.2,
            )
            return resp.choices[0].message.content.strip(), model
        except RateLimitError as e:
            last_err = e
            time.sleep(1.0)
            continue
        except (APIError, APITimeoutError, APIConnectionError) as e:
            last_err = e
            time.sleep(0.5)
            continue
        except Exception as e:
            last_err = e
            if "429" in str(e) or "rate" in str(e).lower():
                time.sleep(1.0)
                continue
            time.sleep(0.25)
            continue

    raise last_err if last_err else RuntimeError("All models failed")


def main():
    if load_dotenv:
        # Load OPENROUTER_API_KEY from a local .env if present
        load_dotenv("D:/data/FYP_GPT/FYP_GPT/.env")
    parser = argparse.ArgumentParser()
    parser.add_argument("--index-dir", default=DEFAULT_INDEX_DIR)
    parser.add_argument("--embed-model", default=DEFAULT_EMBED_MODEL)
    parser.add_argument("--reranker", default=DEFAULT_RERANKER)
    parser.add_argument("--device", default=None)
    parser.add_argument("--law", default=None)
    parser.add_argument("--top-k", type=int, default=5)
    parser.add_argument("--candidate-k", type=int, default=50)
    parser.add_argument("--min-score", type=float, default=None)
    parser.add_argument("--max-context-chars", type=int, default=7000)
    parser.add_argument("--max-chunk-chars", type=int, default=2000)
    parser.add_argument("--max-tokens", type=int, default=900)
    parser.add_argument("--strict", action="store_true")
    parser.add_argument("--no-rerank", action="store_true")
    parser.add_argument("--show-sources", action="store_true")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="Allowed: google/gemini-2.5-flash or openai/gpt-oss-120b:free")
    parser.add_argument("--models", default="", help="Comma-separated list (allowed: google/gemini-2.5-flash, openai/gpt-oss-120b:free)")
    args = parser.parse_args()

    api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        print("OPENROUTER_API_KEY is not set.")
        return

    client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=api_key)

    retriever = LegalRetriever(
        index_dir=args.index_dir,
        model_name=args.embed_model,
        reranker_model=None if args.no_rerank else args.reranker,
        device=args.device,
    )

    print("System ready. Type your question, or 'exit' to quit.")

    while True:
        user_query = input("\nUser: ").strip()
        if not user_query:
            continue
        if user_query.lower() in {"exit", "quit"}:
            break

        user_wants_urdu = contains_urdu(user_query)
        queries = expand_queries(user_query)
        candidates = collect_candidates(
            retriever,
            queries,
            candidate_k=args.candidate_k,
            law_filter=args.law,
            min_score=args.min_score,
        )

        _add_law_bias_candidates(retriever, candidates, user_query, args.candidate_k)
        pinned_ids = _add_section_fallbacks(retriever, candidates, user_query)
        pinned_ids.update(_add_crpc_schedule_snippet(retriever, candidates, user_query))

        if not candidates:
            print("No matching laws found.")
            continue

        candidate_list = list(candidates.values())

        if args.no_rerank or not getattr(retriever, "reranker", None):
            candidate_list.sort(key=lambda x: x.get("score", 0), reverse=True)
            results = candidate_list[: args.top_k]
        else:
            results = retriever._rerank(user_query, candidate_list, args.top_k)

        if pinned_ids:
            existing = {r.get("chunk_id") for r in results}
            for pid in pinned_ids:
                if pid in existing:
                    continue
                if pid in candidates:
                    results.append(candidates[pid])
            # Keep list from growing too large
            if len(results) > args.top_k + 4:
                results = results[: args.top_k + 4]

        if args.show_sources:
            print("\nSources:")
            for r in results:
                score = r.get("score", 0)
                rs = r.get("rerank_score")
                line = f"- {r.get('law')} Section {r.get('section_number')} ({r.get('chunk_id')}) score={score:.4f}"
                if rs is not None:
                    line += f" rerank={rs:.4f}"
                print(line)

        context = build_context(results, user_query, args.max_context_chars, args.max_chunk_chars, pinned_ids)

        lang_rule = "- Answer in Urdu script.\n" if user_wants_urdu else ""
        if user_wants_urdu:
            rules = (
                "Rules:\n"
                "- Use the context as your primary source.\n"
                f"{lang_rule}"
                "- If the exact answer is not in the context, give best-effort general guidance and list likely relevant sections.\n"
                "- Do not invent exact punishments unless the context shows them.\n"
                "- When you cite, use the law and section like (PPC Section 302).\n"
            )
        else:
            rules = (
                "Rules:\n"
                "- Use only the context.\n"
                f"{lang_rule}"
                "- Cite the law and section for each claim.\n"
                "- If the answer is not in the context, say you cannot find it.\n"
            )

        # Put the question first so weaker models don't lose it after a long context block.
        prompt = (
            f"User question:\n{user_query}\n\n"
            f"{rules}\n"
            f"Context:\n{context}\n"
        )

        if args.models.strip():
            model_list = [m.strip() for m in args.models.split(",") if m.strip()]
        elif args.model.strip():
            model_list = [args.model.strip()]
        else:
            model_list = DEFAULT_MODELS

        model_list = _dedupe_models([m for m in model_list if m in ALLOWED_MODELS])
        if not model_list:
            model_list = DEFAULT_MODELS

        if user_wants_urdu:
            # Be lenient for Urdu questions to avoid excessive "cannot find" refusals
            # when retrieval misses due to spelling/phrasing differences.
            sys_prompt = SYSTEM_PROMPT_URDU_LENIENT
        else:
            sys_prompt = SYSTEM_PROMPT_STRICT if args.strict else SYSTEM_PROMPT
        answer, used_model = call_openrouter(client, model_list, sys_prompt, prompt, args.max_tokens)
        print(f"\nLawYar ({used_model}):\n{answer}")


if __name__ == "__main__":
    main()