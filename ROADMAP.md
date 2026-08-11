# Roadmap

## v0.2 — umgesetzt (08/2026)

- ~~Humanoide voll spezifizieren~~ (v0.1: `HumanoidCapabilities`)
- ~~`classifications`-Array~~ (ECLASS/ETIM/CPV/UNSPSC …, offene System-Liste;
  `version` bei ECLASS Pflicht)
- ~~`lifecycleStatus` mit validierter Regel „Announced ⇒ keine offers"~~
- ~~Availability-Rework~~ (`status`-Enum + Pflicht-`asOf`, `availableFrom`-
  Bedingungen, `quantityAvailable`; `inStock` deprecated — **Breaking Change**)
- ~~Feed-Konvention~~ (Pull-Voll-Feed-Schema mit Schutzschaltern +
  Feed-Lite-CSV-Profil; `feedSignature` als reserviertes Feld)
- ~~schema.org-Bridge als informative Doku~~ + normative `rs:`-Präfix-Reservierung
- ~~ECLASS/CPV-Crosswalk-Doku~~ (nicht-normativ, ToU-konform)
- ~~Bildmetadaten~~ (`media.images[].widthPx/heightPx/altDe`)

**v0.2-Nacharbeit erledigt (11.08.2026):** Klassen-IRDIs manuell in der
ECLASS-Content-Suche bestätigt, Merkmalszuordnung korrigiert, Neufund
29-16-05-08 dokumentiert, Merkmals-IRDIs AAJ714/AAJ747 in der
Properties-Suche bestätigt (siehe docs/crosswalk-eclass.md).

## v0.3 (Kandidaten)

- ~~Konverter `@robotspec/to-schemaorg`~~ (Profile `merchant-listing` /
  `product-snippet`, `vatMode: gross|net`, Golden-File-Tests gegen die
  Beispiele) — **umgesetzt (11.08.2026)**: `converter/` (ESM, ohne
  Abhängigkeiten, Node 20+, mit CLI), Guards gegen die Anti-Patterns der
  Bridge, 12 Golden-Files (6 Beispiele × 2 Profile) plus Unit-Tests unter
  `npm run test:converter`; Doku in
  [converter/README.md](converter/README.md). Offen: `Offer.url` /
  `Product.@id` aus einer Landingpage-URL, `shippingDetails`.
- Referenz-API-Konventionen: Upsert über `(apiKey, listingId)`,
  `PATCH …/availability` für Teilupdates, `X-Idempotency-Key`
- Delta-Feeds (`feedType: delta`) — erst wenn Voll-Feeds in der Praxis
  an Grenzen stoßen
- `feedSignature` scharf schalten (HTTP Message Signatures, RFC 9421)
- ECLASS-Change-Request „Autonome Scheuersaugmaschine" unter 21-19-01 —
  **Entwurf einreichfertig** (11.08.2026):
  [docs/eclass-change-request-entwurf.md](docs/eclass-change-request-entwurf.md);
  ETIM-Change-Request zum 12.0-Zyklus prüfen
- Weitere Roboterklassen voll spezifizieren (Delivery, Disinfection —
  eigene Sub-Objekte analog `CleaningCapabilities`)
- `serviceScope`-Preisaufschlüsselung: optionale `servicePriceCents` je
  Baustein, damit Full-Service-Raten zerlegbar werden
- Gebraucht-/Vorführgeräte: strukturierte Zustandsangaben
  (`batteryHealthPct`, Wartungshistorie)
- Englische Feldbeschreibungen (EN als Hauptsprache mit DE-Übersetzung)

## Offen / zu klären

- Governance: Wer pflegt Enum-Erweiterungen (neue `robotClass`,
  `navigationTypes`)?
- Registry maschinenlesbarer Herstellernamen (Duplikate wie
  „Gausium" vs. „Shanghai Gaussian Automation Technology")
- Konformitätsnachweis: Signierte Listings / Verifizierbarkeit von
  `declarationOfConformityUrl`
