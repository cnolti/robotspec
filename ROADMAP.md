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

## v0.3 — umgesetzt (09/2026)

- ~~Konverter `@robotspec/to-schemaorg`~~ (Profile `merchant-listing` /
  `product-snippet`, `vatMode: gross|net`, Golden-File-Tests gegen die
  Beispiele) — **umgesetzt (11.08.2026)**: `converter/` (ESM, ohne
  Abhängigkeiten, Node 20+, mit CLI), Guards gegen die Anti-Patterns der
  Bridge, Golden-Files (jedes Beispiel × 2 Profile) plus Unit-Tests unter
  `npm run test:converter`; Doku in
  [converter/README.md](converter/README.md). Offen: `Offer.url` /
  `Product.@id` aus einer Landingpage-URL, `shippingDetails`.
- ~~Dezimale Einheitspreise~~ (`offers[].unitPrice` mit `referenceQuantity`) —
  Subcent-Preise wie 3,6 ct/m² sind darstellbar; `PayPerUse` verlangt sie und
  verbietet `priceCents`.
- ~~Angebotssemantik validieren~~: `serviceScope.level` muss zu den einzelnen
  Bausteinen passen, Angebotsart zur Abrechnungsperiode.
- ~~Dauerhafte Identitäten~~ (`productId`, `variantId`, `revision`,
  `supplier.supplierId`, `offers[].offerId`) und ~~Herkunft je Aussage~~
  (`provenance` mit `verificationStatus`).
- ~~Semantische Feed-Prüfung~~: `listingId` im Feed Pflicht, `listingCount`
  gegen die Listenlänge, doppelte IDs, ID gleichzeitig im Bestand und
  zurückgezogen — im Validator umgesetzt, dazu eine Negativ-Testsuite.
- ~~ECLASS-Change-Request „Autonome Scheuersaugmaschine" unter 21-19-01~~ —
  **Entwurf einreichfertig**, Begründung auf autonome Scheuersaugmaschinen
  eingegrenzt (09/2026):
  [docs/eclass-change-request-entwurf.md](docs/eclass-change-request-entwurf.md).

## v0.4 (Kandidaten)

- Delta-Feeds (`feedType: delta`) — erst wenn Voll-Feeds in der Praxis
  an Grenzen stoßen
- `feedSignature` scharf schalten (HTTP Message Signatures, RFC 9421);
  bis dahin ist das Feld auf `null` festgelegt
- Klassenprofile für Delivery und Inspection (eigene Sub-Objekte analog
  `CleaningCapabilities`); Disinfection und Security danach
- Ausdrücklich unbekannter CE-Status: `ceMarking` ist heute Boolean —
  „unbekannt" und „nicht zutreffend" fehlen als Zustand
- Compliance-Nachweise: verifizierbare `declarationOfConformityUrl`
  (Prüfsumme/Signatur), Normen mit Ausgabestand, Nachweis der deutschen
  Betriebsanleitung
- Referenz-API-Konventionen: Upsert über `(supplier.supplierId, listingId)`,
  `PATCH …/availability` für Teilupdates, `X-Idempotency-Key`
- ETIM-Change-Request zum nächsten Zyklus prüfen
- `serviceScope`-Preisaufschlüsselung: optionale `servicePriceCents` je
  Baustein, damit Full-Service-Raten zerlegbar werden
- Gebraucht-/Vorführgeräte: strukturierte Zustandsangaben
  (`batteryHealthPct`, Wartungshistorie)
- Messbedingungen zu Leistungsdaten (Bodenart, Verschmutzung, Geräuschmessung
  nach Norm) statt nackter Zahlen
- Englische Feldbeschreibungen (EN als Hauptsprache mit DE-Übersetzung)

## Offen / zu klären

- Governance: Wer pflegt Enum-Erweiterungen (neue `robotClass`,
  `navigationTypes`)?
- Registry maschinenlesbarer Herstellernamen (Duplikate wie
  „Gausium" vs. „Shanghai Gaussian Automation Technology")
- Namensräume für `extensions` (heute frei), damit zwei Plattformen sich
  nicht denselben Schlüssel greifen
- `provenance.path`: Soll der Validator prüfen, dass der JSON-Pointer im
  Dokument existiert? (heute nur Formatprüfung)
