# Changelog

## v0.2.1 — 2026-08-11

Werkzeug-Release: **keine Änderung am Schema**, `schemaVersion` bleibt `"0.2"`.

### Neu

- `converter/` — `@robotspec/to-schemaorg`, Konverter von RobotSpec v0.2 nach
  schema.org JSON-LD (reines ESM, ohne Laufzeit-Abhängigkeiten, Node 20+,
  zusätzlich als CLI aufrufbar):
  `toSchemaOrg(doc, { profile, vatMode })` mit den Profilen
  `merchant-listing` (einzelne `Offer`-Objekte) und `product-snippet`
  (`AggregateOffer` je Währung und Abrechnungsperiode) sowie
  `vatMode: gross | net` (brutto rechnet `vatRate` auf die Netto-Cent-Preise
  auf und setzt `valueAddedTaxIncluded`).
- Umsetzung der Bridge-Regeln inklusive Guards gegen ihre Anti-Patterns:
  `lifecycleStatus: Announced` erzeugt kein Offer-Markup und niemals
  `PreOrder`, Kaufpreis und Monatsrate landen nie im selben `AggregateOffer`,
  CE-Kennzeichnung nur als `additionalProperty` statt `hasCertification`,
  interne Herkunftsfelder (`sourceSystem`, `createdAt`, `extensions`) bleiben
  aus dem Markup.
- Tests: `converter/test.mjs` (zero-dependency, `node:assert`) mit 12
  Golden-Files (6 v0.2-Listing-Beispiele × 2 Profile) unter
  `converter/test/golden/` und Unit-Tests für Optionen, Preisrundung,
  Verfügbarkeits- und Angebotstyp-Mapping, Bildmetadaten und
  Aggregat-Gruppierung.
- npm-Skripte: `test:converter`; `npm test` führt Schema-Validierung und
  Konverter-Tests aus.
- Doku: `converter/README.md` (API, Mapping-Tabelle, Guards,
  Designentscheidungen).

## v0.2 — 2026-08-11 (Entwurf)

### Neu

- `classifications[]`: optionale Verweise auf ECLASS/ETIM/CPV/UNSPSC/GPC/
  Zolltarif; `version` bei `system: eclass` Pflicht (ECLASS ToU 5.1).
- `lifecycleStatus` (`Announced | Available | Discontinued`) mit
  schema-validierter Regel: **Announced-Listings dürfen keine `offers`
  tragen** (Spec-Sheet statt Preis).
- `$defs.Availability` überarbeitet: `status`-Enum (`InStock | LeadTime |
  MadeToOrder | PreOrder | OnRequest | OutOfStock`) und Pflicht-Zeitstempel
  `asOf`; `availableFrom` Pflicht bei `PreOrder`, bei `LeadTime` sind
  `leadTimeDays` oder `availableFrom` Pflicht; neu `quantityAvailable`.
- `media.images[].widthPx`, `.heightPx`, `.altDe` (optional).
- `schema/robotspec-feed-0.2.schema.json`: Pull-Voll-Feed-Umschlag mit
  dokumentierten Konsumenten-Schutzschaltern (7-Tage-Karenz, 50-%-Regel,
  30-Tage-Verfall auf `OnRequest`); reserviertes Feld `feedSignature`.
- Doku: `docs/crosswalk-eclass.md` (nicht-normativ, inkl. CPV-Empfehlung
  90900000-6 für RaaS-Ausschreibungen), `docs/bridge-schema-org.md`
  (informativ; normativ nur die `rs:`-Präfix-Reservierung).
- Beispiele: Announced-Humanoid ohne offers, Voll-Feed, Feed-Lite-CSV;
  Validator prüft beide Schema-Versionen, den Feed und einen Negativtest.

### Breaking Changes gegenüber v0.1

- `schemaVersion` muss `"0.2"` sein.
- `availability`-Objekte brauchen `status` und `asOf`; das v0.1-Muster
  `{ "inStock": true }` validiert nicht mehr (`inStock` ist deprecated und
  nur noch ergänzend zulässig).

## v0.1 — 2026-07-31

Erstveröffentlichung: Listing-Schema (Reinigungsroboter + Humanoide),
Netto-Cent-Preise, Pflicht-`serviceScope`, theoretische/praktische
Flächenleistung getrennt, Compliance-Block, Beispiele, Ajv-Validator.
