"""
Fuzzy matching, alias maps, and data coercion utilities.
"""
import re
from difflib import SequenceMatcher

# ─── Node Type Aliases ───
TYPE_ALIASES = {
    # SUPPLIER
    "supplier": "SUPPLIER", "vendors": "SUPPLIER", "vendor": "SUPPLIER",
    "source": "SUPPLIER", "mine": "SUPPLIER", "raw material": "SUPPLIER",
    "raw_material": "SUPPLIER", "provider": "SUPPLIER",
    # FACTORY
    "factory": "FACTORY", "manufacturing": "FACTORY", "plant": "FACTORY",
    "production": "FACTORY", "manufacturer": "FACTORY", "assembly": "FACTORY",
    "mill": "FACTORY", "refinery": "FACTORY",
    # WAREHOUSE
    "warehouse": "WAREHOUSE", "storage": "WAREHOUSE", "depot": "WAREHOUSE",
    "hub": "WAREHOUSE", "store room": "WAREHOUSE", "storeroom": "WAREHOUSE",
    "godown": "WAREHOUSE",
    # DISTRIBUTION_CENTER
    "distribution_center": "DISTRIBUTION_CENTER",
    "distribution center": "DISTRIBUTION_CENTER",
    "dc": "DISTRIBUTION_CENTER", "dist center": "DISTRIBUTION_CENTER",
    "distribution": "DISTRIBUTION_CENTER", "fulfilment": "DISTRIBUTION_CENTER",
    "fulfillment": "DISTRIBUTION_CENTER", "logistics center": "DISTRIBUTION_CENTER",
    "cross dock": "DISTRIBUTION_CENTER", "crossdock": "DISTRIBUTION_CENTER",
    # RETAIL
    "retail": "RETAIL", "store": "RETAIL", "shop": "RETAIL",
    "customer": "RETAIL", "demand": "RETAIL", "market": "RETAIL",
    "outlet": "RETAIL", "point of sale": "RETAIL", "pos": "RETAIL",
    "end customer": "RETAIL", "consumer": "RETAIL",
}

VALID_TYPES = {"SUPPLIER", "FACTORY", "WAREHOUSE", "DISTRIBUTION_CENTER", "RETAIL"}

# ─── Transport Mode Aliases ───
MODE_ALIASES = {
    "sea": "Sea", "ocean": "Sea", "ship": "Sea", "maritime": "Sea",
    "vessel": "Sea", "cargo ship": "Sea", "container": "Sea", "freight sea": "Sea",
    "air": "Air", "flight": "Air", "plane": "Air", "cargo air": "Air",
    "airfreight": "Air", "air freight": "Air",
    "road": "Road", "truck": "Road", "ground": "Road", "highway": "Road",
    "lorry": "Road", "van": "Road", "motor": "Road",
    "rail": "Rail", "train": "Rail", "railway": "Rail", "freight rail": "Rail",
    "railroad": "Rail",
}

VALID_MODES = {"Sea", "Air", "Road", "Rail"}

# ─── Column Header Aliases ───
HEADER_ALIASES = {
    # Node headers
    "node_name": "name", "node name": "name", "nodename": "name",
    "title": "name", "label": "name",
    "node_type": "type", "node type": "type", "nodetype": "type",
    "category": "type", "kind": "type",
    "latitude": "lat", "latitude_deg": "lat",
    "longitude": "lng", "lon": "lng", "long": "lng", "longitude_deg": "lng",
    "city": "location", "address": "location", "place": "location",
    "region": "location", "country": "location",
    "inventory": "inventoryLevel", "stock": "inventoryLevel",
    "inventory_level": "inventoryLevel", "current_stock": "inventoryLevel",
    "capacity": "maxCapacity", "max_capacity": "maxCapacity",
    "reorder_point": "reorderPoint", "rop": "reorderPoint",
    "order_quantity": "orderQuantity", "eoq": "orderQuantity",
    "safety_stock": "safetyStock",
    "holding_cost": "holdingCost",
    "shelf_life": "shelfLife",
    "lead_time": "supplierLeadTime", "supplier_lead_time": "supplierLeadTime",
    "reliability": "supplierReliability", "supplier_reliability": "supplierReliability",
    "cost_per_unit": "supplierCostPerUnit", "unit_cost": "supplierCostPerUnit",
    "supplier_capacity": "supplierCapacity",
    "production_capacity": "productionCapacity",
    "yield_rate": "yieldRate", "yield": "yieldRate",
    "defect_rate": "defectRate",
    "batch_size": "batchSize",
    "setup_time": "setupTime",
    "cycle_time": "cycleTime",
    "storage_capacity": "storageCapacity",
    "throughput_capacity": "throughputCapacity", "throughput": "throughputCapacity",
    "picking_rate": "pickingRate",
    "handling_cost": "handlingCost",
    "demand_volume": "demandVolume", "demand": "demandVolume",
    "demand_variability": "demandVariability", "variability": "demandVariability",
    "demand_seasonality": "demandSeasonality", "seasonality": "demandSeasonality",
    "price_elasticity": "priceElasticity", "elasticity": "priceElasticity",
    # Tier classification headers
    "supply_chain_tier": "supplyChainTier", "chain_tier": "supplyChainTier",
    "tier": "supplyChainTier", "sc_tier": "supplyChainTier",
    "is_focal_company": "isFocalCompany", "focal_company": "isFocalCompany",
    "focal": "isFocalCompany", "is_focal": "isFocalCompany", "oem": "isFocalCompany",
    "tier_locked": "tierLocked", "locked_tier": "tierLocked", "lock_tier": "tierLocked",
    # Route headers
    "from_node": "from", "source": "from", "origin": "from", "start": "from",
    "to_node": "to", "destination": "to", "target": "to", "end": "to",
    "transport": "mode", "transport_mode": "mode", "ship_mode": "mode",
    "shipping_mode": "mode", "transportation": "mode",
    "cost_per_km": "costPerUnitDistance", "cost_per_unit_distance": "costPerUnitDistance",
    "base_lead_time": "baseLeadTime",
    "lead_time_variability": "leadTimeVariability",
    "vehicle_capacity": "vehicleCapacity",
    "shipment_frequency": "shipmentFrequency",
    "fuel_price": "fuelPrice",
    "customs_time": "customsTime",
    "disruption_prob": "disruptionProb", "disruption_probability": "disruptionProb",
}

# ─── Sheet Name Aliases ───
SHEET_ALIASES_NODES = {"nodes", "node", "supply nodes", "locations", "facilities", "sites"}
SHEET_ALIASES_ROUTES = {"routes", "route", "connections", "edges", "links", "transport", "shipments"}
SHEET_ALIASES_COMMODITIES = {"commodities", "commodity", "materials", "products", "items", "goods"}


def _similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def resolve_node_type(raw: str) -> tuple[str, list[str]]:
    """Resolve a raw string to a valid NodeType. Returns (resolved, warnings)."""
    warnings = []
    cleaned = raw.strip()

    # Exact match (case-insensitive)
    upper = cleaned.upper()
    if upper in VALID_TYPES:
        return upper, warnings

    # Alias map
    lower = cleaned.lower()
    if lower in TYPE_ALIASES:
        resolved = TYPE_ALIASES[lower]
        if cleaned.upper() != resolved:
            warnings.append(f'type "{cleaned}" -> "{resolved}" (alias match)')
        return resolved, warnings

    # Fuzzy match against valid types
    best, best_score = None, 0
    for vt in VALID_TYPES:
        score = _similarity(cleaned, vt)
        if score > best_score:
            best, best_score = vt, score
    if best_score >= 0.6:
        warnings.append(f'type "{cleaned}" -> "{best}" (fuzzy {best_score:.0%} match)')
        return best, warnings

    # Fuzzy match against aliases
    for alias, mapped in TYPE_ALIASES.items():
        score = _similarity(cleaned, alias)
        if score > best_score:
            best, best_score = mapped, score
    if best_score >= 0.6:
        warnings.append(f'type "{cleaned}" -> "{best}" (fuzzy alias {best_score:.0%} match)')
        return best, warnings

    return "", [f'type "{cleaned}" could not be resolved to any valid node type']


def resolve_transport_mode(raw: str) -> tuple[str, list[str]]:
    """Resolve a raw string to a valid TransportMode. Returns (resolved, warnings)."""
    warnings = []
    if not raw or not raw.strip():
        return "", warnings

    cleaned = raw.strip()

    # Exact match
    for vm in VALID_MODES:
        if cleaned.lower() == vm.lower():
            return vm, warnings

    # Alias
    lower = cleaned.lower()
    if lower in MODE_ALIASES:
        resolved = MODE_ALIASES[lower]
        warnings.append(f'mode "{cleaned}" -> "{resolved}" (alias match)')
        return resolved, warnings

    # Fuzzy
    best, best_score = None, 0
    for alias, mapped in MODE_ALIASES.items():
        score = _similarity(cleaned, alias)
        if score > best_score:
            best, best_score = mapped, score
    if best_score >= 0.65:
        warnings.append(f'mode "{cleaned}" -> "{best}" (fuzzy {best_score:.0%} match)')
        return best, warnings

    return "", [f'mode "{cleaned}" could not be resolved']


def resolve_header(raw: str) -> str:
    """Map a raw column header to the canonical field name."""
    cleaned = raw.strip()
    # Direct match
    if cleaned in HEADER_ALIASES.values():
        return cleaned
    # Lowercase direct
    lower = cleaned.lower()
    if lower in HEADER_ALIASES:
        return HEADER_ALIASES[lower]
    # Normalize: strip spaces/underscores, try camelCase
    normalized = re.sub(r'[\s_]+', ' ', lower).strip()
    if normalized in HEADER_ALIASES:
        return HEADER_ALIASES[normalized]
    # Convert "some_field_name" -> "someFieldName"
    parts = re.split(r'[\s_]+', lower)
    camel = parts[0] + "".join(p.capitalize() for p in parts[1:])
    if camel in HEADER_ALIASES.values():
        return camel
    if camel in HEADER_ALIASES:
        return HEADER_ALIASES[camel]
    # Fuzzy against all known canonical names
    all_canonical = set(HEADER_ALIASES.values())
    best, best_score = cleaned, 0
    for canon in all_canonical:
        score = _similarity(camel, canon)
        if score > best_score:
            best, best_score = canon, score
    if best_score >= 0.8:
        return best
    return cleaned  # return as-is, validator will ignore unknown columns


def resolve_sheet_name(names: list[str], alias_set: set[str]) -> str | None:
    """Find the first sheet whose name matches (case-insensitive) any alias."""
    for name in names:
        if name.lower().strip() in alias_set:
            return name
    return None


def fuzzy_match_name(target: str, candidates: list[str], threshold: float = 0.70) -> tuple[str | None, float]:
    """Find the best matching candidate for target. Returns (match, score)."""
    target_clean = target.strip().lower()
    best, best_score = None, 0

    for c in candidates:
        c_clean = c.strip().lower()
        # Exact
        if target_clean == c_clean:
            return c, 1.0
        # Substring
        if target_clean in c_clean or c_clean in target_clean:
            score = max(0.85, len(target_clean) / max(len(c_clean), 1))
            if score > best_score:
                best, best_score = c, score
            continue
        # SequenceMatcher
        score = _similarity(target, c)
        if score > best_score:
            best, best_score = c, score

    if best_score >= threshold:
        return best, best_score
    return None, best_score


def coerce_value(val, field_name: str = ""):
    """Coerce a raw cell value to a clean Python type."""
    if val is None:
        return None
    if isinstance(val, (int, float, bool)):
        return val
    s = str(val).strip()
    if not s or s.lower() in ("", "-", "n/a", "na", "null", "none", "nil"):
        return None
    # Boolean (exclude "0" and "1" — they are numeric, handled below)
    if s.lower() in ("yes", "true"):
        return True
    if s.lower() in ("no", "false"):
        return False
    # Strip currency/percent/unit suffixes
    cleaned = re.sub(r'^[\$\u20ac\u00a3\u00a5]', '', s)  # $, euro, pound, yen
    cleaned = re.sub(r'\s*(days?|hours?|hrs?|km|kg|units?|%)\s*$', '', cleaned, flags=re.I)
    cleaned = cleaned.replace(',', '')
    was_percent = s.rstrip().endswith('%')
    try:
        num = float(cleaned)
        if was_percent:
            # Only divide by 100 for fields that use 0-1 range in the simulation.
            # Other percentage fields (yieldRate, defectRate, supplierReliability,
            # utilizationRate, fulfillmentAccuracy, etc.) use 0-100 range and
            # must NOT be divided.
            if field_name in ("obsolescenceRate", "laborAvailability",
                              "supplierDisruptionProb", "disruptionProb",
                              "leadTimeVariability"):
                return num / 100
        return int(num) if num == int(num) and '.' not in cleaned else num
    except (ValueError, OverflowError):
        return s
