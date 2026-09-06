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

- Jedes Angebot (`Offer`) braucht einen Betrag (`priceCents` netto bzw.
  `unitPrice` bei nutzungsabhängiger Abrechnung), `vatRate` und einen
  expliziten `serviceScope` mit `level: Full | Partial | None` — und
  `level: Full` verlangt seit v0.3 nachweislich Wartung, Reparaturen und
  Ersatzgerät
- Wiederkehrende Angebote (Rent/Leasing/RaaS) brauchen `billingPeriod` und
  `minTermMonths`; „ab"-Preise sind als `isStartingPrice` markiert;
  Tagessätze sind ein eigener `offerType`; Angebotsart und Abrechnungsperiode
  müssen zueinander passen (`Purchase` ⇒ `Once`, `DayRate` ⇒ `Day` …)
- Flächenleistung ist zweigeteilt: `areaPerformanceTheoreticalM2h` vs.
  `areaPerformancePracticalM2h` — theoretische Werte (Arbeitsbreite ×
  Maximaltempo) können nie als praktische ausgegeben werden
- `compliance` (CE-Kennzeichnung, Rechtsgrundlage MRL 2006/42/EG bzw.
  MVO 2023/1230, Normen wie EN IEC 63327, DSGVO-Sensorik-Profil) ist
  Pflichtbestandteil jedes Listings

## Schema-Versionen

| Version | Scope | Status |
|---------|-------|--------|
| **v0.3** | v0.2 plus: dauerhafte Identitäten (`productId`, `variantId`, `revision`, `supplier.supplierId`, `offers[].offerId`), Herkunft je Aussage (`provenance`), dezimaler Einheitspreis `unitPrice` für Pay-per-Use, validierte Konsistenz von `serviceScope` und Abrechnungsperiode, Feed mit Pflicht-`listingId` | **Aktuell** (Entwurf) |
| **v0.2** | v0.1 plus: `classifications` (ECLASS/ETIM/CPV …), `lifecycleStatus` mit validierter Regel „Announced ⇒ keine offers", Availability-Rework (`status` + Pflicht-Zeitstempel `asOf`), Bildmetadaten, Feed-Schema für Pull-Voll-Feeds, `rs:`-Präfix-Reservierung | Stabil, wird von v0.3 abgelöst |
| **v0.1** | Reinigungsroboter (`capabilities`) und Humanoide (`humanoidCapabilities`) voll spezifiziert; weitere Klassen (Delivery, Disinfection …) zulässig | Bestandssysteme |

### Neu in v0.3

- **Dauerhafte Identitäten** (alle optional, aber dringend empfohlen):
  `productId` und `variantId` (Modell und Ausstattungsvariante über
  Preisänderungen hinweg), `revision` (monoton steigend — ältere Lieferungen
  lassen sich verwerfen), `supplier.supplierId` und `offers[].offerId`
  (eindeutig je Listing). Der empfohlene Upsert-Schlüssel ist
  `(supplier.supplierId, listingId)`, nicht ein rotierender API-Key.
- **`provenance`** (optional): Herkunft und Prüfstatus **je Aussage** —
  JSON-Pointer auf das Feld, Beleg-URL, wer es wann behauptet hat und mit
  welchem `verificationStatus` (`ManufacturerClaim | SupplierClaim |
  OperatorReport | IndependentlyVerified`). Damit sind Herstellerbehauptung
  und gemessener Wert erstmals maschinell unterscheidbar.
- **`offers[].unitPrice`** (breaking für Pay-per-Use): dezimaler Netto-
  Einheitspreis als String mit Bezugsmenge — `{"amount": "0.036",
  "currency": "EUR", "referenceQuantity": {"value": 1, "unit": "M2"}}`.
  3,6 ct/m² waren als ganzzahlige Cent nicht darstellbar. Bezugsgrößen:
  `M2 | Hour | Day | Km | Cycle | Item`. `PayPerUse` verlangt `unitPrice` und
  verbietet `priceCents`; alle anderen Angebotsarten umgekehrt.
- **Validierte Konsistenzregeln** (breaking): `serviceScope.level: Full`
  verlangt `maintenance`, `repairs` und `replacementDevice` = `true`;
  `level: None` verbietet dieselben drei. Angebotsart und Abrechnungsperiode
  müssen zusammenpassen (`Purchase` ⇒ `Once` oder weglassen,
  `Rent/Leasing/RaaS` ⇒ `Month | Week | Year`, `DayRate` ⇒ `Day`,
  `PayPerUse` ⇒ `PerSquareMeter | PerUnit`).
- **Feed v0.3**: `listingId` je Listing **Pflicht** (Idempotenz), optionale
  `revision`, `nextPage` und `feedSignature` sind auf `null` festgelegt statt
  „reserviert, aber offen".
- **Semantische Prüfungen im Validator**, wo JSON Schema nicht reicht:
  `updatedAt ≥ createdAt`, praktische ≤ theoretische Flächenleistung,
  `offerId` eindeutig, `unitPrice.currency` = `offer.currency`,
  `listingCount` = Anzahl Listings, keine doppelten `listingId`, keine ID
  gleichzeitig im Bestand und unter `withdrawnListingIds`.

### Neu in v0.2

- **`classifications`** (optional): Verweise auf ECLASS, ETIM, CPV, UNSPSC …
  — für Handel und öffentliche Ausschreibungen. Crosswalk und Lizenzhinweise:
  [docs/crosswalk-eclass.md](docs/crosswalk-eclass.md).
- **`lifecycleStatus`** (`Announced | Available | Discontinued`): Angekündigte
  Produkte bekommen ein Spec-Sheet, keinen Preis — die Regel „Announced ⇒
  keine offers" ist **schema-validiert**, nicht nur beschrieben.
- **Availability-Rework** (breaking): `status`-Enum (`InStock | LeadTime |
  MadeToOrder | PreOrder | OnRequest | OutOfStock`) und Pflicht-Zeitstempel
  `asOf` — eine Verfügbarkeitsaussage ohne Datum ist keine Aussage.
  `availableFrom` ist bei `PreOrder` Pflicht.
- **Feed-Konvention**: Pull-Voll-Feed mit Schutzschaltern (7-Tage-Karenz,
  50-%-Regel, 30-Tage-Verfall auf `OnRequest`) statt fehleranfälliger
  Delta-Semantik; dazu ein „Feed Lite"-CSV-Profil für Shop-Exporte.
- **schema.org-Bridge** (informativ):
  [docs/bridge-schema-org.md](docs/bridge-schema-org.md) — Mapping,
  JSON-LD-Referenzbeispiel, Google-Regeln, Anti-Patterns. Normativ ist nur
  das `propertyID`-Präfix **`rs:`** für RobotSpec-Feldpfade reserviert.

## Migration v0.2 → v0.3

Ein v0.3-Leser kann v0.2-Dokumente weiterverarbeiten (Cent-Preise sind
verlustfrei in Dezimalbeträge überführbar); umgekehrt gilt das nicht — alte
Validatoren lehnen die neuen Felder wegen `additionalProperties: false` ab.
Deshalb: Version explizit aushandeln, `schemaVersion` immer mitliefern.

**Breaking Changes gegenüber v0.2**

| Änderung | Was zu tun ist |
|---|---|
| `schemaVersion` muss `"0.3"` sein | Feldwert hochziehen |
| `serviceScope.level: Full` verlangt `maintenance`, `repairs`, `replacementDevice` = `true` | Entweder die drei Bausteine ausweisen oder auf `Partial` herunterstufen |
| `serviceScope.level: None` verbietet dieselben drei als `true` | Widersprüchliche Datensätze auf `Partial` heben |
| `Purchase` darf keine wiederkehrende `billingPeriod` mehr tragen | `Once` setzen oder Feld weglassen |
| `Rent/Leasing/RaaS` sind auf `Month`, `Week` oder `Year` begrenzt | Angebotsart korrigieren (Tagessatz ist `DayRate`) |
| `PayPerUse` braucht `unitPrice` und darf kein `priceCents` mehr haben | `priceCents: 4` + `PerSquareMeter` wird zu `unitPrice.amount: "0.04"` mit `referenceQuantity: {value: 1, unit: "M2"}` |
| `availability.inStock` ist entfallen (in v0.2 bereits deprecated) | Feld streichen — der Zustand steht in `status` |
| Feed: `listingId` je Listing Pflicht, `feedVersion: "0.3"` | Stabile IDs vergeben; `nextPage`/`feedSignature` nur noch `null` |
| `listingId`, `make`, `model` dürfen nicht mehr aus reinen Leerzeichen bestehen | Datenqualität prüfen |

Additiv und ohne Migrationsaufwand: `productId`, `variantId`, `revision`,
`supplier.supplierId`, `offers[].offerId`, `provenance`, `billingPeriod:
PerUnit`. Die v0.2-Dateien bleiben unverändert im Repo, inklusive der
Beispiele unter `schema/examples/v0.2/` — Konsumenten dürfen weiter auf v0.2
pinnen.

> This content contains ECLASS. The ECLASS Terms of Use apply (www.eclass.eu).
> Referenzierte Version: ECLASS 16.0. Details in
> [docs/crosswalk-eclass.md](docs/crosswalk-eclass.md).

## Design-Prinzipien

| Prinzip | Umsetzung |
|---------|-----------|
| **JSON-first** | JSON Schema Draft 2020-12, kein XML |
| **English field names, camelCase** | `make`, `robotClass`, `priceCents` |
| **Preise exakt, nie als Float** | feste Beträge netto als ganze Cent (`721000` = 7.210,00 €), Einheitspreise als Dezimalstring (`"0.036"`) — plus expliziter `vatRate` |
| **Service-Transparenz als Pflicht** | `serviceScope.level` ist required — und die Stufe muss zu den einzelnen Bausteinen passen |
| **Ehrliche Leistungsdaten** | theoretische und praktische Flächenleistung getrennt; der praktische Wert darf den theoretischen nicht übersteigen |
| **Herkunft statt Behauptung** | `provenance` je Aussage mit `verificationStatus` |
| **Compliance eingebaut** | CE, MRL/MVO, EN IEC 63327, deutsche Betriebsanleitung, DSGVO-Profil |
| **Neutrale Taxonomie** | Eigene Enum-Werte statt Hersteller-/Plattform-Codes |
| **Varianten-Disziplin** | `variant`/`variantId`; Varianten nie unter einer `listingId` mischen |
| **Stabile Identitäten** | `productId`, `listingId`, `offerId`, `supplierId`, `revision` für Idempotenz statt zufälliger IDs je Lieferung |
| **Erweiterbar** | `extensions`-Objekt für plattformspezifische Daten |
| **Semantic Versioning** | Klare Migrationspfade zwischen Versionen |

## Nutzung

```bash
npm install
npm run validate         # Schema + alle Beispiele
npm run test:converter   # Konverter-Tests (zero-dependency)
npm test                 # beides
```

## Konverter: RobotSpec → schema.org

`converter/` enthält **`@robotspec/to-schemaorg`** — einen
zero-dependency-ESM-Konverter (Node 20+), der aus einem v0.3- (oder weiterhin
v0.2-) Listing fertiges schema.org-JSON-LD erzeugt:

```js
import { toSchemaOrg } from "./converter/index.mjs";
const jsonld = toSchemaOrg(listing, { profile: "merchant-listing", vatMode: "gross" });
```

Zwei Profile (`merchant-listing` mit einzelnen `Offer`-Objekten,
`product-snippet` mit `AggregateOffer` je Angebotsklasse, Währung und
Preisbasis), `vatMode: gross | net` (brutto rechnet `vatRate` auf; dezimale
Einheitspreise bleiben subcent-genau), Guards gegen die Anti-Patterns der
Bridge (Announced ⇒ kein Offer-Markup, kein Mischen von Kaufpreis, Monatsrate
und Nutzungspreis, CE nie über `hasCertification`) und Golden-File-Tests gegen
alle Beispiele. Details, Mapping-Tabelle und Designentscheidungen:
[converter/README.md](converter/README.md).

## Referenzimplementierung

Ein RaaS-Marktplatz-POC für Reinigungsrobotik im DACH-Raum nutzt RobotSpec
produktiv als Partner-Ingest-Format: Validierung per Ajv, Kuratierungs-Queue
statt Auto-Publish, Mapping auf ein internes Listing-Modell
([MAPPING-referenz.md](MAPPING-referenz.md)). RobotSpec ist
**herstellerneutral und offen** (MIT) — Beiträge und weitere
Implementierungen sind ausdrücklich willkommen.

## Dateien

- `schema/robotspec-v0.3.schema.json` — das aktuelle Listing-Schema (Draft 2020-12)
- `schema/robotspec-feed-0.3.schema.json` — Feed-Umschlag für Pull-Voll-Feeds
- `schema/robotspec-v0.2.schema.json`, `schema/robotspec-feed-0.2.schema.json`,
  `schema/robotspec-v0.1.schema.json` — Vorversionen, unverändert (für
  Bestandssysteme, die darauf pinnen)
- `schema/examples/` — validierende v0.3-Beispiele (RaaS mit Full-Service,
  Leasing ohne Service, Event-Tagesmiete, Pay-per-Use je m², Spec-Sheets,
  Announced-Humanoid ohne offers, Voll-Feed, Feed-Lite-CSV)
- `schema/examples/v0.2/` — dieselben Beispiele in der v0.2-Fassung, damit
  v0.2 testbar bleibt
- `validate-schema.mjs` — Ajv-Validator: wählt das Schema nach `schemaVersion`
  bzw. `feedVersion`, prüft alle Beispiele beider Versionen, ergänzt die
  semantischen Regeln und fährt eine Negativ-Testsuite
- `converter/index.mjs` — Konverter RobotSpec v0.3/v0.2 → schema.org JSON-LD (ESM, ohne Abhängigkeiten, mit CLI)
- `converter/README.md` — API, Mapping-Tabelle, Guards und Designentscheidungen des Konverters
- `converter/test.mjs`, `converter/test/golden/` — Testrunner und Golden-Files je Beispiel und Profil
- `docs/crosswalk-eclass.md` — ECLASS/ETIM/CPV-Zuordnung (nicht-normativ)
- `docs/eclass-change-request-entwurf.md` — einreichfertiger Change-Request-Entwurf (neue ECLASS-Klasse)
- `docs/bridge-schema-org.md` — schema.org-Bridge (informativ)
- `MAPPING-referenz.md` — Referenz-Mapping auf ein Marktplatz-Datenmodell
- `ROADMAP.md` — geplante Erweiterungen

## Lizenz

MIT — siehe [LICENSE](LICENSE).
