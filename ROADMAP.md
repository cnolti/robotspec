# Roadmap

## v0.2 (Kandidaten)

- ~~Humanoide voll spezifizieren~~ (erledigt in v0.1: `HumanoidCapabilities`, 22 Felder inkl. autonomyLevel-Ehrlichkeitsstufe)
- Weitere Roboterklassen voll spezifizieren (Delivery, Disinfection —
  eigene Sub-Objekte analog `CleaningCapabilities`/`HumanoidCapabilities`)
- `availability` als eigenständiger Feed (Bestands-/Lieferzeit-Updates ohne
  Voll-Listing, Delta-Updates über `listingId` + `updatedAt`)
- Webhook-/Pull-Konventionen für Marktplätze (Standard-Endpunktnamen,
  Paginierung, `If-Modified-Since`)
- `serviceScope`-Preisaufschlüsselung: optionale `servicePriceCents` je
  Baustein, damit Full-Service-Raten zerlegbar werden
- Englische Feldbeschreibungen (Schema-`description` zweisprachig oder EN
  als Hauptsprache mit DE-Übersetzungsdatei)
- Gebraucht-/Vorführgeräte: strukturierte Zustandsangaben
  (`batteryHealthPct`, Wartungshistorie)

## Offen / zu klären

- Governance: Wer pflegt Enum-Erweiterungen (neue `robotClass`,
  `navigationTypes`)?
- Registry maschinenlesbarer Herstellernamen (Duplikate wie
  "Gausium" vs. "Shanghai Gaussian Automation Technology")
- Konformitätsnachweis: Signierte Listings / Verifizierbarkeit von
  `declarationOfConformityUrl`
