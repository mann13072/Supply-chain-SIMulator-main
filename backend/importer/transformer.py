"""
Transform validated raw data into the app's internal format:
  - Assign UUIDs
  - Resolve name -> ID links for routes
  - Compute haversine distances
  - Map lat/lng to pixel coordinates
  - Apply defaults for missing fields
  - Auto-detect transport mode
"""
import math
import uuid
import json
import os
from typing import Any

from .defaults import NODE_DEFAULTS, ROUTE_DEFAULTS


# ─── Haversine ───
def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371
    to_rad = math.radians
    d_lat = to_rad(lat2 - lat1)
    d_lon = to_rad(lon2 - lon1)
    a = math.sin(d_lat / 2) ** 2 + math.cos(to_rad(lat1)) * math.cos(to_rad(lat2)) * math.sin(d_lon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ─── Mercator pixel projection (matches frontend) ───
def _lat_lng_to_pixel(lat: float, lng: float, width: int = 800, height: int = 400):
    x = (lng + 180) * (width / 360)
    y = (90 - lat) * (height / 180)
    return round(x, 2), round(y, 2)


# ─── Port atlas for geocoding and coastal detection ───
_port_atlas = None


def _load_port_atlas() -> list[dict]:
    global _port_atlas
    if _port_atlas is not None:
        return _port_atlas
    atlas_path = os.path.join(os.path.dirname(__file__), "..", "ports_atlas.json")
    if os.path.exists(atlas_path):
        with open(atlas_path, "r", encoding="utf-8") as f:
            _port_atlas = json.load(f)
    else:
        _port_atlas = []
    return _port_atlas


def _geocode_from_name(name: str) -> tuple[float, float] | None:
    """Try to find coordinates from the port atlas by name substring match."""
    atlas = _load_port_atlas()
    name_lower = name.lower()

    # Extract likely city names from node name
    # e.g. "Shanghai Cell Mfg" -> try "shanghai"
    words = name_lower.replace(",", " ").split()

    # Try full name match first
    for port in atlas:
        if name_lower in port.get("name", "").lower():
            return port["lat"], port["lon"]

    # Try individual words (skip short/common words)
    skip_words = {"the", "and", "of", "co", "inc", "ltd", "hub", "store", "factory",
                  "mfg", "plant", "mine", "warehouse", "depot", "center", "centre",
                  "dc", "retail", "green", "energy", "solar", "cell", "silicon",
                  "copper", "steel", "auto", "nexus", "global"}
    for word in words:
        if len(word) < 3 or word in skip_words:
            continue
        for port in atlas:
            port_name = port.get("name", "").lower()
            if word in port_name.split() or (len(word) >= 5 and word in port_name):
                return port["lat"], port["lon"]

    return None


def _is_near_port(lat: float, lng: float, max_km: float = 80) -> bool:
    """Check if coordinates are near a known port (sea-accessible)."""
    atlas = _load_port_atlas()
    for port in atlas:
        if port.get("type") not in ("sea", "both"):
            continue
        dist = _haversine_km(lat, lng, port["lat"], port["lon"])
        if dist < max_km:
            return True
    return False


def _get_continent(lat: float, lng: float) -> str:
    """Very rough continent detection based on coordinates."""
    if lat > 35 and -30 < lng < 60:
        return "Europe"
    if lat > 0 and 60 < lng < 150:
        return "Asia"
    if lat < 0 and 100 < lng < 180:
        return "Oceania"
    if -60 < lat < 15 and -85 < lng < -30:
        return "South America"
    if lat > 15 and -170 < lng < -50:
        return "North America"
    if lat < 35 and -20 < lng < 55:
        return "Africa"
    return "Unknown"


def _auto_detect_mode(lat1: float, lng1: float, lat2: float, lng2: float, name1: str = "", name2: str = "") -> str:
    """Auto-detect the best transport mode based on location."""
    dist = _haversine_km(lat1, lng1, lat2, lng2)
    cont1 = _get_continent(lat1, lng1)
    cont2 = _get_continent(lat2, lng2)

    # Keyword hints in names
    air_hints = ("airport", "air hub", "airfreight", "express")
    for hint in air_hints:
        if hint in name1.lower() or hint in name2.lower():
            return "Air"

    if cont1 != cont2:
        # Different continents
        near_port1 = _is_near_port(lat1, lng1)
        near_port2 = _is_near_port(lat2, lng2)
        if near_port1 and near_port2:
            return "Sea"
        return "Air"
    else:
        # Same continent
        if dist < 500:
            return "Road"
        elif dist < 2000:
            return "Rail"
        else:
            near_port1 = _is_near_port(lat1, lng1)
            near_port2 = _is_near_port(lat2, lng2)
            if near_port1 and near_port2:
                return "Sea"
            return "Air"


# ─── Field-to-type mapping (which fields belong to which node types) ───
_SUPPLIER_FIELDS = {
    "supplierLeadTime", "supplierLeadTimeVariability", "supplierCapacity",
    "supplierReliability", "supplierCostPerUnit", "supplierMinOrderQuantity",
    "supplierDisruptionProb", "supplierRecoveryTime", "alternativeSuppliersCount",
    "supplierSwitchingCost", "materialId",
}
_FACTORY_FIELDS = {
    "productionCapacity", "utilizationRate", "batchSize", "setupTime",
    "setupCost", "cycleTime", "yieldRate", "defectRate", "reworkRate",
    "schedulingRule", "overtimeCapacity", "inputMaterialIds", "outputProduct",
    "unitProductionCost",
}
_WAREHOUSE_FIELDS = {
    "storageCapacity", "throughputCapacity", "pickingRate", "packingRate",
    "handlingCost", "laborAvailability", "crossDocking", "processingTime",
    "automationLevel", "fulfillmentAccuracy", "warehouseCapabilities",
    "warehousingCostOverride", "carryingCostOverride",
}
_RETAIL_FIELDS = {
    "demandVolume", "demandVariability", "demandSeasonality", "demandGrowthRate",
    "orderFrequency", "orderSizeDistribution", "leadTimeTolerance", "backorderRate",
    "substitutionBehavior", "priceElasticity", "markupPct",
}

_TYPE_TO_ALLOWED_FIELDS: dict[str, set[str]] = {
    "SUPPLIER": _SUPPLIER_FIELDS,
    "FACTORY": _FACTORY_FIELDS,
    "WAREHOUSE": _WAREHOUSE_FIELDS,
    "DISTRIBUTION_CENTER": _WAREHOUSE_FIELDS,
    "RETAIL": _RETAIL_FIELDS,
}

_FIELD_TO_TYPE_LABEL: dict[str, str] = {}
for _label, _fields in [("SUPPLIER", _SUPPLIER_FIELDS), ("FACTORY", _FACTORY_FIELDS),
                         ("WAREHOUSE/DC", _WAREHOUSE_FIELDS), ("RETAIL", _RETAIL_FIELDS)]:
    for _f in _fields:
        _FIELD_TO_TYPE_LABEL[_f] = _label


def transform_nodes(raw_nodes: list[dict]) -> tuple[list[dict], dict[str, str], list[str]]:
    """
    Transform raw node dicts into SupplyNode-compatible dicts.
    Returns (nodes, name_to_id_map, warnings).
    """
    warnings = []
    nodes = []
    name_to_id: dict[str, str] = {}

    for raw in raw_nodes:
        node_id = str(uuid.uuid4())[:9]
        name = raw["name"]
        node_type = raw["type"]
        name_to_id[name] = node_id

        # ── Filter mismatched type-specific fields ──
        allowed_fields = _TYPE_TO_ALLOWED_FIELDS.get(node_type, set())
        all_type_specific = _SUPPLIER_FIELDS | _FACTORY_FIELDS | _WAREHOUSE_FIELDS | _RETAIL_FIELDS
        stripped_fields = []

        for field in list(raw.keys()):
            if field in all_type_specific and field not in allowed_fields:
                # User provided a field that doesn't belong to this node type
                if raw[field] is not None:
                    belongs_to = _FIELD_TO_TYPE_LABEL.get(field, "unknown")
                    stripped_fields.append(f"{field} ({belongs_to} field)")
                    raw[field] = None  # strip it

        if stripped_fields:
            warnings.append(
                f'Node "{name}" ({node_type}): stripped mismatched fields: {", ".join(stripped_fields)}'
            )

        # ── Resolve coordinates ──
        lat = raw.get("lat")
        lng = raw.get("lng")

        if lat is None or lng is None:
            # Try geocoding from location field
            location = raw.get("location")
            if location:
                coords = _geocode_from_name(location)
                if coords:
                    lat, lng = coords
                    warnings.append(f'Node "{name}": geocoded "{location}" -> ({lat}, {lng})')

            # Try geocoding from name
            if lat is None or lng is None:
                coords = _geocode_from_name(name)
                if coords:
                    lat, lng = coords
                    warnings.append(f'Node "{name}": geocoded from name -> ({lat}, {lng})')

            # Final fallback: auto-layout (keep within valid lat/lng range)
            if lat is None or lng is None:
                idx = len(nodes)
                lat = -60 + (idx * 17) % 120   # stay within -60..60
                lng = -160 + (idx * 37) % 320   # stay within -160..160
                warnings.append(f'Node "{name}": no coordinates found, assigned auto-layout ({lat}, {lng})')

        x, y = _lat_lng_to_pixel(lat, lng)

        # ── Build node dict with defaults ──
        node: dict[str, Any] = {
            "id": node_id,
            "name": name,
            "type": node_type,
            "status": "OPTIMAL",
            "location": raw.get("location") or name,
            "coordinates": {"x": x, "y": y, "lat": lat, "lng": lng},
        }

        # Apply defaults only for fields that belong to this node type (+ universal fields)
        for key, default_val in NODE_DEFAULTS.items():
            if key in all_type_specific and key not in allowed_fields:
                # Don't add mismatched type-specific defaults
                continue
            if key in raw and raw[key] is not None:
                node[key] = raw[key]
            else:
                node[key] = default_val

        # ── Tier classification fields (pass through if provided) ──
        tier_val = raw.get("supplyChainTier")
        if tier_val is not None:
            try:
                node["supplyChainTier"] = int(tier_val)
            except (ValueError, TypeError):
                pass

        is_focal = raw.get("isFocalCompany")
        if is_focal is not None:
            node["isFocalCompany"] = bool(is_focal)
            if node["isFocalCompany"]:
                node["supplyChainTier"] = 0
                node["tierLocked"] = True

        tier_locked = raw.get("tierLocked")
        if tier_locked is not None:
            node["tierLocked"] = bool(tier_locked)

        nodes.append(node)

    return nodes, name_to_id, warnings


def transform_routes(
    raw_routes: list[dict],
    name_to_id: dict[str, str],
    nodes: list[dict],
) -> tuple[list[dict], list[str]]:
    """
    Transform raw route dicts into Route-compatible dicts.
    Returns (routes, warnings).
    """
    warnings = []
    routes = []

    # Build a quick lookup for node coordinates by name
    node_coords: dict[str, tuple[float, float]] = {}
    node_names_map: dict[str, str] = {}
    for n in nodes:
        node_coords[n["name"]] = (n["coordinates"]["lat"], n["coordinates"]["lng"])
        node_names_map[n["name"]] = n["id"]

    for raw in raw_routes:
        route_id = str(uuid.uuid4())[:9]
        from_name = raw["from"]
        to_name = raw["to"]

        from_id = name_to_id.get(from_name)
        to_id = name_to_id.get(to_name)
        if not from_id or not to_id:
            warnings.append(f'Route "{from_name}" -> "{to_name}": node ID not found, skipped')
            continue

        from_coords = node_coords.get(from_name, (0, 0))
        to_coords = node_coords.get(to_name, (0, 0))

        # ── Auto-detect mode if missing ──
        mode = raw.get("mode")
        if mode is None or mode == "":
            mode = _auto_detect_mode(
                from_coords[0], from_coords[1],
                to_coords[0], to_coords[1],
                from_name, to_name,
            )
            warnings.append(f'Route "{from_name}" -> "{to_name}": auto-detected mode "{mode}"')

        # ── Compute distance if missing ──
        distance = raw.get("distance")
        if distance is None:
            distance = round(_haversine_km(from_coords[0], from_coords[1], to_coords[0], to_coords[1]), 1)

        # ── Build route dict ──
        route: dict[str, Any] = {
            "id": route_id,
            "fromId": from_id,
            "toId": to_id,
            "mode": mode,
            "distance": distance,
        }

        # Apply defaults for optional fields
        for key, default_val in ROUTE_DEFAULTS.items():
            if key == "mode":
                continue  # already set
            if key in raw and raw[key] is not None:
                route[key] = raw[key]
            else:
                route[key] = default_val

        routes.append(route)

    return routes, warnings


def transform_commodities(raw_commodities: list[dict]) -> list[dict]:
    """Transform raw commodity dicts into Commodity-compatible dicts."""
    default_colors = ["#6366F1", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"]
    commodities = []
    seen_ids: dict[str, int] = {}
    for i, raw in enumerate(raw_commodities):
        cname = raw.get("name") or f"Commodity {i+1}"
        base_id = cname.lower().replace(" ", "_")
        # Deduplicate IDs from case-variant names
        if base_id in seen_ids:
            seen_ids[base_id] += 1
            cid = f"{base_id}_{seen_ids[base_id]}"
        else:
            seen_ids[base_id] = 1
            cid = base_id
        commodities.append({
            "id": cid,
            "name": cname,
            "unit": raw.get("unit", "unit"),
            "basePrice": raw.get("basePrice", 10),
            "color": raw.get("color", default_colors[i % len(default_colors)]),
        })
    return commodities
