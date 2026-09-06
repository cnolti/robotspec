# Changelog

## v0.3.0 — 2026-09-05

Schema-Release: `schemaVersion` ist `"0.3"`, `feedVersion` ist `"0.3"`. Die
v0.1- und v0.2-Dateien bleiben unverändert im Repo — Konsumenten dürfen darauf
pinnen. Anlass war ein externes Schema-Review (09/2026), das vor allem in der
Angebotssemantik Lücken zwischen Beschreibung und Validierung gefunden hat.

### Neu

- **Dauerhafte Identitäten** (optional): `productId`, `variantId`, `revision`
  (Integer ≥ 1) auf Listing-Ebene, `supplier.supplierId` und
  `offers[].offerId`. `offerId` muss innerhalb eines Listings eindeutig sein
  (Validator). Empfohlener Upsert-Schlüssel:
  `(supplier.supplierId, listingId)` plus `revision` als Reihenfolgeschutz.
- **`provenance[]`** (optional): Herkunft je Aussage — `path` (JSON-Pointer),
  `sourceUrl`, `assertedBy`, `assertedAt`, `verificationStatus`
  (`ManufacturerClaim | SupplierClaim | OperatorReport |
  IndependentlyVerified`), `notes`.
- **`offers[].unitPrice`**: dezimaler Netto-Einheitspreis
  (`amount` als String mit bis zu sechs Nachkommastellen, `currency`,
  `referenceQuantity` aus `value` und `unit` ∈ `M2 | Hour | Day | Km | Cycle |
  Item`). Damit sind Subcent-Preise wie 3,6 ct/m² erstmals darstellbar.
- **`billingPeriod: PerUnit`** für nutzungsabhängige Angebote, deren
  Bezugsgröße keine Fläche ist.
- **Beispiel** `schema/examples/pay-per-use-per-m2.json` (0,036 EUR je m² und
  eine Stundenrate als Vergleichsangebot); alle übrigen Beispiele auf v0.3
  migriert, die v0.2-Fassungen liegen unter `schema/examples/v0.2/`.
- **Validator** `validate-schema.mjs` neu aufgebaut: Schemawahl nach
  `schemaVersion`/`feedVersion` (0.1/0.2/0.3), rekursive Prüfung aller
  Beispiele, semantische Regeln (`updatedAt ≥ createdAt`, praktische ≤
  theoretische Flächenleistung, eindeutige `offerId`, `unitPrice.currency` =
  `offer.currency`, `listingCount` = Anzahl Listings, keine doppelten
  `listingId`, keine ID gleichzeitig im Bestand und zurückgezogen) und eine
  Negativ-Testsuite mit 24 Fällen.
- **Konverter**: `unitPrice` → `UnitPriceSpecification` mit dezimalem `price`
  und `referenceQuantity` (UN/CEFACT `MTK`/`HUR`/`DAY`/`KMT`/`C62`, `Cycle`
  über `unitText`); `productId` → `Product.productID`,
  `supplier.supplierId` → `Organization.identifier`, `variantId`, `revision`
  und `offerId` als `rs:`-Properties; `provenance` bleibt wie andere interne
  Herkunftsfelder aus dem Markup. Das `rs:`-Präfix folgt der Schemaversion des
  Eingabedokuments.

### Breaking Changes gegenüber v0.2

- `schemaVersion` muss `"0.3"` sein, `feedVersion` `"0.3"`.
- `serviceScope.level: Full` verlangt jetzt `maintenance`, `repairs` und
  `replacementDevice` = `true`; `level: None` verbietet dieselben drei als
  `true`. Bisher validierte „Full-Service ohne jede Leistung".
- Angebotsart und Abrechnungsperiode müssen zusammenpassen: `Purchase` ⇒
  `Once` oder kein `billingPeriod`, `Rent/Leasing/RaaS` ⇒ `Month`, `Week` oder
  `Year`, `DayRate` ⇒ `Day`, `PayPerUse` ⇒ `PerSquareMeter` oder `PerUnit`.
- `PayPerUse` verlangt `unitPrice` und verbietet `priceCents`; alle anderen
  Angebotsarten verlangen `priceCents` und verbieten `unitPrice`.
- `availability.inStock` ist entfallen (in v0.2 bereits als deprecated
  markiert und dort so angekündigt).
- Feed: `listingId` je Listing ist Pflicht; `nextPage` und `feedSignature`
  dürfen nur noch `null` sein.
- `listingId`, `make` und `model` dürfen nicht mehr aus reinen Leerzeichen
  bestehen; `priceCents` hat eine Obergrenze (10^11 Cent).
- Der Konverter erzeugt für `product-snippet` zusätzlich getrennte
  `AggregateOffer` je Angebotsklasse (Kauf / Überlassung auf Zeit /
  nutzungsabhängig) und je Bezugsgröße.

### Korrekturen

- Der Altname des Projekts stand noch in einer Schemabeschreibung, einem
  Beispiel und der Lizenz — in v0.3, den Beispielen und `LICENSE` ersetzt
  (die v0.1-/v0.2-Dateien bleiben bewusst unangetastet).
- `docs/bridge-schema-org.md` nannte den fertigen Konverter „geplant".
- `MAPPING-referenz.md` stand noch auf v0.1.
- ECLASS-Crosswalk und Change-Request-Entwurf: Die Begründung „keine Klasse
  für gewerbliche Reinigungsroboter" ist auf **autonome Scheuersaugmaschinen**
  eingegrenzt — die Klasse 21-19-03-11 (Robot vacuum cleaner) nennt
  ausdrücklich „residential **or commercial** use".

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
