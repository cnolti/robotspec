# @robotspec/to-schemaorg

Konverter von **RobotSpec v0.3** (und weiterhin **v0.2**) nach **schema.org
JSON-LD**. Reines ESM, keine Laufzeit-Abhängigkeiten, Node 20+.
Umsetzungsgrundlage ist die informative Bridge
[docs/bridge-schema-org.md](../docs/bridge-schema-org.md); normativ ist
daraus nur das `propertyID`-Präfix **`rs:`** für RobotSpec-Feldpfade.

Kurzfassung des Nutzens: Wer seine Angebote ohnehin als RobotSpec liefert,
erzeugt daraus nebenbei sein Produkt-Markup — inklusive Bruttopreis-Rechnung,
Serviceumfang und Verfügbarkeitsstatus.

## Nutzung

```js
import { toSchemaOrg } from "./converter/index.mjs";

const listing = JSON.parse(await readFile("schema/examples/gausium-scrubber-50-raas.json", "utf8"));

const jsonld = toSchemaOrg(listing, {
  profile: "merchant-listing", // oder "product-snippet"
  vatMode: "gross",            // oder "net"
});

// serverseitig rendern:
// <script type="application/ld+json">${JSON.stringify(jsonld)}</script>
```

Zusätzlich gibt es ein kleines CLI:

```bash
node converter/index.mjs schema/examples/gausium-scrubber-50-raas.json \
  --profile=product-snippet --vatMode=gross
```

## API

### `toSchemaOrg(doc, options?) → object`

| Parameter | Typ | Default | Bedeutung |
|---|---|---|---|
| `doc` | `object` | — | RobotSpec-Listing v0.3 oder v0.2 (validiert oder unvalidiert) |
| `options.profile` | `"merchant-listing" \| "product-snippet"` | `"merchant-listing"` | Ausgabeprofil, siehe unten |
| `options.vatMode` | `"gross" \| "net"` | `"gross"` | `gross` rechnet `vatRate` auf die Nettopreise auf |

Rückgabe ist ein JSON-LD-Objekt mit `@context` und einem `@graph` aus genau
zwei Knoten: `Organization` (der Anbieter) und `Product` (das Listing samt
`offers`). Das `rs:`-Präfix im `@context` zeigt auf die Schemaversion des
Eingabedokuments (ohne `schemaVersion`: die aktuelle Version).

Weitere Exporte: `PROFILES`, `VAT_MODES`, `SUPPORTED_SCHEMA_VERSIONS` (die
zulässigen Optionswerte bzw. Schemaversionen) und ein Default-Export, der auf
`toSchemaOrg` zeigt.

**Fehler** (alle mit deutscher Klartextmeldung):

- `TypeError`, wenn `doc` oder `options` kein Objekt ist
- `TypeError` bei unbekanntem `profile`/`vatMode` oder unbekannten Optionsnamen
- `Error`, wenn `doc.schemaVersion` gesetzt und weder `"0.2"` noch `"0.3"` ist
- `Error`, wenn `make` oder `model` fehlen

### Profil `merchant-listing`

Für Händler-Shops mit direkter Kaufmöglichkeit. Jedes RobotSpec-Offer wird ein
eigenes `Offer`-Objekt mit Preis, `businessFunction`, `priceSpecification`,
`warranty`, `addOn` und vollständigem `rs:`-Datensatz. **Nie** `AggregateOffer`
— Merchant-Listing-Darstellungen sind damit nicht erreichbar.

### Profil `product-snippet`

Für Aggregatoren/Marktplätze. Die Angebote werden nach **Angebotsklasse,
Währung und Preisbasis** gruppiert; je Gruppe entsteht ein `AggregateOffer`
mit `lowPrice`/`highPrice`/`offerCount`. Die drei Angebotsklassen sind

| Klasse | `offerType` | Preisbasis |
|---|---|---|
| Kauf | `Purchase` | einmalig |
| Überlassung auf Zeit | `Rent`, `Leasing`, `RaaS`, `DayRate` | `billingPeriod` |
| nutzungsabhängig | `PayPerUse` | `unitPrice.referenceQuantity` (Einheit **und** Menge) |

Ein Kaufpreis landet dadurch nie mit einer Monatsrate oder einem Preis je m²
im selben Aggregat, und zwei Einheitspreise mit verschiedenen Bezugsgrößen
(je m², je Stunde) bleiben ebenfalls getrennt. Bei genau einer Gruppe ist
`offers` ein Objekt, sonst ein Array (Reihenfolge: Klasse, dann Periode
Once → Jahr → Monat → Woche → Tag bzw. Bezugsgröße m² → Stunde → Tag → km →
Zyklus → Stück, dann Währung).

## Mapping-Überblick

| RobotSpec | schema.org |
|---|---|
| `make` / `model` / `variant` | `Product.brand` / `Product.model` / in `Product.name` |
| `listingId` / `manufacturerSku` / `gtin` | `sku` / `mpn` / `gtin` |
| `productId` | `Product.productID` |
| `variantId` / `revision` | `rs:variantId` / `rs:revision` |
| `description` / `summary` | `description` / `disambiguatingDescription` |
| `capabilities.weightKg`, `humanoidCapabilities.weightKg` | `Product.weight` (`KGM`) |
| `media.images[]` | `Product.image[]` (`ImageObject`, wenn Metadaten vorhanden) |
| alle übrigen Fachfelder | `additionalProperty[]` mit `propertyID: "rs:<feldpfad>"` |
| `supplier` | `Organization` mit `vatID`, per `@id` als `seller` referenziert |
| `supplier.supplierId` | `Organization.identifier` |
| `provenance[]` | kein Mapping (wie `sourceSystem`/`createdAt` interne Herkunft) |
| `offers[].offerId` | `rs:offer.offerId` |
| `offers[].priceCents` + `vatRate` | `Offer.price` (brutto bei `vatMode: gross`) + `rs:offer.priceCents` |
| `offers[].unitPrice.amount` + `vatRate` | `Offer.price` als Dezimalbetrag mit 2–6 Nachkommastellen + `rs:offer.unitPrice.amount` (netto) |
| `offers[].unitPrice.currency` | `Offer.priceCurrency` (muss mit `offers[].currency` übereinstimmen) |
| `offers[].unitPrice.referenceQuantity` | `UnitPriceSpecification.referenceQuantity` (siehe Einheitentabelle) |
| `offerType: Purchase` | `businessFunction: gr:Sell` |
| `offerType: Rent \| Leasing \| DayRate` | `gr:LeaseOut` |
| `offerType: RaaS \| PayPerUse` | `gr:ProvideService` |
| `billingPeriod` | `UnitPriceSpecification.referenceQuantity` (`MON`/`DAY`/`WEE`/`ANN`) — bei `PayPerUse` liefert stattdessen `unitPrice.referenceQuantity` die Bezugsgröße |
| `minTermMonths` | `UnitPriceSpecification.billingDuration` (`MON`) |
| `setupFeeCents` | `Offer.addOn` mit `priceComponentType: ActivationFee` |
| `deliveryFeeCents` | `Offer.addOn` „Lieferung" |
| `serviceScope.level: Full` | `Offer.warranty` (`WarrantyPromise`) |
| `availability.status` | `Offer.availability` (`ItemAvailability`) |
| `availability.leadTimeDays` | `Offer.deliveryLeadTime` (`DAY`) |
| `availability.availableFrom` | `Offer.availabilityStarts` |
| `availability.quantityAvailable` | `Offer.inventoryLevel` |
| `availability.serviceRegions` (ISO) | `Offer.eligibleRegion` |
| `validUntil` | `Offer.priceValidUntil` |
| `condition` | `Offer.itemCondition` (+ `rs:condition`) |

Bezugsgrößen des dezimalen Einheitspreises (`unitPrice.referenceQuantity.unit`)
nach UN/CEFACT Rec. 20:

| RobotSpec | `unitCode` | Hinweis |
|---|---|---|
| `M2` | `MTK` | Quadratmeter |
| `Hour` | `HUR` | Stunde |
| `Day` | `DAY` | Tag |
| `Km` | `KMT` | Kilometer |
| `Item` | `C62` | Stück (dimensionslose Einheit) |
| `Cycle` | — | kein passender Code; stattdessen `unitText: "Zyklus"` |

Availability-Mapping im Detail:

| RobotSpec | schema.org |
|---|---|
| `InStock` | `InStock` |
| `LeadTime` | `InStock` + `deliveryLeadTime` |
| `MadeToOrder` | `MadeToOrder` |
| `PreOrder` | `PreOrder` + `availabilityStarts` |
| `OnRequest` | `LimitedAvailability` |
| `OutOfStock` | `OutOfStock` |
| kein `availability`-Objekt | kein `availability`-Feld |

## Eingebaute Guards gegen die Anti-Patterns der Bridge

| Anti-Pattern | Guard im Konverter |
|---|---|
| Netto im `price`-Feld | Default `vatMode: "gross"`; der Nettobetrag bleibt ausschließlich in `rs:offer.priceCents` bzw. `rs:offer.unitPrice.amount`, `valueAddedTaxIncluded` wird passend gesetzt |
| Kauf-, Miet- und Nutzungsangebote in einem `AggregateOffer` | Gruppierung nach Angebotsklasse, Währung **und** Preisbasis; `merchant-listing` erzeugt grundsätzlich kein `AggregateOffer` |
| Einheitspreise auf Cent runden | Dezimale Einheitspreise werden in Mikroeinheiten gerechnet (10⁻⁶ der Währungseinheit) und mit 2–6 Nachkommastellen ausgegeben: 0,036 € × 1,19 = `"0.04284"`, nicht `"0.04"` |
| `lifecycleStatus: Announced` als `PreOrder` | Announced-Listings bekommen gar keine `offers` — auch dann nicht, wenn das Eingabedokument welche mitbringt; `PreOrder` entsteht ausschließlich aus `availability.status` |
| CE über `hasCertification` | `compliance.ceMarking` wird nur als `additionalProperty` geführt; `hasCertification` kommt im Output nicht vor |
| Markup für unsichtbare Inhalte | `sourceSystem`, `createdAt`, `extensions` und `schemaVersion` werden nicht gemappt; die erzeugten deutschen `description`-Texte fassen ausschließlich Daten zusammen, die auf der Seite ohnehin stehen müssen |

Zusätzlich: uneinheitliche Verfügbarkeiten innerhalb einer Aggregat-Gruppe
lassen `availability` weg, statt einen Status zu raten; fehlende Daten werden
nie durch Defaults ersetzt.

## Designentscheidungen

Punkte, zu denen die Bridge nichts sagt oder an denen der Konverter bewusst von
ihrem (handgeschriebenen, gekürzten) Referenzbeispiel abweicht:

1. **Preise als Dezimalstring** (`"38068.10"` statt `38068.10`). JSON-Zahlen
   verlieren die zweite Nachkommastelle; Google empfiehlt Strings. Gerundet wird
   kaufmännisch auf ganze Cent (`round(netCents × (100 + vatRate) / 100)`), auch
   bei nicht ganzzahligen Sätzen wie CH 8,1 %. **Dezimale Einheitspreise
   (`unitPrice`) werden dagegen NICHT auf Cent gerundet**: Sie werden in
   Mikroeinheiten (10⁻⁶ der Währungseinheit) gerechnet und mit 2–6
   Nachkommastellen ausgegeben. 3,6 ct/m² brutto sind `"0.04284"` — eine
   Rundung auf `"0.04"` wären +11 % Preisabweichung. Gerundet wird erst der
   Rechnungsbetrag, und den bildet RobotSpec nicht ab.
2. **`vatMode: "net"` ist nicht für deutsche Consumer-SERPs gedacht.** Er setzt
   `valueAddedTaxIncluded: false` und liefert den Nettobetrag — sinnvoll für
   reine B2B-Seiten oder Nicht-DE-Kontexte. Für Google-Merchant-Listings in
   Deutschland gilt weiterhin Bruttopflicht.
3. **`rs:` nur für echte RobotSpec-Feldpfade.** Konverter-interne Zustände
   (z. B. „Preis ist brutto") bekommen keine `rs:`-Property, sondern stehen in
   `priceSpecification.valueAddedTaxIncluded` bzw. im deutschen Beschreibungstext.
4. **`name` an jeder `PropertyValue`.** Das Referenzbeispiel lässt ihn an
   einigen Offer-Properties weg; der Konverter setzt durchgängig ein deutsches
   Label, weil der `rs:`-Kanal laut Bridge ausdrücklich LLM-/RAG-Konsumenten
   dient. Numerische Felder tragen zusätzlich `unitText`.
5. **Verlustfreier `rs:`-Kanal, keine Doppelmappings.** Felder mit exakter
   schema.org-Entsprechung (`weightKg`, `validUntil`, `leadTimeDays`,
   `quantityAvailable`, `availableFrom`, ISO-`serviceRegions`) erscheinen nur
   dort. Verlustbehaftete Mappings behalten zusätzlich das Original:
   `condition` (Demo → `UsedCondition`) und `availability.status`
   (`LeadTime` → `InStock`, `OnRequest` → `LimitedAvailability`).
6. **`LeadTime` bleibt `InStock`.** Investitionsgüter mit 10–14 Tagen Lieferzeit
   sind bestellbar, nicht „back ordered"; das Referenzbeispiel der Bridge macht
   es genauso. Die Lieferzeit steht exakt in `deliveryLeadTime`.
   `availabilityStarts` wird nur aus einem vorhandenen `availableFrom` gesetzt —
   der Konverter rechnet keine Termine aus.
7. **`OnRequest` → `LimitedAvailability`** ist die am wenigsten falsche
   Näherung; schema.org kennt kein „auf Anfrage". Der exakte Status bleibt in
   `rs:offer.availability.status`.
8. **`priceComponentType: Subscription` nur bei `Rent`/`Leasing`/`RaaS`.**
   Tagesmiete und Pay-per-Use sind Einheitspreise und bekommen nur
   `referenceQuantity` (1 `DAY` bzw. 1 `MTK`). Die Alternative `Installment`
   für Leasing wurde verworfen — die Bridge zeigt `Subscription`. Eine
   `minTermMonths` bekommt auch ein Pay-per-Use-Angebot als `billingDuration` —
   die Mindestlaufzeit gilt unabhängig von der Preisbasis.
9. **`eligibleCustomerType: gr:Business` nur bei RaaS** — genau dort, wo das
   Referenzbeispiel es setzt. RobotSpec kennt kein B2B-/B2C-Feld; für
   Leasing oder Miete wäre die Angabe erfunden.
10. **`WarrantyPromise` nur bei `serviceScope.level: Full`** und mit den
    gewährleistungsrelevanten Bausteinen im Namen (Wartung, Reparaturen,
    Verschleißteile, Ersatzgerät inkl. SLA). Der vollständige Serviceumfang
    steht in `description` und in `rs:offer.serviceScope.*`. `Partial` erzeugt
    keine Garantiezusage.
11. **Gebühren:** `setupFeeCents` wird ein `addOn` mit `ActivationFee`,
    `deliveryFeeCents` ein neutral benanntes `addOn` — schema.org kennt keinen
    Shipping-Preiskomponententyp, und `shippingDetails` bräuchte ein
    Zielgebietsmodell, das RobotSpec nicht liefert. Ein Betrag von `0` erzeugt
    **kein** `addOn`, bleibt aber als `rs:offer.setupFeeCents = 0` erhalten und
    wird im Text als „kostenfrei" ausgewiesen. `buyoutOptionCents` hat keine
    schema.org-Entsprechung und bleibt rein `rs:`.
12. **`@id`-Vergabe.** Die Organisation bekommt `<supplier.website>/#organization`;
    ohne Website den Blank-Node `_:supplier` statt einer erfundenen URL. Das
    `Product` bekommt **kein** `@id` und **kein** `Offer.url`, weil RobotSpec
    keine Landingpage-URL kennt — beides ergänzt der Publisher beim Rendern.
13. **`location` in der Anbieteradresse.** Das Referenzbeispiel baut
    `PostalAddress` aus `supplier.countryCode` plus `location.postalCode`/`city`.
    Der Konverter macht das ebenso, aber nur wenn das Land von `location` zum
    Anbieterland passt; sonst bleibt die Adresse beim Land und der Standort
    wandert nach `rs:location.*`.
14. **Bilder.** Quellreihenfolge bleibt erhalten, es wird nichts gefiltert oder
    umsortiert. Ohne Metadaten ein URL-String, mit `widthPx`/`heightPx`/`altDe`/
    `type` ein `ImageObject` mit `caption` und `width`/`height` als
    `QuantitativeValue` (`unitCode: "E37"` = Pixel nach UN/CEFACT Rec. 20,
    zusätzlich `unitText: "px"`).
15. **Klassifikationen** werden zu `rs:classifications.<system>` mit dem Release
    im `name` (`"CPV 2008"`, `"ECLASS 16.0"`); ein `irdi` bekommt einen eigenen
    Eintrag. Kein Mapping auf `Product.category` — die Systeme sind nicht
    deckungsgleich mit Googles Kategoriebegriff.
16. **`serialNumber` bleibt `rs:`.** schema.org führt `serialNumber` nicht auf
    `Product`, sondern auf `IndividualProduct`/`Offer`; ein Typwechsel wäre für
    Konsumenten riskanter als der `rs:`-Eintrag.
17. **Deutsche Texte werden erzeugt.** `Offer.name`, `Offer.description` und die
    Aggregat-Beschreibungen entstehen deterministisch aus den Pflichtfeldern
    (Betrag, Laufzeit, Serviceumfang, MwSt.-Status, Stand der Aussage). Sie
    **müssen auf der Landingpage sichtbar sein** — wer sie dort nicht abbildet,
    entfernt sie vor der Ausgabe.
18. **`product-snippet` aggregiert bewusst.** Einzelangebots-Details (Service,
    Gebühren, Verfügbarkeitszeitstempel) gehen dabei verloren; wer sie braucht,
    nutzt `merchant-listing`. Erhalten bleiben Angebotsart, Netto-Cent (als
    Bereich), USt.-Satz, Abrechnungsperiode, Mindestlaufzeit und Service-Stufe,
    sofern in der Gruppe einheitlich.
19. **Auch bei nur einem Angebot entsteht ein `AggregateOffer`** — gleiche
    Ausgabeform unabhängig von der Angebotszahl, `offerCount: 1`.
20. **Spec-Sheets ohne `offers`** liefern in beiden Profilen dieselbe Ausgabe;
    das Profil betrifft ausschließlich die Angebotsdarstellung.
21. **Dauerhafte Identitäten (v0.3):** `productId` wird `Product.productID`
    und `supplier.supplierId` wird `Organization.identifier` — beides sind
    exakte schema.org-Entsprechungen, also kein zusätzlicher `rs:`-Eintrag.
    `variantId`, `revision` und `offerId` bleiben `rs:`: Für die Variante
    bräuchte schema.org eine `ProductGroup` mit `isVariantOf`, die RobotSpec
    nicht liefert; `revision` ist Liefer-Metadatum; `offerId` ist nur
    innerhalb des Listings eindeutig und damit kein `identifier` im Sinne von
    schema.org.
22. **`provenance` bleibt aus dem Markup.** Wer eine Aussage wann behauptet
    hat, steht nicht auf der Landingpage — es fiele damit unter das
    Anti-Pattern „Markup für unsichtbare Inhalte". Wer Prüfstatus anzeigen
    will, rendert ihn sichtbar und ergänzt das Markup selbst.
23. **Das `rs:`-Präfix folgt der Schemaversion des Eingabedokuments**
    (`…/v0.2/#` bzw. `…/v0.3/#`; ohne `schemaVersion` die aktuelle Version).
    So beschreibt die IRI, was tatsächlich geliefert wurde. Stabil und
    normativ ist der `rs:`-Schlüssel, nicht die IRI.

## Tests

```bash
npm run test:converter        # Golden-Files + Unit-Tests
node converter/test.mjs --update   # Golden-Files neu schreiben
```

Die Golden-Files unter `converter/test/golden/` decken jedes v0.3-Listing-
Beispiel aus `schema/examples/` in beiden Profilen ab (`vatMode: gross`).
Feed-Beispiele (`feed-*.json`, `feed-lite.csv`) sind ausgenommen — der
Konverter arbeitet auf einzelnen Listings; für einen Feed iteriert man über
`feed.listings[]`. Alles, was die Beispieldaten nicht hergeben (Bildmetadaten,
GTIN, CHF, PreOrder, Bezugsgrößen jenseits von m² und Stunde, gemischte
Gruppen, Fehlerfälle), prüfen die Unit-Tests in `converter/test.mjs` — dort
läuft auch ein v0.2-Listing aus `schema/examples/v0.2/` mit, damit die
Rückwärtskompatibilität nicht unbemerkt wegbricht.

## Grenzen

- Der Konverter ist **kein Validator**. Ungültige Listings erzeugen ungültiges
  Markup; vorher `npm run validate` bzw. Ajv gegen
  `schema/robotspec-v0.3.schema.json` laufen lassen.
- `Offer.url`, `Product.@id`, `shippingDetails`, `hasMerchantReturnPolicy`,
  `aggregateRating` und `review` liefert RobotSpec nicht — sie müssen beim
  Rendern ergänzt werden, wenn die jeweilige Google-Darstellung sie verlangt.
- Google-Anforderungen ändern sich mehrmals jährlich. Vor dem Livegang mit dem
  Rich-Results-Test gegenprüfen.
