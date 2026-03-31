"""
Main entry point for importing supply chain networks from Excel (.xlsx) or PDF (.pdf).

Usage (CLI):
    python -m backend.importer.import_supply_chain --file samples/sample_network.xlsx

Usage (API):
    from backend.importer import import_file
    result = import_file("path/to/file.xlsx")
"""
import os
import json
import argparse
from typing import Any

from .reader_excel import read_excel
from .reader_pdf import read_pdf
from .validator import validate_nodes, validate_routes
from .transformer import transform_nodes, transform_routes, transform_commodities


def import_file(filepath: str) -> dict[str, Any]:
    """
    Import a supply chain network from an Excel or PDF file.

    Returns:
    {
        "nodes": [...],           # SupplyNode-compatible dicts
        "routes": [...],          # Route-compatible dicts
        "commodities": [...],     # Commodity dicts (may be empty)
        "warnings": [...],        # Auto-correction messages
        "errors": [...],          # Blocking errors
        "summary": {
            "nodes_imported": int,
            "routes_imported": int,
            "commodities_imported": int,
            "auto_corrections": int,
        }
    }
    """
    ext = os.path.splitext(filepath)[1].lower()

    # ── Step 1: Read raw data ──
    if ext in (".xlsx", ".xls"):
        raw = read_excel(filepath)
    elif ext == ".pdf":
        raw = read_pdf(filepath)
    else:
        return {
            "nodes": [], "routes": [], "commodities": [],
            "warnings": [],
            "errors": [f"Unsupported file type: {ext}. Use .xlsx or .pdf"],
            "summary": {"nodes_imported": 0, "routes_imported": 0, "commodities_imported": 0, "auto_corrections": 0},
        }

    all_warnings: list[str] = []
    all_errors: list[str] = []

    # ── Step 2: Validate nodes ──
    cleaned_nodes, node_warnings, node_errors = validate_nodes(raw.get("nodes", []))
    all_warnings.extend(node_warnings)
    all_errors.extend(node_errors)

    if not cleaned_nodes:
        all_errors.append("No valid nodes found in file. Ensure the Nodes sheet has 'name' and 'type' columns.")
        return {
            "nodes": [], "routes": [], "commodities": [],
            "warnings": all_warnings, "errors": all_errors,
            "summary": {"nodes_imported": 0, "routes_imported": 0, "commodities_imported": 0, "auto_corrections": len(all_warnings)},
        }

    # ── Step 3: Validate routes ──
    node_names = [n["name"] for n in cleaned_nodes]
    cleaned_routes, route_warnings, route_errors = validate_routes(raw.get("routes", []), node_names)
    all_warnings.extend(route_warnings)
    all_errors.extend(route_errors)

    # ── Step 4: Transform ──
    nodes, name_to_id, transform_node_warnings = transform_nodes(cleaned_nodes)
    all_warnings.extend(transform_node_warnings)

    routes, transform_route_warnings = transform_routes(cleaned_routes, name_to_id, nodes)
    all_warnings.extend(transform_route_warnings)

    commodities = transform_commodities(raw.get("commodities", []))

    return {
        "nodes": nodes,
        "routes": routes,
        "commodities": commodities,
        "warnings": all_warnings,
        "errors": all_errors,
        "summary": {
            "nodes_imported": len(nodes),
            "routes_imported": len(routes),
            "commodities_imported": len(commodities),
            "auto_corrections": len(all_warnings),
        },
    }


# ─── CLI entry point ───
def main():
    parser = argparse.ArgumentParser(description="Import supply chain network from Excel/PDF")
    parser.add_argument("--file", "-f", required=True, help="Path to .xlsx or .pdf file")
    parser.add_argument("--output", "-o", help="Output JSON path (default: stdout)")
    args = parser.parse_args()

    result = import_file(args.file)

    # Print validation report
    print("\n" + "=" * 60)
    print("  IMPORT VALIDATION REPORT")
    print("=" * 60)
    s = result["summary"]
    print(f"  Nodes:       {s['nodes_imported']} imported")
    print(f"  Routes:      {s['routes_imported']} imported")
    print(f"  Commodities: {s['commodities_imported']} imported")
    print(f"  Auto-corrections: {s['auto_corrections']}")
    print("-" * 60)

    if result["warnings"]:
        print(f"  WARNINGS ({len(result['warnings'])}):")
        for w in result["warnings"]:
            print(f"    ! {w}")
        print("-" * 60)

    if result["errors"]:
        print(f"  ERRORS ({len(result['errors'])}):")
        for e in result["errors"]:
            print(f"    X {e}")
        print("-" * 60)

    if result["errors"]:
        print("  Import BLOCKED due to errors. Fix the issues above and retry.")
    else:
        print("  Import SUCCESS")
    print("=" * 60 + "\n")

    # Output JSON
    output_data = {
        "nodes": result["nodes"],
        "routes": result["routes"],
        "commodities": result["commodities"],
    }

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(output_data, f, indent=2)
        print(f"Saved to: {args.output}")
    elif not result["errors"]:
        print(json.dumps(output_data, indent=2))


if __name__ == "__main__":
    main()
