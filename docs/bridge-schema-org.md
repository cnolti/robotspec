# Bridge: RobotSpec → schema.org (informativ, nicht normativ)

Diese Bridge beschreibt, wie ein Händler/Anbieter aus einem RobotSpec-Listing
sein schema.org-Markup (JSON-LD) erzeugt. Sie ist bewusst **kein normativer
Bestandteil** der Spec: Googles Rich-Result-Anforderungen ändern sich mehrmals
jährlich, und rund 60 % des RobotSpec-Modells (serviceScope, Compliance,
Netto-Preise) haben ohnehin keine SERP-Wirkung. Normativ reserviert
RobotSpec nur das `propertyID`-Präfix **`rs:`** für RobotSpec-Feldpfade in
`additionalProperty`-Einträgen.

**Zum `rs:`-Kanal, damit keine falsche Erwartung entsteht:** Die Zeichenketten
hinter `rs:` sind eine **Konvention zur Wiedererkennung**, keine wörtlich
auflösbaren Schema-Pfade. `rs:offer.priceCents` bezeichnet die Eigenschaft
`priceCents` eines Angebots — im Dokument steht sie unter
`/offers/<index>/priceCents`, und in einem `AggregateOffer` fasst derselbe
Schlüssel mehrere Angebote zusammen. Ein Roundtrip zurück nach RobotSpec ist
deshalb nicht garantiert: Die Aggregation verliert absichtlich
Einzelvertragsdaten, und die Klassifikationsversion steckt nur im Anzeigenamen.
Das Präfix zeigt auf die Schemaversion des Quelldokuments
(`https://robotspec.org/schema/v0.3/#`); stabil und normativ ist der
`rs:`-Schlüssel, nicht die IRI dahinter.

## Die drei Regeln, die über den Modus entscheiden (an Google-Doku verifiziert, Stand 08/2026)

1. **Merchant Listings** („Shopping-Karten") gibt es nur für Seiten mit
   direkter Kaufmöglichkeit — und nur mit einzelnem `Offer`, nie
   `AggregateOffer`. Ein Marktplatz mit Lead-Formular qualifiziert sich
   NICHT; Händler-Shops schon.
2. **Product Snippets** stehen auch Aggregatoren offen („shopping aggregator
   pages" ist Googles eigenes Beispiel) — dort ist `AggregateOffer` mit
   `lowPrice`/`highPrice`/`offerCount` der richtige Weg.
3. **Deutschland: Bruttopreis-Pflicht.** Google verlangt den Preis inkl.
   MwSt., identisch zur sichtbaren Landingpage. Das kollidiert mit dem
   RobotSpec-Prinzip „netto in Cent" und ist nur redaktionell lösbar: beide
   Preise sichtbar auf der Seite, Brutto ins Markup, Netto-Cent in
   `additionalProperty` (`rs:offer.priceCents`).

Weitere verifizierte Punkte: `availability_date` ist bei PreOrder/Backorder
Pflicht und sollte max. 12 Monate in der Zukunft liegen; Feeds/Markup
verfallen nach 30 Tagen ohne Aktualisierung (RobotSpec übersetzt das in den
`OnRequest`-Fallback, siehe Feed-Schema). Die komplette RaaS-Semantik
(`UnitPriceSpecification` mit `billingDuration`, `priceComponentType:
Subscription`) ist valides schema.org, taucht aber in keiner
Google-Property-Tabelle auf — korrektes Markup ohne SERP-Wirkung.

## Mapping-Kurzreferenz

| RobotSpec | schema.org |
|---|---|
| `make` / `model` / `variant` | `Product.brand` / `Product.model` / im `name` |
| `gtin` / `manufacturerSku` / `listingId` | `Product.gtin` / `Product.mpn` / `Product.sku` |
| `productId` | `Product.productID` (`variantId` und `revision` bleiben `rs:`) |
| `supplier.supplierId` | `Organization.identifier` |
| `media.images[]` (+ `widthPx`/`heightPx`/`altDe`) | `Product.image[]` |
| `capabilities.*`, `compliance.*` | `additionalProperty[]` mit `propertyID: "rs:<feldpfad>"` |
| `offers[].priceCents` + `vatRate` | `Offer.price` (BRUTTO, berechnet) + `rs:offer.priceCents` (netto) |
| `offers[].unitPrice` (PayPerUse) | `Offer.price` als **Dezimalbetrag** (brutto berechnet, subcent-genau) + `UnitPriceSpecification.referenceQuantity` aus `referenceQuantity` (UN/CEFACT: `M2`→MTK, `Hour`→HUR, `Day`→DAY, `Km`→KMT, `Item`→C62; `Cycle` nur als `unitText`) + `rs:offer.unitPrice.amount` (netto) |
| `offers[].offerType Purchase` | `businessFunction: gr:Sell` |
| `offers[].offerType Rent/Leasing/RaaS` | `businessFunction: gr:LeaseOut` bzw. `gr:ProvideService`, `UnitPriceSpecification` mit `referenceQuantity` (MON) und `billingDuration` (Mindestlaufzeit) |
| `offers[].offerType PayPerUse` | `businessFunction: gr:ProvideService`, `UnitPriceSpecification` **ohne** `priceComponentType` — ein Einheitspreis ist kein Abonnement |
| `provenance[]` | kein Mapping — Herkunftsdaten gehören nicht ins seitensichtbare Markup |
| `offers[].availability.status` | `Offer.availability` (InStock/PreOrder/…) — **`lifecycleStatus: Announced` wird NIE auf `PreOrder` gemappt** (PreOrder heißt „bestellbar") |
| `offers[].setupFeeCents` | `Offer.addOn` mit `priceComponentType: ActivationFee` |
| `serviceScope` (Full-Service) | `Offer.warranty` (WarrantyPromise) + `rs:offer.serviceScope.*` |
| `supplier` | `Organization` (`@id`-referenziert als `seller`) mit `vatID` |

## Referenzbeispiel (Merchant-Listing-Modus eines Händlers)

Vollständiges, geparstes Beispiel — Gausium Scrubber 50 Pro mit Kauf- und
RaaS-Offer, Bruttopreise berechnet aus den Netto-Cent-Werten der Quelldatei
(31.990,00 € × 1,19 = 38.068,10 €; 1.190,00 € × 1,19 = 1.416,10 €):

```html
<script type="application/ld+json">
{
  "@context": [
    "https://schema.org",
    { "rs": "https://robotspec.org/schema/v0.3/#", "gr": "http://purl.org/goodrelations/v1#" }
  ],
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://example-supplier.de/#organization",
      "name": "Demo Robotics GmbH",
      "url": "https://example-supplier.de",
      "vatID": "DE123456789",
      "address": { "@type": "PostalAddress", "addressCountry": "DE", "postalCode": "65760", "addressLocality": "Eschborn" }
    },
    {
      "@type": "Product",
      "@id": "https://example-supplier.de/roboter/gausium-scrubber-50-pro#product",
      "name": "Gausium Scrubber 50 Pro (Walzenbürste)",
      "sku": "demo-supplier-s50pro-001",
      "mpn": "S50PRO-ROLL",
      "brand": { "@type": "Brand", "name": "Gausium" },
      "model": "Scrubber 50 Pro",
      "description": "Autonomer Scheuersaugroboter für Hartböden. Arbeitsbreite 46 cm, praktische Flächenleistung 900 m²/h.",
      "image": ["https://example-supplier.de/img/s50pro-1200x1200.jpg"],
      "weight": { "@type": "QuantitativeValue", "value": 148, "unitCode": "KGM" },
      "additionalProperty": [
        { "@type": "PropertyValue", "propertyID": "rs:robotClass", "name": "Roboterklasse (RobotSpec)", "value": "ScrubberDryer" },
        { "@type": "PropertyValue", "propertyID": "rs:capabilities.areaPerformancePracticalM2h", "name": "Flächenleistung (praktisch)", "value": 900, "unitText": "m²/h" },
        { "@type": "PropertyValue", "propertyID": "rs:capabilities.areaPerformanceTheoreticalM2h", "name": "Flächenleistung (theoretisch)", "value": 1754, "unitText": "m²/h" },
        { "@type": "PropertyValue", "propertyID": "rs:compliance.ceMarking", "name": "CE-Kennzeichnung", "value": true },
        { "@type": "PropertyValue", "propertyID": "rs:compliance.standards", "name": "Angewandte Normen", "value": "EN IEC 63327:2021" }
      ],
      "offers": [
        {
          "@type": "Offer",
          "name": "Kauf (Neugerät, ohne Servicevertrag)",
          "url": "https://example-supplier.de/roboter/gausium-scrubber-50-pro",
          "businessFunction": "http://purl.org/goodrelations/v1#Sell",
          "itemCondition": "https://schema.org/NewCondition",
          "availability": "https://schema.org/InStock",
          "priceCurrency": "EUR",
          "price": 38068.10,
          "priceSpecification": {
            "@type": "UnitPriceSpecification",
            "price": 38068.10, "priceCurrency": "EUR", "valueAddedTaxIncluded": true
          },
          "seller": { "@id": "https://example-supplier.de/#organization" },
          "description": "Netto 31.990,00 EUR zzgl. 19 % USt. Kein Servicevertrag enthalten (rs:offer.serviceScope.level = None).",
          "additionalProperty": [
            { "@type": "PropertyValue", "propertyID": "rs:offer.offerType", "value": "Purchase" },
            { "@type": "PropertyValue", "propertyID": "rs:offer.priceCents", "name": "Nettopreis in Cent", "value": 3199000 },
            { "@type": "PropertyValue", "propertyID": "rs:offer.vatRate", "value": 19 },
            { "@type": "PropertyValue", "propertyID": "rs:offer.serviceScope.level", "value": "None" }
          ]
        },
        {
          "@type": "Offer",
          "name": "Robot-as-a-Service, Full-Service, ab 24 Monate",
          "businessFunction": "http://purl.org/goodrelations/v1#ProvideService",
          "availability": "https://schema.org/InStock",
          "priceCurrency": "EUR",
          "price": 1416.10,
          "priceSpecification": {
            "@type": "UnitPriceSpecification",
            "price": 1416.10, "priceCurrency": "EUR", "valueAddedTaxIncluded": true,
            "priceComponentType": "https://schema.org/Subscription",
            "referenceQuantity": { "@type": "QuantitativeValue", "value": 1, "unitCode": "MON" },
            "billingDuration": { "@type": "QuantitativeValue", "value": 24, "unitCode": "MON" }
          },
          "eligibleCustomerType": "http://purl.org/goodrelations/v1#Business",
          "warranty": {
            "@type": "WarrantyPromise",
            "name": "Full-Service (Wartung, Reparaturen, Verschleißteile, Ersatzgerät binnen 48 h)",
            "durationOfWarranty": { "@type": "QuantitativeValue", "value": 24, "unitCode": "MON" }
          },
          "description": "Ab 1.190,00 EUR netto/Monat zzgl. 19 % USt., Mindestlaufzeit 24 Monate. Nicht enthalten: Verbrauchsmaterial, Versicherung.",
          "additionalProperty": [
            { "@type": "PropertyValue", "propertyID": "rs:offer.offerType", "value": "RaaS" },
            { "@type": "PropertyValue", "propertyID": "rs:offer.priceCents", "name": "Nettorate in Cent", "value": 119000 },
            { "@type": "PropertyValue", "propertyID": "rs:offer.isStartingPrice", "value": true },
            { "@type": "PropertyValue", "propertyID": "rs:offer.minTermMonths", "value": 24 },
            { "@type": "PropertyValue", "propertyID": "rs:offer.serviceScope.level", "value": "Full" }
          ]
        }
      ]
    }
  ]
}
</script>
```

## Marktplatz-Variante (Product Snippet, Aggregator)

```json
"offers": {
  "@type": "AggregateOffer",
  "priceCurrency": "EUR",
  "lowPrice": 38068.10,
  "highPrice": 41200.00,
  "offerCount": 3,
  "availability": "https://schema.org/InStock"
}
```

## Anti-Patterns

- **Netto ins `price`-Feld** — in DE muss der Bruttopreis der Landingpage
  ins Markup; der Nettobetrag gehört in `rs:offer.priceCents` bzw.
  `rs:offer.unitPrice.amount`.
- **Kauf-, Miet- und Nutzungsangebote in einem `AggregateOffer` mischen** —
  erzeugt „ab 1.416 €"-Klickfallen (Monatsrate neben Kaufpreis) und, seit es
  Einheitspreise gibt, „ab 0,04 €"-Fallen (Preis je m² neben Monatsrate).
  Auch zwei Einheitspreise mit verschiedenen Bezugsgrößen (je m² und je
  Stunde) sind kein gemeinsamer Preisbereich.
- **Einheitspreise auf Cent runden** — 3,6 ct/m² werden dabei zu 4 ct/m²
  (+11 %) oder gleich zu „0 €". Der Dezimalbetrag bleibt exakt; gerundet wird
  erst der Rechnungsbetrag.
- **`lifecycleStatus: Announced` als `PreOrder` mappen** — PreOrder heißt
  „bestellbar"; ein angekündigter Roboter bekommt gar kein Offer-Markup.
- **CE über `hasCertification`** — von Google nicht ausgewertet; als
  `additionalProperty` mitführen (nützlich für LLM-/RAG-Konsumenten).
- **Markup für unsichtbare Inhalte** — alles im JSON-LD muss auf der Seite
  sichtbar sein; JSON-LD serverseitig rendern.

## Konverter (umgesetzt)

`@robotspec/to-schemaorg` (MIT) setzt diese Bridge um: Profile
`merchant-listing` / `product-snippet`, `vatMode: gross|net`,
Golden-File-Tests gegen `schema/examples/*.json`, ESM ohne Laufzeit-
Abhängigkeiten, zusätzlich als CLI. Er akzeptiert v0.3- und v0.2-Listings.
API, vollständige Mapping-Tabelle und die Designentscheidungen stehen in
[../converter/README.md](../converter/README.md).

Der Konverter ist primär ein Argument FÜR Anbieter, RobotSpec zu liefern:
„dein Feed erzeugt nebenbei dein Google-Markup". Was er **nicht** erzeugt:
`Offer.url` und `Product.@id` (RobotSpec kennt keine Landingpage-URL),
`shippingDetails`, `hasMerchantReturnPolicy`, `aggregateRating`. Und er ist
kein Validator — ungültige Listings ergeben ungültiges Markup.
