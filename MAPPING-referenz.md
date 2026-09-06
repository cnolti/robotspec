# Mapping: RobotSpec v0.3 → Marktplatz-Listing (Referenz)

Referenz-Mapping einer Marktplatz-Referenzimplementierung — nicht normativ,
sondern ein durchgerechnetes Beispiel dafür, wie ein Katalog RobotSpec
konsumiert und wo dabei Bedeutung verloren geht.

Die Referenzimplementierung führt Reinigungsklassen im öffentlichen Katalog;
übrige Klassen (Humanoide, Delivery, Inspection …) werden übernommen, bleiben
aber in der Kuratierungs-Queue, weil der Katalog für sie noch keine
Vergleichsdimensionen kennt.

## Klassen

| RobotSpec `robotClass` | Marktplatz-`category` |
|---|---|
| `ScrubberDryer` | `scheuersaugroboter` |
| `Vacuum` | `saugroboter` |
| `Sweeper` | `kehrroboter` |
| `Combination` | `kombiroboter` |
| übrige Klassen | keine Katalogkategorie (kuratiert halten) |

## Identität und Idempotenz

| RobotSpec | Marktplatz | Regel |
|---|---|---|
| `supplier.supplierId` + `listingId` | Upsert-Schlüssel | stabil über Lieferungen hinweg; **nicht** die ID der einzelnen Einreichung verwenden, sonst entstehen bei jeder Lieferung neue Katalogeinträge |
| `revision` | Reihenfolgeschutz | Lieferung mit kleinerer `revision` als der gespeicherten verwerfen |
| `productId` / `variantId` | Modell-/Variantenbündelung | Angebote mehrerer Anbieter zum selben Gerät zusammenführen |
| `offers[].offerId` | Angebots-ID | Referenz für Anfragen und Preishistorie |

## Kernfelder

| RobotSpec | Marktplatz | Regel |
|---|---|---|
| `make` + `model` + `variant` | `manufacturer`, `name`, `id` | `id` = `partner-<slug>-<listingId>` |
| `capabilities.areaPerformancePracticalM2h` | `capabilities.areaPerformanceM2h` + `perfBasis: "praktisch"` | praktischer Wert hat Vorrang |
| `capabilities.areaPerformanceTheoreticalM2h` | dito mit `perfBasis: "theoretisch"` | nur als Fallback |
| `runtimeMinutes` | `runtimeHours` | ÷ 60, 1 Dezimale |
| `offers[]` (Month, Rent/Leasing/RaaS) | `pricing.raasMonthlyEur` | günstigste Monatsrate, Cent → Euro; **nur** bei `currency: EUR` |
| `offers[]` (Purchase) | `pricing.purchaseEur` | Cent → Euro; **nur** bei `currency: EUR` |
| `offers[].unitPrice` (PayPerUse) | `pricing.unitPrice` | Dezimalbetrag mit Bezugsgröße übernehmen — nie auf ganze Euro runden, sonst wird aus 3,6 ct/m² „0 €" |
| `offers[].serviceScope.level` | `pricing.raasServiceIncluded` | `Full` → `true`, `None` → `false`, `Partial` → unklar; Vollkostenrechnungen dürfen enthaltenen Service nicht erneut aufschlagen |
| alle `offers[]` | `pricing.pricingNotes` | komprimierte Text-Zusammenfassung inkl. `serviceScope.level` und Mindestlaufzeit |
| `compliance.standards` | `certifications` | 1:1 — angewandte Normen sind **keine** Zertifizierungen; Label entsprechend wählen |
| `availability.serviceRegions` | Liefergebiet | maßgeblich für die Regionszuordnung; der Anbietersitz (`supplier.countryCode`) ist es nicht |
| `supplier.name` | `availability.distributors[0]` | Anbieter als Bezugsquelle |
| `provenance[].verificationStatus` | `verification.status` | `IndependentlyVerified` → „geprüft"; sonst „anbieterangabe" |

## Vor der Übernahme prüfen

- `lifecycleStatus: Announced` → kein Preis, kein Katalogeintrag.
- `lifecycleStatus: Discontinued`, abgelaufenes `validUntil` oder
  `availability.status: OutOfStock` → nicht preisbildend verwenden.
- Fremdwährung (`CHF`) niemals ungeprüft in Euro-Felder schreiben.
- Bestandsdaten vor der Freigabe erneut gegen das Schema validieren, nicht nur
  beim Ingest.

## Bewusste Nicht-Übernahmen

- `serviceScope`-Details fließen nicht feldweise ins Marktplatz-Modell (nur
  Stufe plus `pricingNotes`); die Vollkosten-Rechnung nutzt sie perspektivisch
  direkt.
- `humanoidCapabilities` — der Katalog kennt für Humanoide noch keine
  Vergleichsdimensionen; die Daten bleiben in der Queue erhalten.
- `media.images` — die Referenzimplementierung führt im Katalog keine Bilder.
- `location` — die Referenzimplementierung aggregiert auf DACH-Ebene.
