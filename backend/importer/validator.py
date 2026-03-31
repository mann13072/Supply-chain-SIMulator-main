"""
Validate imported data, apply fuzzy corrections, and report errors/warnings.
"""
from .fuzzy import (
    resolve_node_type,
    resolve_transport_mode,
    fuzzy_match_name,
    coerce_value,
)


def validate_nodes(nodes: list[dict]) -> tuple[list[dict], list[str], list[str]]:
    """
    Validate node records. Returns (cleaned_nodes, warnings, errors).
    """
    warnings = []
    errors = []
    cleaned = []
    seen_names = set()

    for i, node in enumerate(nodes, 1):
        row_label = f"Nodes row {i}"

        # ── Name (required) ──
        name = node.get("name")
        if not name or not str(name).strip():
            errors.append(f"{row_label}: missing required 'name' column")
            continue
        name = str(name).strip()

        # Duplicate check
        if name.lower() in seen_names:
            dupe_name = f"{name} (2)"
            warnings.append(f'{row_label}: duplicate name "{name}" renamed to "{dupe_name}"')
            name = dupe_name
        seen_names.add(name.lower())
        node["name"] = name

        # ── Type (required) ──
        raw_type = node.get("type")
        if not raw_type or not str(raw_type).strip():
            errors.append(f'{row_label} "{name}": missing required \'type\' column')
            continue
        resolved_type, type_warnings = resolve_node_type(str(raw_type))
        for w in type_warnings:
            warnings.append(f'{row_label} "{name}": {w}')
        if not resolved_type:
            errors.append(f'{row_label} "{name}": could not resolve type "{raw_type}"')
            continue
        node["type"] = resolved_type

        # ── Coordinates validation ──
        lat = node.get("lat")
        lng = node.get("lng")
        if lat is not None and lng is not None:
            lat = coerce_value(lat, "lat")
            lng = coerce_value(lng, "lng")
            if isinstance(lat, (int, float)) and isinstance(lng, (int, float)):
                # Auto-swap if lat/lng look reversed
                if abs(lat) > 90 and abs(lng) <= 90:
                    lat, lng = lng, lat
                    warnings.append(f'{row_label} "{name}": lat/lng appeared swapped, auto-corrected')
                node["lat"] = lat
                node["lng"] = lng

        cleaned.append(node)

    return cleaned, warnings, errors


def validate_routes(routes: list[dict], node_names: list[str]) -> tuple[list[dict], list[str], list[str]]:
    """
    Validate route records. Returns (cleaned_routes, warnings, errors).
    """
    warnings = []
    errors = []
    cleaned = []
    seen_pairs = set()

    for i, route in enumerate(routes, 1):
        row_label = f"Routes row {i}"

        # ── From (required) ──
        from_name = route.get("from")
        if not from_name or not str(from_name).strip():
            errors.append(f"{row_label}: missing required 'from' column")
            continue
        from_name = str(from_name).strip()

        # Fuzzy match from_name to known nodes
        match, score = fuzzy_match_name(from_name, node_names)
        if match and match != from_name:
            warnings.append(f'{row_label}: "from" value "{from_name}" -> matched "{match}" ({score:.0%})')
            from_name = match
        elif not match:
            errors.append(f'{row_label}: "from" value "{from_name}" does not match any node name')
            continue
        route["from"] = from_name

        # ── To (required) ──
        to_name = route.get("to")
        if not to_name or not str(to_name).strip():
            errors.append(f"{row_label}: missing required 'to' column")
            continue
        to_name = str(to_name).strip()

        match, score = fuzzy_match_name(to_name, node_names)
        if match and match != to_name:
            warnings.append(f'{row_label}: "to" value "{to_name}" -> matched "{match}" ({score:.0%})')
            to_name = match
        elif not match:
            errors.append(f'{row_label}: "to" value "{to_name}" does not match any node name')
            continue
        route["to"] = to_name

        # Duplicate route check
        pair_key = (from_name.lower(), to_name.lower())
        if pair_key in seen_pairs:
            warnings.append(f'{row_label}: duplicate route {from_name} -> {to_name}, skipped')
            continue
        seen_pairs.add(pair_key)

        # ── Mode (optional — auto-detected later if blank) ──
        raw_mode = route.get("mode")
        if raw_mode and str(raw_mode).strip():
            resolved_mode, mode_warnings = resolve_transport_mode(str(raw_mode))
            for w in mode_warnings:
                warnings.append(f'{row_label}: {w}')
            if resolved_mode:
                route["mode"] = resolved_mode
            else:
                warnings.append(f'{row_label}: could not resolve mode "{raw_mode}", will auto-detect')
                route.pop("mode", None)

        cleaned.append(route)

    return cleaned, warnings, errors
