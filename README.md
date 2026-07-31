# openRobot Schema

> Offener Datenstandard für Serviceroboter-Angebote im DACH-Raum.

## Was ist openRobot?

openRobot ist ein offenes, herstellerneutrales JSON Schema für strukturierte
Serviceroboter-Angebote (Kauf, Miete, Leasing, RaaS). Es definiert ein
kanonisches Format, mit dem Hersteller, Distributoren und Vermieter ihre
Modelle, Preise und Verfügbarkeiten maschinenlesbar an Marktplätze und
Plattformen liefern.

**Vergleich:** openRobot ist für Serviceroboter das, was OpenImmo für
Immobilien ist — ein freier Datenstandard, der die Branche verbindet.

## Warum ein eigener Standard?

Eine Markterhebung (Juli 2026, 114 belegte Preispunkte über 20 Modelle im
DACH-Raum) zeigt: **Fast kein Anbieter nennt gleichzeitig Betrag, Laufzeit,
Serviceumfang und MwSt.-Status.** „Leasing ab 265 €" kann mit Servicepaket
real 548 €/Monat kosten; identische Modelle liegen bei Händlern bis zu 39 %
auseinander. openRobot macht die fehlenden Angaben zur Pflicht:

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
| **v0.1** | Reinigungsroboter voll spezifiziert; weitere Klassen (Delivery, Disinfection, Humanoid …) zulässig | Entwurf |

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

Der RoboHub-POC (RaaS-Marktplatz für Reinigungsroboter) nutzt openRobot
produktiv als Partner-Ingest-Format: Validierung per Ajv, Kuratierungs-Queue
statt Auto-Publish, Mapping auf ein internes Listing-Modell. Siehe
[MAPPING-robohub.md](MAPPING-robohub.md).

## Dateien

- `schema/openrobot-v0.1.schema.json` — das Schema (Draft 2020-12)
- `schema/examples/` — validierende Beispiel-Listings (RaaS mit Full-Service,
  Leasing ohne Service, Event-Tagesmiete)
- `validate-schema.mjs` — Ajv-Validator
- `MAPPING-robohub.md` — Referenz-Mapping auf ein Marktplatz-Datenmodell
- `ROADMAP.md` — geplante Erweiterungen

## Lizenz

MIT — siehe [LICENSE](LICENSE).
