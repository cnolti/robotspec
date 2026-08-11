# Changelog

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
