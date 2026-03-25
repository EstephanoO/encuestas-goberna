#!/usr/bin/env python3
"""
Scraper de candidatos JNE → Supabase
Uso: python scripts/sync_candidates.py
"""

import hashlib
import re
import sys

import requests
from bs4 import BeautifulSoup

# ─── Config ──────────────────────────────────────────────────────────────────
SUPABASE_URL = "https://getwaibphvtnfqhizrer.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdldHdhaWJwaHZ0bmZxaGl6cmVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDAxOTI3MiwiZXhwIjoyMDg5NTk1MjcyfQ.tibZaizxJXnlun4e_5XdGg7t2YxhjyPGBov8vSBWV3o"
JNE_URL = "https://votoinformado.jne.gob.pe/presidente-vicepresidentes"

HEADERS_HTTP = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates,return=representation",
}

SCRAPE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; EncuestaBot/1.0)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-PE,es;q=0.9",
}

# ─── Scraper ─────────────────────────────────────────────────────────────────

def extract_text(el, selectors: list[str]) -> str:
    for sel in selectors:
        found = el.select_one(sel)
        if found and found.get_text(strip=True):
            return found.get_text(strip=True)
    return ""


def extract_img(el, selectors: list[str], base: str) -> str | None:
    for sel in selectors:
        found = el.select_one(sel)
        if found:
            src = found.get("src") or found.get("data-src")
            if src:
                return src if src.startswith("http") else f"{base}{src}"
    return None


def scrape_jne() -> list[dict]:
    print(f"🔍 Scrapeando {JNE_URL} ...")
    resp = requests.get(JNE_URL, headers=SCRAPE_HEADERS, timeout=20)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    base = "https://votoinformado.jne.gob.pe"

    card_selectors = [
        ".partido-card",
        ".candidate-card",
        "[class*='candidato']",
        "[class*='partido']",
        "article",
        ".card",
    ]

    candidates = []
    for selector in card_selectors:
        elements = soup.select(selector)
        if not elements:
            continue

        print(f"  ✓ {len(elements)} elementos con selector '{selector}'")

        for i, el in enumerate(elements):
            full_name = extract_text(el, [
                "[class*='nombre']", "[class*='name']",
                "h2", "h3", "h4", ".title", "strong",
            ])
            party_name = extract_text(el, [
                "[class*='partido']", "[class*='party']",
                "[class*='organizacion']", "p", "span",
            ])

            photo_url = extract_img(el, [
                "[class*='candidato'] img", "[class*='foto'] img",
                "[class*='photo'] img", "img[alt*='candidato']", "img",
            ], base)

            logo_url = extract_img(el, [
                "[class*='logo'] img", "[class*='partido'] img",
                "[class*='party-logo'] img",
            ], base)

            link = el.select_one("a")
            href = link["href"] if link and link.get("href") else ""
            source_url = href if href.startswith("http") else (f"{base}{href}" if href else JNE_URL)
            external_id = (re.search(r"/(\d+)", href) or [None, None])[1] or el.get("data-id") or el.get("id")

            if full_name and len(full_name) > 2:
                candidates.append({
                    "full_name": full_name.strip(),
                    "party_name": (party_name or "Sin partido").strip(),
                    "candidate_photo_url": photo_url,
                    "party_logo_url": logo_url,
                    "source_url": source_url,
                    "external_id": external_id,
                    "external_source": "jne",
                    "sort_order": i,
                    "is_active": True,
                    "source_hash": hashlib.md5(full_name.encode()).hexdigest(),
                })

        if candidates:
            break

    return candidates

# ─── Supabase ─────────────────────────────────────────────────────────────────

def upsert_candidates(candidates: list[dict]) -> list[dict]:
    print(f"\n📤 Insertando {len(candidates)} candidatos en Supabase ...")
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/candidates",
        headers=HEADERS_HTTP,
        json=candidates,
    )
    resp.raise_for_status()
    saved = resp.json()
    print(f"  ✓ {len(saved)} candidatos guardados")
    return saved


def upsert_vote_options(candidates: list[dict]):
    print(f"\n🗳️  Creando vote_options para candidatos ...")
    options = []
    for c in candidates:
        slug = re.sub(r"[^a-z0-9]+", "-", c["full_name"].lower()).strip("-")
        options.append({
            "type": "candidate",
            "candidate_id": c["id"],
            "label": c["full_name"],
            "slug": slug,
            "is_active": True,
        })

    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/vote_options",
        headers={**HEADERS_HTTP, "Prefer": "resolution=ignore,return=representation"},
        json=options,
    )
    resp.raise_for_status()
    saved = resp.json()
    print(f"  ✓ {len(saved)} vote_options creadas")


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    try:
        candidates = scrape_jne()

        if not candidates:
            print("\n⚠️  No se encontraron candidatos. El HTML del JNE puede haber cambiado.")
            sys.exit(1)

        print(f"\n📋 Candidatos encontrados: {len(candidates)}")
        for c in candidates:
            print(f"  - {c['full_name']} ({c['party_name']})")

        saved = upsert_candidates(candidates)
        upsert_vote_options(saved)

        print("\n✅ Sync completado exitosamente.")

    except requests.HTTPError as e:
        print(f"\n❌ Error HTTP: {e.response.status_code} — {e.response.text}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
