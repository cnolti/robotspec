# Mapping: openRobot v0.1 → RoboHub-Listing

Referenz-Mapping der RoboHub-Implementierung (`poc/src/lib/openrobot-map.ts`).
Nur Reinigungsklassen sind in den RoboHub-Katalog übernehmbar; andere Klassen
bleiben in der Kuratierungs-Queue.

## Klassen

| openRobot `robotClass` | RoboHub `category` |
|---|---|
| `ScrubberDryer` | `scheuersaugroboter` |
| `Vacuum` | `saugroboter` |
| `Sweeper` | `kehrroboter` |
| `Combination` | `kombiroboter` |
| übrige Klassen | nicht übernehmbar (kuratiert halten) |

## Kernfelder

| openRobot | RoboHub | Regel |
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

- `serviceScope`-Details fließen nicht strukturiert ins RoboHub-Modell (nur in
  `pricingNotes`) — RoboHubs Vollkosten-Rechnung nutzt sie perspektivisch
  direkt; Feld-für-Feld-Übernahme ist v0.2-Kandidat.
- `media.images` — RoboHub führt im POC keine Bilder.
- `location` — RoboHub aggregiert auf DACH-Ebene.
