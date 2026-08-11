# Mapping: RobotSpec v0.1 → Marktplatz-Listing (Referenz)

Referenz-Mapping einer Marktplatz-Referenzimplementierung.
Nur Reinigungsklassen sind in den Katalog der Referenzimplementierung übernehmbar; andere Klassen
bleiben in der Kuratierungs-Queue.

## Klassen

| RobotSpec `robotClass` | Marktplatz-`category` |
|---|---|
| `ScrubberDryer` | `scheuersaugroboter` |
| `Vacuum` | `saugroboter` |
| `Sweeper` | `kehrroboter` |
| `Combination` | `kombiroboter` |
| übrige Klassen | nicht übernehmbar (kuratiert halten) |

## Kernfelder

| RobotSpec | Marktplatz | Regel |
|---|---|---|
| `make` + `model` + `variant` | `manufacturer`, `name`, `id` | `id` = `partner-<slug>-<submissionId[0:6]>` |
| `capabilities.areaPerformancePracticalM2h` | `capabilities.areaPerformanceM2h` + `perfBasis: "praktisch"` | praktischer Wert hat Vorrang |
| `capabilities.areaPerformanceTheoreticalM2h` | dito mit `perfBasis: "theoretisch"` | nur als Fallback |
| `runtimeMinutes` | `runtimeHours` | ÷ 60, 1 Dezimale |
| `offers[]` (Month, Rent/Leasing/RaaS) | `pricing.raasMonthlyEur` | günstigste Monatsrate, Cent → Euro |
| `offers[]` (Purchase) | `pricing.purchaseEur` | Cent → Euro |
| alle `offers[]` | `pricing.pricingNotes` | komprimierte Text-Zusammenfassung inkl. `serviceScope.level` und Mindestlaufzeit |
| `compliance.standards` | `certifications` | 1:1 |
| `supplier.name` | `availability.distributors[0]` | Anbieter als Bezugsquelle |
| — | `verification.status` | immer `"anbieterangabe"` (nicht unabhängig verifiziert) |

## Bewusste Nicht-Übernahmen

- `serviceScope`-Details fließen nicht strukturiert ins Marktplatz-Modell (nur in
  `pricingNotes`) — die Vollkosten-Rechnung der Referenzimplementierung nutzt sie perspektivisch
  direkt; Feld-für-Feld-Übernahme ist v0.2-Kandidat.
- `media.images` — die Referenzimplementierung führt im POC keine Bilder.
- `location` — die Referenzimplementierung aggregiert auf DACH-Ebene.
