# ECLASS-Change-Request-Entwurf: „Autonomous scrubber dryer (robot)"

> This content contains ECLASS. The ECLASS Terms of Use apply (www.eclass.eu).
> Referenzierte Version: ECLASS 16.0 (Recherchestand 11.08.2026); die
> Einreichung läuft gegen den Arbeitsstand **17.0 BETA**, in dem die Lücke
> am 07.09.2026 im CDP-Klassenbaum erneut bestätigt wurde. Stand des
> Entwurfs: 11.08.2026, Begründung präzisiert 05.09.2026, Marktzahlen und
> Klassenbezüge aktualisiert 07.09.2026.

Einreichfertiger Entwurf für einen ECLASS-Change-Request (neue Klasse).
Hintergrund und Belege: [crosswalk-eclass.md](crosswalk-eclass.md) — ECLASS
16.0 kennt keine Klasse für **autonome Scheuersaugmaschinen**
(am 11.08.2026 in der offiziellen Content-Suche verifiziert).

**Zahlenbasis:** Die Marktzahlen im `Reason` beziehen sich auf die
Scheuersaug- und Kombiroboter der Erhebung (Stand September 2026) und sind
damit nachprüfbar — frühere Fassungen nannten die Gesamtzahlen der
Juli-Erhebung, die eine breitere Grundgesamtheit hatten.

**Scope-Disziplin:** Der Antrag betrifft ausschließlich autonome
Scheuersaugmaschinen. Er behauptet **nicht**, dass ECLASS gewerbliche
Reinigungsroboter allgemein nicht abbilde — für Saugroboter existiert
21-19-03-11, dessen Definition „residential or commercial use" ausdrücklich
einschließt. Eine zu breite Begründung wäre in der Vorabprüfung angreifbar.

## Einreichweg

- **Portal:** ECLASS Content Development Platform (CDP),
  https://www.eclass-cdp.com — kostenlose Registrierung genügt,
  Change Requests stehen ausdrücklich auch **Nicht-Mitgliedern** offen
  (Quelle: eclass.eu/support → Content creation → CDP).
- **Pflichtfelder** laut CDP-Doku: Preferred Name, Definition, Reason,
  Parent Class; Keywords sind sprachspezifisch (EN einreichen, DE optional
  als separater Request).
- **Vorab-Pflichtprüfung** (vom Prozess verlangt): existiert die Klasse
  schon unter anderem Namen? — Erledigt am 11.08.2026: „scrubber"-Suche
  ohne autonome Klasse; nächstliegende Klassen sind 21-19-01-04
  (ausdrücklich *hand-operated*), 21-19-03-11 (Robot vacuum cleaner,
  saugend statt scheuernd) und 29-16-05-08 (Cleaning robot *household*).
- Nach Einreichung: CR-Nummer notieren und in der ROADMAP verlinken;
  CRs fließen frühestens in das nächste Release (16.0 erschien 28.11.2025,
  Releases jährlich — realistisches Ziel: 17.0).

## Formularinhalte (Copy-Paste, EN)

**Parent Class:** Gruppe **21-19-01** (die Gruppe, die 21-19-01-04
„Hand-operated scrubber dryer (rechargeable)", IRDI
`0173-1#01-ACD283#019`, enthält) — im CDP-Baum zu Segment 21 →
Hauptgruppe 21-19 → Gruppe 21-19-01 navigieren und die neue Klasse als
vierte Ebene (Commodity) anlegen.

**Preferred Name:**

```text
Autonomous scrubber dryer (robot)
```

**Definition:**

```text
Self-navigating floor cleaning machine for commercial use that scrubs and
dries hard floors autonomously, using onboard sensors (e.g. LiDAR, cameras)
for localization, path planning and obstacle avoidance, and operating
without continuous human guidance. Distinct from hand-operated scrubber
and ride-on scrubber dryers (human-guided) and from robot vacuum cleaners
(suction only, no scrubbing or drying).
```

**Reason:**

```text
ECLASS 16.0 BASIC has no class for autonomous scrubber dryers, i.e. floor
cleaning machines that scrub and dry hard floors without human guidance.
This request is limited to that gap; it does not claim that commercial
cleaning robots are generally unclassified. The closest classes do not
cover autonomous scrubber dryers: 21-19-01-01 is ride-on and
21-19-01-04/-05 are hand-operated; 21-19-03-11 (robot vacuum cleaner) covers suction robots
and, per its own definition, spans residential or commercial use, but not
scrubbing and drying; 29-16-05-08 covers household cleaning robots;
27-38-01-10 (mobile robot) sits under industrial robots and inherits
arm-robot properties unsuitable for cleaning machines. Autonomous scrubber
dryers are an established commercial product category: a market survey of
the DACH region documented 27 autonomous scrubbing models from 16
manufacturers (e.g. Gausium, Pudu Robotics, LionsBot, Tennant, Kärcher,
Nilfisk, Cleanfix, Adlatus, Hako, Avidbots) with 65 published price points
across purchase, rental, leasing and robot-as-a-service offers (as of
September 2026). A dedicated product safety standard exists
(EN IEC 63327, machines for commercial floor treatment with or without
autonomous functions), underlining that this is a distinct, standardized
product category. Procurement platforms and public tenders currently have
no adequate classification target for these machines.
```

**Keywords (EN):**

```text
cleaning robot; robotic scrubber dryer; autonomous floor scrubber;
autonomous cleaning machine; AMR floor cleaning; robot scrubber
```

## Optionaler Folge-Request (Merkmalszuordnung)

Nach Anlage der Klasse: die beiden bestehenden Flächenleistungs-Merkmale
der neuen Klasse zuordnen lassen —
`0173-1#02-AAJ714#007` „area efficiency (per hour, theoretical)" und
`0173-1#02-AAJ747#007` „area efficiency (per hour)" (beide am 11.08.2026
bestätigt, siehe Crosswalk). Sinnvolle weitere Merkmale: Arbeitsbreite,
Tankvolumina (Frisch-/Schmutzwasser), Batteriekapazität/Ladezeit,
Navigationsart. Kein neues Merkmal beantragen, wo ein bestehendes passt.

## Warum das für RobotSpec kein Widerspruch ist

RobotSpec bleibt auch mit einer künftigen ECLASS-Klasse relevant: ECLASS
klassifiziert Produkte, RobotSpec transportiert Angebots- und
Servicetransparenz (Preise, Laufzeiten, `serviceScope`, Compliance,
Praxis-Flächenleistung). Der Change-Request stärkt die Interoperabilität
(`classifications`-Array) — er ersetzt den Standard nicht.

## Was am 07.09.2026 tatsächlich eingegeben wurde

Der Antrag wurde im CDP unter 21-19-01 angelegt (Formular ausgefüllt, noch
nicht gespeichert). Abweichungen gegenüber den Blöcken oben, alle durch das
Formular oder den Klassenbaum erzwungen:

- **Code** wird vergeben, nicht gewählt: `21-19-01-43`.
- **Bevorzugte Benennung DE** folgt der Konvention der Geschwisterklassen:
  `Autonome Scheuersaugmaschine (Betriebsausstattung)`. EN unverändert.
- **Begründung** ist auf **500 Zeichen** begrenzt — der `Reason`-Block oben
  passt nicht hinein. Eingegeben wurde eine 478-Zeichen-Fassung mit
  denselben Aussagen.
- **Klassenbezüge präzisiert** nach Sicht in den Baum: `21-19-01-01`
  (Aufsitz), `21-19-01-04/-05` (handgeführt, Akku bzw. elektrisch).
- **Kurzbezeichnung** (max. 17 Zeichen) blieb leer — optional.
- **Ursprung der Definition**: eigene Definition, Abgrenzung gegen die
  genannten Klassen, Bezug auf EN IEC 63327.

**Validierungsregel des CDP, die beim ersten Speicherversuch zuschlug:** Im
Feld „Ursprung der Definition" sind die Zeichen `* " ; ! ? # & { }`
verboten. Semikolons mussten durch Kommas ersetzt werden. Für die übrigen
Freitextfelder ist dieselbe Regel zu erwarten — Doppelpunkte, Klammern,
Schrägstriche und Bindestriche wurden dagegen akzeptiert.

**Realistisches Zielrelease: 18.0, nicht 17.0.** Die Release-Planung im CDP
nennt für 17.0 drei Fristen: initiale Change Requests bis **30.04.2026**,
Alpha bis 17.07.2026, Beta bis 22.09.2026. Entscheidend ist, was in welcher
Phase überhaupt zulässig ist: Laut
[eclass.eu/support/content-creation/release-process](https://eclass.eu/support/content-creation/release-process)
sind in der Alpha-Phase nur „editing CRs" und in der Beta-Phase nur
„correcting CRs" erlaubt. Eine **neue Klasse ist ein initialer CR** — die
Frist dafür ist am 30.04.2026 abgelaufen. Der Antrag läuft damit auf
Release 18.0 zu. Das ist kein Grund zu warten: Ein früh eingestellter CR
durchläuft die Fachgruppen-Diskussion, statt am Ende durchgewinkt oder
abgelehnt zu werden.
