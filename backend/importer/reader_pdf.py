"""
Read a PDF file containing tables and return raw dicts for nodes, routes, commodities.
Uses pdfplumber for table extraction.
"""
from typing import Any

from .fuzzy import resolve_header, coerce_value


def _table_to_dicts(table: list[list[str]]) -> list[dict[str, Any]]:
    """Convert a pdfplumber table (list of rows) to list of dicts with resolved headers."""
    if not table or len(table) < 2:
        return []
    raw_headers = [str(h).strip() if h else "" for h in table[0]]
    headers = [resolve_header(h) for h in raw_headers]

    records = []
    for row in table[1:]:
        if all(not v or str(v).strip() == "" for v in row):
            continue
        record = {}
        for i, val in enumerate(row):
            if i >= len(headers) or not headers[i]:
                continue
            coerced = coerce_value(val, headers[i])
            if coerced is not None:
                record[headers[i]] = coerced
        if record:
            records.append(record)
    return records


def _classify_table(records: list[dict]) -> str:
    """Guess whether a list of records represents nodes, routes, or commodities."""
    if not records:
        return "unknown"
    keys = set()
    for r in records:
        keys.update(r.keys())
    if "from" in keys and "to" in keys:
        return "routes"
    if "type" in keys or "name" in keys:
        if "unit" in keys and "basePrice" in keys:
            return "commodities"
        return "nodes"
    return "unknown"


def read_pdf(filepath: str) -> dict[str, list[dict]]:
    """
    Parse a PDF file and return:
      { "nodes": [...], "routes": [...], "commodities": [...] }
    """
    try:
        import pdfplumber
    except ImportError:
        raise ImportError(
            "pdfplumber is required for PDF import. Install it with: pip install pdfplumber"
        )

    result: dict[str, list[dict]] = {"nodes": [], "routes": [], "commodities": []}

    with pdfplumber.open(filepath) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            for table in tables:
                records = _table_to_dicts(table)
                category = _classify_table(records)
                if category in result:
                    result[category].extend(records)

    return result
