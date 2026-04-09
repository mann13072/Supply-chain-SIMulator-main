"""
Read an .xlsx file and return raw dicts for nodes, routes, commodities.
Supports two formats:
  1. Original: single "Nodes" sheet with a "type" column
  2. Per-type: separate sheets per node type (Suppliers, Factories, etc.)
"""
from typing import Any
import openpyxl
from .fuzzy import (
    resolve_header,
    resolve_sheet_name,
    coerce_value,
    SHEET_ALIASES_NODES,
    SHEET_ALIASES_ROUTES,
    SHEET_ALIASES_COMMODITIES,
    SHEET_ALIASES_BOM,
)

# Map sheet names to node types (for per-type template format)
_SHEET_TO_TYPE: dict[str, str] = {
    "suppliers": "SUPPLIER",
    "supplier": "SUPPLIER",
    "factories": "FACTORY",
    "factory": "FACTORY",
    "manufacturing": "FACTORY",
    "warehouses": "WAREHOUSE",
    "warehouse": "WAREHOUSE",
    "distribution centers": "DISTRIBUTION_CENTER",
    "distribution center": "DISTRIBUTION_CENTER",
    "distribution_centers": "DISTRIBUTION_CENTER",
    "dc": "DISTRIBUTION_CENTER",
    "retail": "RETAIL",
    "retailers": "RETAIL",
    "stores": "RETAIL",
    "customers": "RETAIL",
    "demand": "RETAIL",
}


def _read_sheet(ws) -> list[dict[str, Any]]:
    """Read a worksheet into a list of dicts with resolved header names."""
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []
    raw_headers = [str(h).strip() if h else "" for h in rows[0]]
    headers = [resolve_header(h) for h in raw_headers]

    records = []
    for row in rows[1:]:
        if all(v is None or str(v).strip() == "" for v in row):
            continue  # skip empty rows
        record = {}
        for i, val in enumerate(row):
            if i >= len(headers) or not headers[i]:
                continue
            coerced = coerce_value(val, headers[i])
            if coerced is not None:
                # Skip hint/legend rows (strings in the name column that start with "(")
                if headers[i] == "name" and isinstance(coerced, str) and coerced.startswith("("):
                    record = {}
                    break
                record[headers[i]] = coerced
        if record:
            records.append(record)
    return records


def read_excel(filepath: str) -> dict[str, list[dict]]:
    """
    Parse an Excel workbook and return:
      { "nodes": [...], "routes": [...], "commodities": [...] }
    """
    wb = openpyxl.load_workbook(filepath, read_only=True, data_only=True)
    sheet_names = wb.sheetnames

    result: dict[str, list[dict]] = {"nodes": [], "routes": [], "commodities": [], "bom": []}

    skip_sheets = {"instructions", "help", "readme", "guide"}

    # ── Check for per-type sheets (Suppliers, Factories, etc.) ──
    found_type_sheets = False
    for sname in sheet_names:
        sname_lower = sname.lower().strip()
        if sname_lower in _SHEET_TO_TYPE:
            node_type = _SHEET_TO_TYPE[sname_lower]
            records = _read_sheet(wb[sname])
            # Auto-set the type for each record from the sheet name
            for rec in records:
                rec["type"] = node_type
            result["nodes"].extend(records)
            found_type_sheets = True

    # ── Fallback: look for a single "Nodes" sheet (original format) ──
    if not found_type_sheets:
        nodes_sheet = resolve_sheet_name(sheet_names, SHEET_ALIASES_NODES)
        non_skip = [s for s in sheet_names if s.lower().strip() not in skip_sheets]
        if not nodes_sheet and len(non_skip) >= 1:
            nodes_sheet = non_skip[0]
        if nodes_sheet:
            result["nodes"] = _read_sheet(wb[nodes_sheet])

    # ── Routes sheet ──
    routes_sheet = resolve_sheet_name(sheet_names, SHEET_ALIASES_ROUTES)
    if not routes_sheet:
        non_skip = [s for s in sheet_names
                    if s.lower().strip() not in skip_sheets
                    and s.lower().strip() not in _SHEET_TO_TYPE]
        # If per-type format, routes is the first non-type, non-skip sheet
        for s in non_skip:
            ws_peek = wb[s]
            first_row = next(ws_peek.iter_rows(min_row=1, max_row=1, values_only=True), None)
            if first_row:
                headers_lower = [str(h).strip().lower() for h in first_row if h]
                if "from" in headers_lower or "to" in headers_lower or "source" in headers_lower or "origin" in headers_lower:
                    routes_sheet = s
                    break
    if routes_sheet:
        result["routes"] = _read_sheet(wb[routes_sheet])

    # ── Commodities sheet ──
    commod_sheet = resolve_sheet_name(sheet_names, SHEET_ALIASES_COMMODITIES)
    if commod_sheet:
        result["commodities"] = _read_sheet(wb[commod_sheet])

    # ── BOM sheet ──
    bom_sheet = resolve_sheet_name(sheet_names, SHEET_ALIASES_BOM)
    if bom_sheet:
        result["bom"] = _read_sheet(wb[bom_sheet])

    wb.close()
    return result
