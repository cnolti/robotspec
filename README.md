# RobotSpec Schema

> Offener Datenstandard für Serviceroboter: Produkt-Spezifikationen und Angebotsdaten im DACH-Raum.

## Was ist RobotSpec?

RobotSpec ist ein offenes, herstellerneutrales JSON Schema für Serviceroboter.
Es deckt beide Ebenen ab:

1. **Produkt-Spezifikationen** (Spec Sheet): Leistungsdaten, Navigation,
   Konnektivität, Compliance — ein Dokument ohne `offers` ist ein reines
   Hersteller-Datenblatt.
2. **Angebotsdaten**: Kauf, Miete, Leasing, RaaS mit Pflicht zur Preis- und
   Service-Transparenz — Händler und Vermieter ergänzen `offers` zum selben
   Modell.

**Vergleich:** RobotSpec ist für Serviceroboter das, was OpenImmo für
Immobilien ist — ein freier Datenstandard, der die Branche verbindet.

## Warum ein eigener Standard?

Eine Markterhebung (Juli 2026, 114 belegte Preispunkte über 20 Modelle im
DACH-Raum) zeigt: **Fast kein Anbieter nennt gleichzeitig Betrag, Laufzeit,
Serviceumfang und MwSt.-Status.** „Leasing ab 265 €" kann mit Servicepaket
real 548 €/Monat kosten; identische Modelle liegen bei Händlern bis zu 39 %
auseinander. RobotSpec macht die fehlenden Angaben zur Pflicht:

- Jedes Angebot (`Offer`) braucht `priceCents` (netto), `vatRate` und einen
  expliziten `serviceScope` mit `level: Full | Partial | None`
- Wiederkehrende Angebote (Rent/Leasing/RaaS) brauchen `billingPeriod` und
  `minTermMonths`; „ab"-Preise sind als `isStartingPrice` markiert;
  Tagessätze sind ein eigener `offerType`
- Flächenleistung ist zweigeteilt: `areaPerformanceTheoreticalM2h` vs.
  `areaPerformancePracticalM2h` — theoretische Werte (Arbeitsbreite ×
  Maximaltempo) können nie als praktische ausgegeben werden
- `compliance` (CE-Kennzeichnung, Rechtsgrundlage MRL 2006/42/EG bzw.
  MVO 2023/1230, Normen wie EN IEC 63327, DSGVO-Sensorik-Profil) ist
  Pflichtbestandteil jedes Listings

## Schema-Versionen

| Version | Scope | Status |
|---------|-------|--------|
| **v0.2** | v0.1 plus: `classifications` (ECLASS/ETIM/CPV …), `lifecycleStatus` mit validierter Regel „Announced ⇒ keine offers", Availability-Rework (`status` + Pflicht-Zeitstempel `asOf`), Bildmetadaten, Feed-Schema für Pull-Voll-Feeds, `rs:`-Präfix-Reservierung | **Aktuell** (Entwurf) |
| **v0.1** | Reinigungsroboter (`capabilities`) und Humanoide (`humanoidCapabilities`) voll spezifiziert; weitere Klassen (Delivery, Disinfection …) zulässig | Stabil, wird von v0.2 abgelöst |

### Neu in v0.2

- **`classifications`** (optional): Verweise auf ECLASS, ETIM, CPV, UNSPSC …
  — für Handel und öffentliche Ausschreibungen. Crosswalk und Lizenzhinweise:
  [docs/crosswalk-eclass.md](docs/crosswalk-eclass.md).
- **`lifecycleStatus`** (`Announced | Available | Discontinued`): Angekündigte
  Produkte bekommen ein Spec-Sheet, keinen Preis — die Regel „Announced ⇒
  keine offers" ist jetzt **schema-validiert**, nicht nur beschrieben.
- **Availability-Rework** (breaking): `status`-Enum (`InStock | LeadTime |
  MadeToOrder | PreOrder | OnRequest | OutOfStock`) und Pflicht-Zeitstempel
  `asOf` — eine Verfügbarkeitsaussage ohne Datum ist keine Aussage.
  `availableFrom` ist bei `PreOrder` Pflicht; `inStock` ist deprecated.
- **Feed-Konvention**: `schema/robotspec-feed-0.2.schema.json` — Pull-Voll-Feed
  mit Schutzschaltern (7-Tage-Karenz, 50-%-Regel, 30-Tage-Verfall auf
  `OnRequest`) statt fehleranfälliger Delta-Semantik; dazu ein
  „Feed Lite"-CSV-Profil für Shop-Exporte.
- **schema.org-Bridge** (informativ):
  [docs/bridge-schema-org.md](docs/bridge-schema-org.md) — Mapping,
  JSON-LD-Referenzbeispiel, Google-Regeln, Anti-Patterns. Normativ ist nur
  das `propertyID`-Präfix **`rs:`** für RobotSpec-Feldpfade reserviert.

> This content contains ECLASS. The ECLASS Terms of Use apply (www.eclass.eu).
> Referenzierte Version: ECLASS 16.0. Details in
> [docs/crosswalk-eclass.md](docs/crosswalk-eclass.md).

## Design-Prinzipien

| Prinzip | Umsetzung |
|---------|-----------|
| **JSON-first** | JSON Schema Draft 2020-12, kein XML |
| **English field names, camelCase** | `make`, `robotClass`, `priceCents` |
| **Preise netto in Cent** | Integer statt Float; `721000` = 7.210,00 € — plus expliziter `vatRate` |
| **Service-Transparenz als Pflicht** | `serviceScope.level` ist required |
| **Ehrliche Leistungsdaten** | theoretische und praktische Flächenleistung getrennt |
| **Compliance eingebaut** | CE, MRL/MVO, EN IEC 63327, deutsche Betriebsanleitung, DSGVO-Profil |
| **Neutrale Taxonomie** | Eigene Enum-Werte statt Hersteller-/Plattform-Codes |
| **Varianten-Disziplin** | `variant`-Feld; Varianten nie unter einer `listingId` mischen |
| **Erweiterbar** | `extensions`-Objekt für plattformspezifische Daten |
| **Semantic Versioning** | Klare Migrationspfade zwischen Versionen |

## Nutzung

```bash
npm install
npm run validate   # Schema + alle Beispiele
```

## Referenzimplementierung

Ein RaaS-Marktplatz-POC für Reinigungsrobotik im DACH-Raum nutzt RobotSpec
produktiv als Partner-Ingest-Format: Validierung per Ajv, Kuratierungs-Queue
statt Auto-Publish, Mapping auf ein internes Listing-Modell
([MAPPING-referenz.md](MAPPING-referenz.md)). RobotSpec ist
**herstellerneutral und offen** (MIT) — Beiträge und weitere
Implementierungen sind ausdrücklich willkommen.

## Dateien

- `schema/robotspec-v0.2.schema.json` — das aktuelle Listing-Schema (Draft 2020-12)
- `schema/robotspec-feed-0.2.schema.json` — Feed-Umschlag für Pull-Voll-Feeds
- `schema/robotspec-v0.1.schema.json` — Vorversion (für Bestandssysteme)
- `schema/examples/` — validierende Beispiele (RaaS mit Full-Service, Leasing
  ohne Service, Event-Tagesmiete, Spec-Sheets, Announced-Humanoid ohne offers,
  Voll-Feed, Feed-Lite-CSV)
- `validate-schema.mjs` — Ajv-Validator (beide Versionen + Feed + Negativtest)
- `docs/crosswalk-eclass.md` — ECLASS/ETIM/CPV-Zuordnung (nicht-normativ)
- `docs/bridge-schema-org.md` — schema.org-Bridge (informativ)
- `MAPPING-referenz.md` — Referenz-Mapping auf ein Marktplatz-Datenmodell
- `ROADMAP.md` — geplante Erweiterungen

## Lizenz

MIT — siehe [LICENSE](LICENSE).
