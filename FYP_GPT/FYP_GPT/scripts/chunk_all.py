import os
import json
import sys
import argparse
from datetime import datetime

# Add scripts dir to path so we can import chunk_single
sys.path.insert(0, os.path.dirname(__file__))
from chunk_single import extract_chunks, save_json

LAW_MAP = {
    "anti-terrorism_act":       "AntiTerrorismAct",
    "constitution1973":         "Constitution1973",
    "control-of-narcotics":     "ControlOfNarcotics",
    "CRPC":                     "CRPC",
    "family-courts-1964":       "FamilyCourts1964",
    "guardians-and-ward":       "GuardiansAndWard",
    "hudood":                   "Hudood",
    "muslim-family-laws-1961":  "MuslimFamilyLaws1961",
    "offence_of_qazf":          "OffenceOfQazf",
    "peca-2016":                "PECA2016",
    "PPC":                      "PPC",
    "punjab-land-revenue":      "PunjabLandRevenue",
    "qanun-e-shahadat":         "QanunEShahadat",
    "specific-relief-1877":     "SpecificRelief1877",
    "tenancy-punjab":           "TenancyPunjab",
    "transfer-of-property":     "TransferOfProperty",
    "civil_procedure_1908":     "CivilProcedure1908",
    "companies_act":            "CompaniesAct",
    "contract_act":             "ContractAct",
    "domestic_violence_act":    "DomesticViolenceAct",
    "juvenile_justice_system":  "JuvenileJusticeSystem",
    "nab_ordinance":            "NABOrdinance",
    "police_order":             "PoliceOrder",
    "motor_vehicles_1965":      "MotorVehicles1965",
    "protection_against_harassment": "ProtectionAgainstHarassment",
    "punjab_consumer_protection": "PunjabConsumerProtection",
    "punjab_marriage_function": "PunjabMarriageFunctions",
    "punjab_rented_premises":   "PunjabRentedPremises",
    "punjab_shops":             "PunjabShopsAndEstablishments"
}


RAW_DIR_DEFAULT       = "../data/raw"
PROCESSED_DIR_DEFAULT = "../data/processed"


def run_all(raw_dir: str, processed_dir: str, log_path: str, min_chars: int, only_list: list):
    results = {
        "run_at": datetime.now().isoformat(),
        "success": [],
        "failed": [],
        "skipped": []
    }

    if not os.path.isdir(raw_dir):
        print(f"❌ Raw directory not found: {raw_dir}")
        return

    pdf_files = [f for f in os.listdir(raw_dir) if f.lower().endswith(".pdf")]

    if only_list:
        only_set = {o.strip().lower() for o in only_list if o.strip()}
        pdf_files = [f for f in pdf_files if f.lower().replace(".pdf", "") in only_set]

    if not pdf_files:
        print(f"❌ No PDFs found in {raw_dir}")
        return

    law_map_ci = {k.lower(): v for k, v in LAW_MAP.items()}

    print(f"\n🔍 Found {len(pdf_files)} PDFs in {raw_dir}")
    print("="*60)

    for filename in sorted(pdf_files):
        stem = filename.replace(".pdf", "")
        law_name = law_map_ci.get(stem.lower())

        if not law_name:
            print(f"\n⚠️  SKIPPED: {filename}")
            print(f"   No mapping found. Add '{stem}' to LAW_MAP in chunk_all.py")
            results["skipped"].append(filename)
            continue

        pdf_path = os.path.join(raw_dir, filename)
        print(f"\n▶ Processing: {filename} → {law_name}")

        try:
            chunks = extract_chunks(pdf_path, law_name, min_chars=min_chars)

            if not chunks:
                print(f"   ⚠️  0 chunks extracted — check patterns for this law")
                results["failed"].append({
                    "file": filename,
                    "reason": "0 chunks extracted"
                })
                continue

            save_json(chunks, law_name, processed_dir)
            results["success"].append({
                "file": filename,
                "law": law_name,
                "chunks": len(chunks)
            })

        except Exception as e:
            print(f"   ❌ ERROR: {e}")
            results["failed"].append({
                "file": filename,
                "reason": str(e)
            })

    # Print summary
    print("\n" + "="*60)
    print("PROCESSING SUMMARY")
    print("="*60)
    print(f"✅ Success : {len(results['success'])} laws")
    print(f"❌ Failed  : {len(results['failed'])} laws")
    print(f"⚠️  Skipped : {len(results['skipped'])} laws")

    if results["failed"]:
        print("\nFailed files:")
        for f in results["failed"]:
            print(f"  • {f['file']}: {f['reason']}")

    if results["skipped"]:
        print("\nSkipped files (add to LAW_MAP):")
        for f in results["skipped"]:
            print(f"  • {f}")

    # Save log
    os.makedirs(processed_dir, exist_ok=True)
    with open(log_path, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\n📋 Log saved → {log_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw", default=RAW_DIR_DEFAULT)
    parser.add_argument("--out", default=PROCESSED_DIR_DEFAULT)
    parser.add_argument("--log", default="")
    parser.add_argument("--min-chars", type=int, default=80)
    parser.add_argument("--only", default="", help="Comma-separated list of PDF stems to process")
    args = parser.parse_args()

    log_path = args.log or os.path.join(args.out, "_processing_log.json")
    only_list = [s.strip() for s in args.only.split(",")] if args.only else []

    run_all(args.raw, args.out, log_path, args.min_chars, only_list)
