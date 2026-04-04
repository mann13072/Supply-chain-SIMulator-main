"""
Google News RSS fetcher for supply chain disruption events.
Parses RSS XML, extracts keywords, maps to known chokepoint locations,
and infers severity. Uses a 15-minute in-memory cache.
"""
import time
import urllib.request
import xml.etree.ElementTree as ET
from typing import List, Dict, Optional
import re
import uuid

# ── Known supply chain chokepoints with lat/lng ──────────────────────────────
CHOKEPOINTS: List[Dict] = [
    {"name": "Suez Canal",         "lat": 30.0,   "lng": 32.3,   "tags": ["suez", "egypt", "red sea"]},
    {"name": "Panama Canal",       "lat": 9.1,    "lng": -79.7,  "tags": ["panama"]},
    {"name": "Strait of Malacca",  "lat": 2.5,    "lng": 101.5,  "tags": ["malacca", "malaysia", "singapore"]},
    {"name": "Strait of Hormuz",   "lat": 26.5,   "lng": 56.3,   "tags": ["hormuz", "iran", "oil", "persian gulf"]},
    {"name": "Shanghai Port",      "lat": 31.2,   "lng": 121.5,  "tags": ["shanghai", "china port"]},
    {"name": "Shenzhen Port",      "lat": 22.5,   "lng": 114.1,  "tags": ["shenzhen", "china port"]},
    {"name": "Singapore Port",     "lat": 1.3,    "lng": 103.8,  "tags": ["singapore port"]},
    {"name": "Rotterdam Port",     "lat": 51.9,   "lng": 4.5,    "tags": ["rotterdam", "europe port"]},
    {"name": "Los Angeles Port",   "lat": 33.7,   "lng": -118.3, "tags": ["los angeles", "la port", "us west coast"]},
    {"name": "Long Beach Port",    "lat": 33.8,   "lng": -118.2, "tags": ["long beach", "us west coast"]},
    {"name": "Hamburg Port",       "lat": 53.5,   "lng": 10.0,   "tags": ["hamburg", "europe port"]},
    {"name": "Busan Port",         "lat": 35.1,   "lng": 129.0,  "tags": ["busan", "korea"]},
    {"name": "Cape of Good Hope",  "lat": -34.4,  "lng": 18.5,   "tags": ["cape", "south africa"]},
    {"name": "Bab el-Mandeb",      "lat": 12.6,   "lng": 43.3,   "tags": ["bab el-mandeb", "yemen", "red sea"]},
    {"name": "Taiwan Strait",      "lat": 24.0,   "lng": 119.5,  "tags": ["taiwan", "semiconductor"]},
    {"name": "Bosphorus Strait",   "lat": 41.1,   "lng": 29.0,   "tags": ["bosphorus", "turkey", "istanbul"]},
    {"name": "Gibraltar Strait",   "lat": 36.0,   "lng": -5.4,   "tags": ["gibraltar", "mediterranean"]},
    {"name": "Savannah Port",      "lat": 32.1,   "lng": -81.1,  "tags": ["savannah", "us east coast"]},
    {"name": "Colombo Port",       "lat": 6.9,    "lng": 79.9,   "tags": ["colombo", "sri lanka"]},
    {"name": "Jebel Ali Port",     "lat": 25.0,   "lng": 55.1,   "tags": ["jebel ali", "dubai", "uae"]},
]

# ── Severity keyword mapping ─────────────────────────────────────────────────
CRITICAL_KEYWORDS = ["blocked", "closure", "war", "attack", "collapse", "explosion", "sunk", "grounded"]
HIGH_KEYWORDS     = ["strike", "typhoon", "hurricane", "earthquake", "flooding", "sanctions"]
MEDIUM_KEYWORDS   = ["congestion", "delay", "shortage", "backlog", "slowdown"]
LOW_KEYWORDS      = ["concern", "warning", "risk", "monitoring", "advisory"]

# ── Cache ─────────────────────────────────────────────────────────────────────
_cache: Dict = {"items": [], "fetched_at": 0}
CACHE_TTL_SECONDS = 15 * 60  # 15 minutes


def _infer_severity(text: str) -> str:
    lower = text.lower()
    for kw in CRITICAL_KEYWORDS:
        if kw in lower:
            return "critical"
    for kw in HIGH_KEYWORDS:
        if kw in lower:
            return "high"
    for kw in MEDIUM_KEYWORDS:
        if kw in lower:
            return "medium"
    return "low"


def _extract_keywords(text: str) -> List[str]:
    """Extract supply-chain-relevant keywords from text."""
    sc_keywords = [
        "supply chain", "shipping", "port", "cargo", "freight", "container",
        "logistics", "trade", "tariff", "semiconductor", "oil", "gas",
        "disruption", "delay", "shortage", "strike", "canal", "strait",
        "typhoon", "hurricane", "earthquake", "flooding", "war", "sanctions",
        "blockade", "congestion", "backlog",
    ]
    lower = text.lower()
    return [kw for kw in sc_keywords if kw in lower]


def _match_location(text: str) -> Optional[Dict]:
    """Match text against known chokepoints. Returns first match or None."""
    lower = text.lower()
    for cp in CHOKEPOINTS:
        if cp["name"].lower() in lower:
            return {"lat": cp["lat"], "lng": cp["lng"], "name": cp["name"]}
        for tag in cp["tags"]:
            if tag in lower:
                return {"lat": cp["lat"], "lng": cp["lng"], "name": cp["name"]}
    return None


def fetch_supply_chain_news() -> List[Dict]:
    """
    Fetch Google News RSS for supply chain disruptions.
    Returns structured news items with extracted location, severity, and keywords.
    Uses 15-minute in-memory cache.
    """
    now = time.time()
    if _cache["items"] and (now - _cache["fetched_at"]) < CACHE_TTL_SECONDS:
        return _cache["items"]

    url = "https://news.google.com/rss/search?q=supply+chain+disruption&hl=en-US&gl=US&ceid=US:en"
    items = []

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "SupplyChainSimulator/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            xml_data = resp.read()

        root = ET.fromstring(xml_data)
        channel = root.find("channel")
        if channel is None:
            return items

        for item_el in channel.findall("item")[:20]:  # limit to 20 items
            title = item_el.findtext("title", "")
            description = item_el.findtext("description", "")
            link = item_el.findtext("link", "")
            pub_date = item_el.findtext("pubDate", "")

            # Clean HTML from description
            clean_desc = re.sub(r"<[^>]+>", "", description).strip()

            combined_text = f"{title} {clean_desc}"
            location = _match_location(combined_text)
            severity = _infer_severity(combined_text)
            keywords = _extract_keywords(combined_text)

            items.append({
                "id": str(uuid.uuid4())[:8],
                "title": title,
                "description": clean_desc[:300],
                "link": link,
                "publishedAt": pub_date,
                "extractedLocation": location,
                "extractedSeverity": severity,
                "keywords": keywords,
                "convertedToEvent": False,
            })

    except Exception as e:
        print(f"[news_fetcher] Error fetching RSS: {e}")

    _cache["items"] = items
    _cache["fetched_at"] = now
    return items
