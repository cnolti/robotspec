/**
 * @robotspec/to-schemaorg — RobotSpec v0.2/v0.3 → schema.org JSON-LD
 *
 * Reines ESM, keine Laufzeit-Abhängigkeiten, Node 20+.
 * Umsetzungsgrundlage: docs/bridge-schema-org.md (informative Bridge).
 * Normativ ist daraus nur das propertyID-Präfix `rs:` für RobotSpec-Feldpfade.
 *
 *   import { toSchemaOrg } from "./converter/index.mjs";
 *   const jsonld = toSchemaOrg(listing, { profile: "merchant-listing", vatMode: "gross" });
 */

export const PROFILES = ["merchant-listing", "product-snippet"];
export const VAT_MODES = ["gross", "net"];
export const SUPPORTED_SCHEMA_VERSIONS = ["0.2", "0.3"];

const SO = "https://schema.org/";
const GR = "http://purl.org/goodrelations/v1#";
const DEFAULT_SCHEMA_VERSION = "0.3";

/** Das rs:-Präfix zeigt auf die Schemaversion des Eingabedokuments. */
function contextFor(doc) {
  const version = doc.schemaVersion ?? DEFAULT_SCHEMA_VERSION;
  return ["https://schema.org", { rs: `https://robotspec.org/schema/v${version}/#`, gr: GR }];
}

/* ------------------------------------------------------------------ *
 * Wertetabellen
 * ------------------------------------------------------------------ */

const OFFER_TYPE_LABEL = {
  Purchase: "Kauf",
  Rent: "Miete",
  Leasing: "Leasing",
  RaaS: "Robot-as-a-Service",
  DayRate: "Tagesmiete",
  PayPerUse: "Pay-per-Use",
};

// gr:Sell für Kauf, gr:LeaseOut für Überlassung auf Zeit,
// gr:ProvideService für Dienstleistungsmodelle (Bridge-Mapping-Tabelle).
const BUSINESS_FUNCTION = {
  Purchase: "Sell",
  Rent: "LeaseOut",
  Leasing: "LeaseOut",
  DayRate: "LeaseOut",
  RaaS: "ProvideService",
  PayPerUse: "ProvideService",
};

// UN/CEFACT-Codes: ANN Jahr, MON Monat, WEE Woche, DAY Tag, MTK Quadratmeter,
// C62 Stück (dimensionslose Einheit).
const PERIOD = {
  Once: { rank: 0, suffix: "", label: null, unitCode: null },
  Year: { rank: 1, suffix: "/Jahr", label: "Jahr", unitCode: "ANN" },
  Month: { rank: 2, suffix: "/Monat", label: "Monat", unitCode: "MON" },
  Week: { rank: 3, suffix: "/Woche", label: "Woche", unitCode: "WEE" },
  Day: { rank: 4, suffix: "/Tag", label: "Tag", unitCode: "DAY" },
  PerSquareMeter: { rank: 5, suffix: "/m²", label: "m²", unitCode: "MTK" },
  PerUnit: { rank: 6, suffix: "/Einheit", label: "Einheit", unitCode: "C62" },
};

// Bezugsgrößen des dezimalen Einheitspreises (v0.3, offers[].unitPrice).
// UN/CEFACT: MTK m², HUR Stunde, DAY Tag, KMT Kilometer, C62 Stück.
// Für „Zyklus" gibt es keinen passenden Code — dort nur unitText.
const UNIT = {
  M2: { rank: 0, unitCode: "MTK", unitText: null, suffix: "/m²", label: "m²" },
  Hour: { rank: 1, unitCode: "HUR", unitText: null, suffix: "/h", label: "Stunde" },
  Day: { rank: 2, unitCode: "DAY", unitText: null, suffix: "/Tag", label: "Tag" },
  Km: { rank: 3, unitCode: "KMT", unitText: null, suffix: "/km", label: "km" },
  Cycle: { rank: 4, unitCode: null, unitText: "Zyklus", suffix: "/Zyklus", label: "Zyklus" },
  Item: { rank: 5, unitCode: "C62", unitText: null, suffix: "/Stück", label: "Stück" },
};

// Angebotsklassen für die Aggregation: Kauf, Überlassung auf Zeit und
// nutzungsabhängige Abrechnung dürfen nie in einem AggregateOffer landen.
const OFFER_CLASS = {
  Purchase: "purchase",
  Rent: "recurring",
  Leasing: "recurring",
  RaaS: "recurring",
  DayRate: "recurring",
  PayPerUse: "usage",
};

const CLASS_RANK = { purchase: 0, recurring: 1, usage: 2 };

const ITEM_CONDITION = {
  New: SO + "NewCondition",
  Demo: SO + "UsedCondition",
  Used: SO + "UsedCondition",
  Refurbished: SO + "RefurbishedCondition",
};

const CONDITION_LABEL = {
  New: "Neugerät",
  Demo: "Vorführgerät",
  Used: "Gebrauchtgerät",
  Refurbished: "generalüberholt",
};

// RobotSpec-Status → schema.org ItemAvailability.
// LeadTime bleibt InStock (bestellbar, Lieferzeit separat über deliveryLeadTime) —
// so hält es auch das Referenzbeispiel der Bridge.
// Announced wird NIE zu PreOrder (Anti-Pattern); Announced-Listings tragen gar keine Offers.
const AVAILABILITY = {
  InStock: SO + "InStock",
  LeadTime: SO + "InStock",
  MadeToOrder: SO + "MadeToOrder",
  PreOrder: SO + "PreOrder",
  OnRequest: SO + "LimitedAvailability",
  OutOfStock: SO + "OutOfStock",
};

const SERVICE_LEVEL_LABEL = {
  Full: "Full-Service",
  Partial: "Teil-Service",
  None: "ohne Servicevertrag",
};

const SERVICE_ITEM_LABEL = {
  maintenance: "Wartung",
  repairs: "Reparaturen",
  wearParts: "Verschleißteile",
  consumables: "Verbrauchsmaterial",
  replacementDevice: "Ersatzgerät",
  onSiteSupport: "Vor-Ort-Service",
  remoteMonitoring: "Remote-Monitoring",
  softwareUpdates: "Software-Updates",
  installation: "Inbetriebnahme/Einweisung",
  statutoryInspection: "UVV-/DGUV-V3-Prüfung",
  insurance: "Versicherung",
};

const CLASSIFICATION_LABEL = {
  eclass: "ECLASS",
  etim: "ETIM",
  unspsc: "UNSPSC",
  cpv: "CPV",
  gpc: "GPC",
  customsTariff: "Zolltarifnummer",
};

const IMAGE_TYPE_LABEL = {
  Product: "Produktbild",
  InUse: "Anwendungsbild",
  Detail: "Detailaufnahme",
  Datasheet: "Datenblatt-Abbildung",
};

/* Feld-Metadaten: RobotSpec-Feldpfad → [deutsches Label, unitText?].
   Die Reihenfolge der Schlüssel bestimmt die Reihenfolge in additionalProperty. */

const META_TOP = {
  robotClass: ["Roboterklasse (RobotSpec)"],
  condition: ["Zustand"],
  modelYear: ["Modelljahr"],
  operatingHours: ["Betriebsstunden", "h"],
  serialNumber: ["Seriennummer"],
  variantId: ["Varianten-ID"],
  revision: ["Revision des Listings"],
  lifecycleStatus: ["Marktstatus"],
  highlights: ["Highlights"],
};

const META_CAPABILITIES = {
  cleaningWidthCm: ["Arbeitsbreite", "cm"],
  areaPerformanceTheoreticalM2h: ["Flächenleistung (theoretisch)", "m²/h"],
  areaPerformancePracticalM2h: ["Flächenleistung (praktisch)", "m²/h"],
  runtimeMinutes: ["Laufzeit", "min"],
  chargingTimeMinutes: ["Ladezeit", "min"],
  freshWaterTankL: ["Frischwassertank", "l"],
  wasteWaterTankL: ["Schmutzwassertank", "l"],
  dustbinL: ["Staubbehälter", "l"],
  navigationTypes: ["Navigationstechnik"],
  dockingStation: ["Dockingstation"],
  autonomousWaterExchange: ["Autonomer Wasserwechsel"],
  suitableEnvironments: ["Geeignete Einsatzumgebungen"],
  minAreaM2: ["Mindestfläche", "m²"],
  maxAreaM2: ["Maximalfläche", "m²"],
  climbAbilityPct: ["Steigfähigkeit", "%"],
  noiseDb: ["Geräuschpegel", "dB(A)"],
  maxSpeedKmh: ["Höchstgeschwindigkeit", "km/h"],
  batteryCapacityWh: ["Akkukapazität", "Wh"],
  ipRating: ["Schutzart (IP)"],
  features: ["Ausstattungsmerkmale"],
};

const META_HUMANOID = {
  heightCm: ["Körperhöhe", "cm"],
  payloadKg: ["Nutzlast", "kg"],
  liftingCapacityKg: ["Hebekraft", "kg"],
  degreesOfFreedom: ["Freiheitsgrade"],
  handDegreesOfFreedom: ["Freiheitsgrade je Hand"],
  handType: ["Handtyp"],
  walkingSpeedKmh: ["Gehgeschwindigkeit", "km/h"],
  runningSpeedKmh: ["Laufgeschwindigkeit", "km/h"],
  runtimeMinutes: ["Laufzeit", "min"],
  batteryCapacityWh: ["Akkukapazität", "Wh"],
  batterySwappable: ["Wechselakku"],
  navigationTypes: ["Navigationstechnik"],
  autonomyLevel: ["Autonomiegrad"],
  teleoperationSupported: ["Teleoperation möglich"],
  computePlatform: ["Rechenplattform"],
  sdkAvailable: ["SDK verfügbar"],
  simulationSupport: ["Simulationsunterstützung"],
  ipRating: ["Schutzart (IP)"],
  noiseDb: ["Geräuschpegel", "dB(A)"],
  features: ["Ausstattungsmerkmale"],
};

const META_DIMENSIONS = {
  lengthMm: ["Länge", "mm"],
  widthMm: ["Breite", "mm"],
  heightMm: ["Höhe", "mm"],
};

const META_CONNECTIVITY = {
  vda5050: ["VDA-5050-Anbindung"],
  fleetApi: ["Flotten-/Reporting-API"],
  apiDocsUrl: ["API-Dokumentation"],
  offlineCapable: ["Offline-Betrieb möglich"],
};

const META_COMPLIANCE = {
  ceMarking: ["CE-Kennzeichnung"],
  conformityBasis: ["Rechtsgrundlage des Inverkehrbringens"],
  standards: ["Angewandte Normen"],
  declarationOfConformityUrl: ["EU-Konformitätserklärung"],
  operatingManualDeUrl: ["Betriebsanleitung (deutsch)"],
};

const META_DATA_PRIVACY = {
  camerasOnboard: ["Kameras an Bord"],
  recordsVideo: ["Videoaufzeichnung"],
  onDeviceProcessingOnly: ["Verarbeitung nur auf dem Gerät"],
  cloudUpload: ["Cloud-Upload"],
  cloudRegion: ["Cloud-Region"],
  dataSheetUrl: ["Datenschutz-Datenblatt"],
};

const META_MEDIA = {
  brochureUrl: ["Produktbroschüre"],
  videoUrl: ["Produktvideo"],
};

const META_OFFER = {
  offerId: ["Angebots-ID"],
  offerType: ["Angebotsart"],
  vatRate: ["USt.-Satz", "%"],
  isStartingPrice: ["Ab-Preis"],
  billingPeriod: ["Abrechnungsperiode"],
  minTermMonths: ["Mindestlaufzeit", "Monate"],
  noticePeriodMonths: ["Kündigungsfrist", "Monate"],
  autoRenewal: ["Automatische Verlängerung"],
  setupFeeCents: ["Einrichtungsgebühr netto in Cent"],
  deliveryFeeCents: ["Liefergebühr netto in Cent"],
  buyoutOptionCents: ["Kaufoption am Laufzeitende netto in Cent"],
};

const META_SERVICE_SCOPE = {
  level: ["Serviceumfang (Stufe)"],
  maintenance: ["Wartung enthalten"],
  repairs: ["Reparaturen enthalten"],
  wearParts: ["Verschleißteile enthalten"],
  consumables: ["Verbrauchsmaterial enthalten"],
  replacementDevice: ["Ersatzgerät enthalten"],
  replacementSlaHours: ["Ersatzgerät-SLA", "h"],
  onSiteSupport: ["Vor-Ort-Service enthalten"],
  remoteMonitoring: ["Remote-Monitoring enthalten"],
  softwareUpdates: ["Software-Updates enthalten"],
  installation: ["Inbetriebnahme/Einweisung enthalten"],
  statutoryInspection: ["UVV-/DGUV-V3-Prüfung enthalten"],
  insurance: ["Versicherung enthalten"],
  notes: ["Hinweise zum Serviceumfang"],
};

/* ------------------------------------------------------------------ *
 * Kleine Helfer
 * ------------------------------------------------------------------ */

const ISO_REGION = /^[A-Z]{2}(-[A-Z0-9]{1,3})?$/;

function isPlainObject(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function push(list, entry) {
  if (entry) list.push(entry);
  return list;
}

/** PropertyValue mit rs:-Feldpfad als propertyID. */
function pv(fieldPath, name, value, unitText) {
  if (value === undefined || value === null) return null;
  let out = value;
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    out = value.length === 1 ? value[0] : value.slice();
  }
  const entry = { "@type": "PropertyValue", propertyID: `rs:${fieldPath}`, name, value: out };
  if (unitText) entry.unitText = unitText;
  return entry;
}

function qv(value, unitCode, unitText) {
  const out = { "@type": "QuantitativeValue", value };
  if (unitCode) out.unitCode = unitCode;
  if (unitText) out.unitText = unitText;
  return out;
}

function emitGroup(target, source, meta, prefix) {
  if (!isPlainObject(source)) return target;
  for (const key of Object.keys(meta)) {
    const [name, unitText] = meta[key];
    push(target, pv(`${prefix}${key}`, name, source[key], unitText));
  }
  return target;
}

/** Netto-Cent → Brutto-Cent, kaufmännisch auf ganze Cent gerundet. */
function grossCents(netCents, vatRate) {
  return Math.round((netCents * (100 + vatRate)) / 100);
}

/** Cent → Dezimalstring mit zwei Nachkommastellen ("3806810" → "38068.10"). */
function centsToDecimalString(cents) {
  const s = String(Math.round(cents)).padStart(3, "0");
  return `${s.slice(0, -2)}.${s.slice(-2)}`;
}

/** Cent → deutsche Betragsschreibweise ("3199000" → "31.990,00"). */
function centsToDe(cents) {
  const s = String(Math.round(cents)).padStart(3, "0");
  const whole = s.slice(0, -2);
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${grouped},${s.slice(-2)}`;
}

/* Dezimale Einheitspreise (v0.3) werden in Mikroeinheiten gerechnet
   (10^-6 der Währungseinheit, also 10^-4 Cent) — damit bleiben Subcent-Preise
   wie 0,036 EUR/m² exakt und die MwSt.-Rechnung ganzzahlig. */

/** Dezimalstring → Mikroeinheiten ("0.036" → 36000). */
function amountToMicros(amount) {
  const [whole, frac = ""] = String(amount).split(".");
  return Number(whole) * 1000000 + Number(`${frac}000000`.slice(0, 6));
}

/** Mikroeinheiten → Dezimalstring mit 2–6 Nachkommastellen (36000 → "0.036"). */
function microsToDecimalString(micros) {
  const s = String(Math.round(micros)).padStart(7, "0");
  let frac = s.slice(-6).replace(/0+$/, "");
  while (frac.length < 2) frac += "0";
  return `${s.slice(0, -6)}.${frac}`;
}

/** Mikroeinheiten → deutsche Betragsschreibweise (36000 → "0,036"). */
function microsToDe(micros) {
  const [whole, frac] = microsToDecimalString(micros).split(".");
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${frac}`;
}

/** Netto-Mikroeinheiten → Brutto, auf ganze Mikroeinheiten gerundet. */
function grossMicros(netMicros, vatRate) {
  return Math.round((netMicros * (100 + vatRate)) / 100);
}

/** true, wenn das Angebot nutzungsabhängig über unitPrice bepreist ist. */
function isUnitPriced(offer) {
  return isPlainObject(offer.unitPrice);
}

/** Netto-Betrag des Angebots in Mikroeinheiten (vergleichbar über beide Preisformen). */
function netMicrosOf(offer) {
  return isUnitPriced(offer) ? amountToMicros(offer.unitPrice.amount) : offer.priceCents * 10000;
}

/** Auszugebender Betrag in Mikroeinheiten; Cent-Preise runden auf ganze Cent. */
function targetMicrosOf(offer, vatMode) {
  if (isUnitPriced(offer)) {
    const net = amountToMicros(offer.unitPrice.amount);
    return vatMode === "gross" ? grossMicros(net, offer.vatRate) : net;
  }
  const cents = vatMode === "gross" ? grossCents(offer.priceCents, offer.vatRate) : offer.priceCents;
  return cents * 10000;
}

/** Bezugsgröße eines Einheitspreises als deutscher Text ("m²", "100 m²"). */
function unitQuantityLabel(unitPrice) {
  const unit = UNIT[unitPrice.referenceQuantity.unit];
  const value = unitPrice.referenceQuantity.value;
  const label = unit ? unit.label : unitPrice.referenceQuantity.unit;
  return value === 1 ? label : `${numberToDe(value)} ${label}`;
}

/** Preis-Suffix eines Einheitspreises ("/m²" bzw. " je 100 m²"). */
function unitSuffix(unitPrice) {
  const unit = UNIT[unitPrice.referenceQuantity.unit];
  if (unit && unitPrice.referenceQuantity.value === 1) return unit.suffix;
  return ` je ${unitQuantityLabel(unitPrice)}`;
}

/** Zahl → deutsche Schreibweise (19 → "19", 8.1 → "8,1"). */
function numberToDe(n) {
  return String(n).replace(".", ",");
}

/** ISO-Datum/Zeitstempel → "TT.MM.JJJJ"; ohne Date-Objekt, damit zeitzonenfrei. */
function isoToDe(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  return m ? `${m[3]}.${m[2]}.${m[1]}` : String(iso);
}

function moneyDe(cents, currency) {
  return `${centsToDe(cents)} ${currency}`;
}

function periodOf(offer) {
  return PERIOD[offer.billingPeriod] ? offer.billingPeriod : "Once";
}

/* ------------------------------------------------------------------ *
 * Deutsche Texte (Name/Beschreibung) — page-visible content!
 * ------------------------------------------------------------------ */

function productName(doc) {
  const base = `${doc.make} ${doc.model}`.trim();
  return doc.variant ? `${base} (${doc.variant})` : base;
}

function offerName(offer, doc) {
  const parts = [];
  if (CONDITION_LABEL[doc.condition]) parts.push(CONDITION_LABEL[doc.condition]);
  const level = offer.serviceScope?.level;
  if (SERVICE_LEVEL_LABEL[level]) parts.push(SERVICE_LEVEL_LABEL[level]);
  if (offer.minTermMonths) parts.push(`Mindestlaufzeit ${offer.minTermMonths} Monate`);
  const type = OFFER_TYPE_LABEL[offer.offerType] ?? offer.offerType;
  return parts.length ? `${type} (${parts.join(", ")})` : type;
}

function priceSentence(offer) {
  const unitPriced = isUnitPriced(offer);
  const suffix = unitPriced ? unitSuffix(offer.unitPrice) : PERIOD[periodOf(offer)].suffix;
  const amount = unitPriced
    ? `${microsToDe(netMicrosOf(offer))} ${offer.currency}`
    : moneyDe(offer.priceCents, offer.currency);
  const vat = `zzgl. ${numberToDe(offer.vatRate)} % USt.`;
  return offer.isStartingPrice
    ? `Ab ${amount} netto${suffix} ${vat}`
    : `Netto ${amount}${suffix} ${vat}`;
}

function serviceSentences(scope) {
  const out = [];
  if (!scope) return out;
  const level = scope.level;
  if (level === "None") {
    out.push("Kein Servicevertrag enthalten (rs:offer.serviceScope.level = None).");
  } else if (level === "Full") {
    out.push("Full-Service enthalten (rs:offer.serviceScope.level = Full).");
  } else if (level === "Partial") {
    out.push("Teil-Service enthalten (rs:offer.serviceScope.level = Partial).");
  }
  const included = [];
  const excluded = [];
  for (const key of Object.keys(SERVICE_ITEM_LABEL)) {
    const value = scope[key];
    if (value === true) {
      included.push(
        key === "replacementDevice" && scope.replacementSlaHours
          ? `Ersatzgerät binnen ${scope.replacementSlaHours} h`
          : SERVICE_ITEM_LABEL[key],
      );
    } else if (value === false) {
      excluded.push(SERVICE_ITEM_LABEL[key]);
    }
  }
  if (included.length) out.push(`Enthalten: ${included.join(", ")}.`);
  if (excluded.length) out.push(`Nicht enthalten: ${excluded.join(", ")}.`);
  return out;
}

function offerDescription(offer) {
  const s = [priceSentence(offer)];
  if (offer.minTermMonths) s.push(`Mindestlaufzeit ${offer.minTermMonths} Monate.`);
  if (offer.noticePeriodMonths !== undefined) {
    s.push(`Kündigungsfrist ${offer.noticePeriodMonths} Monate.`);
  }
  if (offer.autoRenewal === true) s.push("Vertrag verlängert sich automatisch.");
  if (offer.autoRenewal === false) s.push("Keine automatische Verlängerung.");
  s.push(...serviceSentences(offer.serviceScope));
  if (offer.setupFeeCents === 0) s.push("Einrichtung/Installation kostenfrei.");
  else if (offer.setupFeeCents > 0) {
    s.push(`Einmalige Einrichtung/Installation: ${moneyDe(offer.setupFeeCents, offer.currency)} netto.`);
  }
  if (offer.deliveryFeeCents === 0) s.push("Lieferung kostenfrei.");
  else if (offer.deliveryFeeCents > 0) {
    s.push(`Lieferung: ${moneyDe(offer.deliveryFeeCents, offer.currency)} netto.`);
  }
  if (offer.buyoutOptionCents !== undefined) {
    s.push(`Kaufoption am Laufzeitende: ${moneyDe(offer.buyoutOptionCents, offer.currency)} netto.`);
  }
  const av = offer.availability;
  if (av) {
    if (av.leadTimeDays !== undefined) s.push(`Lieferzeit ${av.leadTimeDays} Tage.`);
    if (av.availableFrom) s.push(`Verfügbar ab ${isoToDe(av.availableFrom)}.`);
    if (av.quantityAvailable !== undefined) s.push(`Verfügbare Stückzahl: ${av.quantityAvailable}.`);
    if (av.serviceRegions?.length) s.push(`Servicegebiete: ${av.serviceRegions.join(", ")}.`);
    if (av.asOf) s.push(`Stand der Preis- und Verfügbarkeitsangabe: ${isoToDe(av.asOf)}.`);
  }
  if (offer.validUntil) s.push(`Angebot gültig bis ${isoToDe(offer.validUntil)}.`);
  if (offer.serviceScope?.notes) s.push(`Hinweis zum Service: ${offer.serviceScope.notes}`);
  if (offer.notes) s.push(offer.notes);
  return s.join(" ");
}

/* ------------------------------------------------------------------ *
 * Bausteine
 * ------------------------------------------------------------------ */

function organizationId(doc) {
  const site = doc.supplier?.website;
  // Ohne Website gibt es keine stabile URI — dann ein Blank-Node-Bezeichner
  // statt einer erfundenen URL.
  return site ? `${String(site).replace(/\/+$/, "")}/#organization` : "_:supplier";
}

function buildOrganization(doc, orgId) {
  const s = doc.supplier ?? {};
  const org = { "@type": "Organization", "@id": orgId, name: s.name };
  // supplierId ist die dauerhafte Anbieterkennung — schema.org kennt dafür
  // Thing.identifier; ein zusätzlicher rs:-Eintrag wäre ein Doppelmapping.
  if (s.supplierId) org.identifier = s.supplierId;
  if (s.legalName) org.legalName = s.legalName;
  if (s.website) org.url = s.website;
  if (s.email) org.email = s.email;
  if (s.phone) org.telephone = s.phone;
  if (s.vatId) org.vatID = s.vatId;

  const address = { "@type": "PostalAddress" };
  if (s.countryCode) address.addressCountry = s.countryCode;
  // location beschreibt den Standort des Geräts. Nur wenn er im selben Land
  // liegt wie der Anbieter, wird er — wie im Bridge-Referenzbeispiel — als
  // Anbieteradresse verwendet; sonst bleibt er bei rs:location.*.
  if (useLocationAsAddress(doc)) {
    if (doc.location.postalCode) address.postalCode = doc.location.postalCode;
    if (doc.location.city) address.addressLocality = doc.location.city;
  }
  if (Object.keys(address).length > 1) org.address = address;
  return org;
}

function useLocationAsAddress(doc) {
  const loc = doc.location;
  if (!isPlainObject(loc)) return false;
  const supplierCountry = doc.supplier?.countryCode;
  const locCountry = loc.countryCode ?? supplierCountry;
  return Boolean(supplierCountry) && locCountry === supplierCountry;
}

function buildImages(images) {
  if (!Array.isArray(images) || images.length === 0) return undefined;
  return images.map((img) => {
    const hasMeta =
      img.widthPx !== undefined ||
      img.heightPx !== undefined ||
      img.altDe !== undefined ||
      img.type !== undefined;
    if (!hasMeta) return img.url;
    const out = { "@type": "ImageObject", url: img.url };
    if (img.type && IMAGE_TYPE_LABEL[img.type]) out.name = IMAGE_TYPE_LABEL[img.type];
    if (img.altDe) out.caption = img.altDe;
    // E37 = Pixel (UN/CEFACT Rec. 20)
    if (img.widthPx !== undefined) out.width = qv(img.widthPx, "E37", "px");
    if (img.heightPx !== undefined) out.height = qv(img.heightPx, "E37", "px");
    return out;
  });
}

function buildClassificationProps(list) {
  const out = [];
  if (!Array.isArray(list)) return out;
  for (const c of list) {
    const label = CLASSIFICATION_LABEL[c.system] ?? c.system;
    const name = c.version ? `${label} ${c.version}` : label;
    push(out, pv(`classifications.${c.system}`, name, c.code));
    if (c.irdi) push(out, pv(`classifications.${c.system}.irdi`, `${label}-IRDI`, c.irdi));
  }
  return out;
}

function buildProductProps(doc) {
  const props = [];
  emitGroup(props, doc, META_TOP, "");
  props.push(...buildClassificationProps(doc.classifications));

  // weightKg wird zu Product.weight — nicht doppelt als rs:-Property führen.
  const caps = doc.capabilities;
  if (isPlainObject(caps)) {
    emitGroup(props, caps, META_CAPABILITIES, "capabilities.");
    emitGroup(props, caps.dimensions, META_DIMENSIONS, "capabilities.dimensions.");
  }
  const hum = doc.humanoidCapabilities;
  if (isPlainObject(hum)) {
    emitGroup(props, hum, META_HUMANOID, "humanoidCapabilities.");
    emitGroup(props, hum.dimensions, META_DIMENSIONS, "humanoidCapabilities.dimensions.");
  }
  emitGroup(props, doc.connectivity, META_CONNECTIVITY, "connectivity.");
  emitGroup(props, doc.compliance, META_COMPLIANCE, "compliance.");
  emitGroup(props, doc.compliance?.dataPrivacy, META_DATA_PRIVACY, "compliance.dataPrivacy.");
  emitGroup(props, doc.media, META_MEDIA, "media.");

  if (!useLocationAsAddress(doc) && isPlainObject(doc.location)) {
    push(props, pv("location.countryCode", "Standort (Land)", doc.location.countryCode));
    push(props, pv("location.postalCode", "Standort (PLZ)", doc.location.postalCode));
    push(props, pv("location.city", "Standort (Ort)", doc.location.city));
  }
  push(props, pv("supplier.supplierType", "Anbietertyp", doc.supplier?.supplierType));
  push(props, pv("updatedAt", "Stand der Angaben", doc.updatedAt));
  return props;
}

function priceCentsLabel(offer) {
  const period = periodOf(offer);
  if (period === "Once") return "Nettopreis in Cent";
  // Nur noch aus v0.2-Dokumenten erreichbar: dort war PayPerUse ein Cent-Preis.
  if (period === "PerSquareMeter") return "Nettopreis je m² in Cent";
  return "Nettorate in Cent";
}

/** Label des dezimalen Einheitspreises ("Nettopreis je m²"). */
function unitPriceLabel(offer) {
  return `Nettopreis je ${unitQuantityLabel(offer.unitPrice)}`;
}

/** Netto-Betrag als rs:-Property — je nach Preisform priceCents oder unitPrice.amount. */
function netAmountProp(offer) {
  return isUnitPriced(offer)
    ? pv("offer.unitPrice.amount", unitPriceLabel(offer), offer.unitPrice.amount)
    : pv("offer.priceCents", priceCentsLabel(offer), offer.priceCents);
}

function buildOfferProps(offer) {
  const props = [];
  push(props, pv("offer.offerId", META_OFFER.offerId[0], offer.offerId));
  push(props, pv("offer.offerType", META_OFFER.offerType[0], offer.offerType));
  push(props, netAmountProp(offer));
  for (const key of Object.keys(META_OFFER)) {
    if (key === "offerType" || key === "offerId") continue;
    const [name, unitText] = META_OFFER[key];
    push(props, pv(`offer.${key}`, name, offer[key], unitText));
  }
  emitGroup(props, offer.serviceScope, META_SERVICE_SCOPE, "offer.serviceScope.");
  const av = offer.availability;
  if (isPlainObject(av)) {
    // Das schema.org-Enum ist verlustbehaftet (LeadTime → InStock,
    // OnRequest → LimitedAvailability) — Originalstatus bleibt erhalten.
    push(props, pv("offer.availability.status", "Verfügbarkeitsstatus (RobotSpec)", av.status));
    push(props, pv("offer.availability.asOf", "Stand der Verfügbarkeits- und Preisaussage", av.asOf));
    const regions = av.serviceRegions ?? [];
    const nonIso = regions.filter((r) => !ISO_REGION.test(r));
    if (nonIso.length) {
      push(props, pv("offer.availability.serviceRegions", "Servicegebiete", regions));
    }
  }
  push(props, pv("offer.notes", "Hinweise", offer.notes));
  return props;
}

function buildFee(offer, cents, name, componentType, vatMode) {
  if (!cents) return null;
  const price = priceString(cents, offer.vatRate, vatMode);
  const spec = {
    "@type": "UnitPriceSpecification",
    price,
    priceCurrency: offer.currency,
    valueAddedTaxIncluded: vatMode === "gross",
  };
  if (componentType) spec.priceComponentType = SO + componentType;
  return {
    "@type": "Offer",
    name,
    priceCurrency: offer.currency,
    price,
    priceSpecification: spec,
  };
}

function buildWarranty(offer) {
  const s = offer.serviceScope;
  if (!isPlainObject(s) || s.level !== "Full") return undefined;
  const parts = [];
  if (s.maintenance) parts.push("Wartung");
  if (s.repairs) parts.push("Reparaturen");
  if (s.wearParts) parts.push("Verschleißteile");
  if (s.replacementDevice) {
    parts.push(s.replacementSlaHours ? `Ersatzgerät binnen ${s.replacementSlaHours} h` : "Ersatzgerät");
  }
  const out = {
    "@type": "WarrantyPromise",
    name: parts.length ? `Full-Service (${parts.join(", ")})` : "Full-Service",
  };
  if (offer.minTermMonths) out.durationOfWarranty = qv(offer.minTermMonths, "MON");
  return out;
}

function priceString(netCents, vatRate, vatMode) {
  return centsToDecimalString(vatMode === "gross" ? grossCents(netCents, vatRate) : netCents);
}

function buildPriceSpecification(offer, price, vatMode) {
  const spec = {
    "@type": "UnitPriceSpecification",
    price,
    priceCurrency: offer.currency,
    valueAddedTaxIncluded: vatMode === "gross",
  };
  if (isUnitPriced(offer)) {
    // Nutzungsabhängig: die Bezugsmenge kommt aus unitPrice, nicht aus billingPeriod.
    // Kein priceComponentType — ein Einheitspreis ist kein Abonnement.
    const rq = offer.unitPrice.referenceQuantity;
    const unit = UNIT[rq.unit];
    spec.referenceQuantity = qv(rq.value, unit?.unitCode ?? undefined, unit?.unitText ?? undefined);
    if (offer.minTermMonths) spec.billingDuration = qv(offer.minTermMonths, "MON");
    return spec;
  }
  const period = periodOf(offer);
  if (period !== "Once") {
    // Subscription nur für die wiederkehrenden Vertragsformen der Bridge-Tabelle
    // (Rent/Leasing/RaaS); Tagesmiete und Pay-per-Use sind Einheitspreise.
    if (["Rent", "Leasing", "RaaS"].includes(offer.offerType)) {
      spec.priceComponentType = SO + "Subscription";
    }
    spec.referenceQuantity = qv(1, PERIOD[period].unitCode);
    if (offer.minTermMonths) spec.billingDuration = qv(offer.minTermMonths, "MON");
  }
  return spec;
}

function buildOffer(offer, doc, orgId, vatMode) {
  const price = isUnitPriced(offer)
    ? microsToDecimalString(targetMicrosOf(offer, vatMode))
    : priceString(offer.priceCents, offer.vatRate, vatMode);
  const out = { "@type": "Offer", name: offerName(offer, doc) };
  out.businessFunction = GR + (BUSINESS_FUNCTION[offer.offerType] ?? "Sell");
  if (ITEM_CONDITION[doc.condition]) out.itemCondition = ITEM_CONDITION[doc.condition];

  const av = offer.availability;
  if (isPlainObject(av) && AVAILABILITY[av.status]) out.availability = AVAILABILITY[av.status];
  if (av?.availableFrom) out.availabilityStarts = av.availableFrom;
  if (av?.leadTimeDays !== undefined) out.deliveryLeadTime = qv(av.leadTimeDays, "DAY");
  if (av?.quantityAvailable !== undefined) out.inventoryLevel = qv(av.quantityAvailable);
  const isoRegions = (av?.serviceRegions ?? []).filter((r) => ISO_REGION.test(r));
  if (isoRegions.length) out.eligibleRegion = isoRegions.length === 1 ? isoRegions[0] : isoRegions;

  out.priceCurrency = offer.currency;
  out.price = price;
  out.priceSpecification = buildPriceSpecification(offer, price, vatMode);
  if (offer.validUntil) out.priceValidUntil = offer.validUntil;
  // Nur RaaS wird — wie im Bridge-Referenzbeispiel — als B2B-Angebot markiert.
  if (offer.offerType === "RaaS") out.eligibleCustomerType = GR + "Business";

  const warranty = buildWarranty(offer);
  if (warranty) out.warranty = warranty;

  const addOns = [];
  push(addOns, buildFee(offer, offer.setupFeeCents, "Einmalige Einrichtung/Installation", "ActivationFee", vatMode));
  push(addOns, buildFee(offer, offer.deliveryFeeCents, "Lieferung", null, vatMode));
  if (addOns.length) out.addOn = addOns;

  out.seller = { "@id": orgId };
  out.description = offerDescription(offer);
  out.additionalProperty = buildOfferProps(offer);
  return out;
}

/* ------------------------------------------------------------------ *
 * Profil product-snippet: AggregateOffer je Preisbasis
 * ------------------------------------------------------------------ */

function uniqueValues(list) {
  return [...new Set(list.filter((v) => v !== undefined))];
}

/** Einheitlicher Wert oder undefined, wenn nicht alle Offers ihn teilen. */
function uniformValue(offers, pick) {
  const values = offers.map(pick);
  if (values.some((v) => v === undefined)) return undefined;
  const unique = uniqueValues(values);
  return unique.length === 1 ? unique[0] : undefined;
}

/**
 * Gruppiert nach Angebotsklasse, Währung UND Preisbasis. Damit landen Kaufpreis,
 * Monatsrate und nutzungsabhängiger Einheitspreis nie im selben AggregateOffer
 * ("ab 1.416 €"-Klickfalle). Nutzungsabhängige Angebote werden zusätzlich nach
 * Bezugsgröße getrennt — 0,036 €/m² und 12,50 €/h sind kein Preisbereich.
 */
function groupOffers(offers) {
  const groups = new Map();
  for (const offer of offers) {
    const cls = OFFER_CLASS[offer.offerType] ?? "recurring";
    const period = periodOf(offer);
    const unitPriced = isUnitPriced(offer);
    const rq = unitPriced ? offer.unitPrice.referenceQuantity : null;
    const basis = unitPriced ? `unit:${rq.unit}:${rq.value}` : `period:${period}`;
    const key = `${cls}|${offer.currency}|${basis}`;
    if (!groups.has(key)) {
      groups.set(key, {
        cls,
        currency: offer.currency,
        period,
        unitPriced,
        unit: rq?.unit,
        unitValue: rq?.value,
        offers: [],
      });
    }
    groups.get(key).offers.push(offer);
  }
  return [...groups.values()].sort(
    (a, b) =>
      CLASS_RANK[a.cls] - CLASS_RANK[b.cls] ||
      basisRank(a) - basisRank(b) ||
      a.currency.localeCompare(b.currency),
  );
}

function basisRank(group) {
  return group.unitPriced ? (UNIT[group.unit]?.rank ?? 99) : PERIOD[group.period].rank;
}

/** Preis-Suffix einer Gruppe ("/Monat", "/m²", " je 100 m²"). */
function groupSuffix(group) {
  if (!group.unitPriced) return PERIOD[group.period].suffix;
  return unitSuffix(group.offers[0].unitPrice);
}

function aggregateName(group) {
  const types = uniqueValues(group.offers.map((o) => OFFER_TYPE_LABEL[o.offerType] ?? o.offerType));
  const label = types.join(" / ");
  if (group.unitPriced) {
    return `${label} — Preis je ${unitQuantityLabel(group.offers[0].unitPrice)}`;
  }
  const period = PERIOD[group.period];
  return period.label ? `${label} — Rate pro ${period.label}` : label;
}

function aggregateDescription(group, lowNet, highNet) {
  const { offers, currency, unitPriced } = group;
  const suffix = groupSuffix(group);
  const money = (micros) => (unitPriced ? microsToDe(micros) : centsToDe(micros / 10000));
  const vatRate = uniformValue(offers, (o) => o.vatRate);
  const vat = vatRate === undefined ? "zzgl. USt." : `zzgl. ${numberToDe(vatRate)} % USt.`;
  const amount =
    lowNet === highNet
      ? `${money(lowNet)} ${currency}${suffix}`
      : `${money(lowNet)}–${money(highNet)} ${currency}${suffix}`;
  const s = [
    `${offers.length} ${offers.length === 1 ? "Angebot" : "Angebote"}: netto ${amount} ${vat}`,
  ];
  const level = uniformValue(offers, (o) => o.serviceScope?.level);
  s.push(
    level
      ? `Serviceumfang: ${SERVICE_LEVEL_LABEL[level]}.`
      : "Serviceumfang je Angebot unterschiedlich — Details siehe Angebotsseite.",
  );
  const term = uniformValue(offers, (o) => o.minTermMonths);
  if (term) s.push(`Mindestlaufzeit ${term} Monate.`);
  return s.join(" ");
}

function buildAggregateOffer(group, doc, orgId, vatMode) {
  const { offers, currency, unitPriced } = group;
  const net = offers.map(netMicrosOf);
  const lowNet = Math.min(...net);
  const highNet = Math.max(...net);
  const target = offers.map((o) => targetMicrosOf(o, vatMode));
  const asString = (micros) =>
    unitPriced ? microsToDecimalString(micros) : centsToDecimalString(micros / 10000);

  const out = { "@type": "AggregateOffer", name: aggregateName(group) };
  if (ITEM_CONDITION[doc.condition]) out.itemCondition = ITEM_CONDITION[doc.condition];
  const availabilities = uniqueValues(
    offers.map((o) => (isPlainObject(o.availability) ? AVAILABILITY[o.availability.status] : undefined)),
  );
  // Nur wenn alle Angebote der Gruppe denselben Status haben.
  if (availabilities.length === 1 && offers.every((o) => isPlainObject(o.availability))) {
    out.availability = availabilities[0];
  }
  out.priceCurrency = currency;
  out.lowPrice = asString(Math.min(...target));
  out.highPrice = asString(Math.max(...target));
  out.offerCount = offers.length;
  out.seller = { "@id": orgId };
  out.description = aggregateDescription(group, lowNet, highNet);

  const props = [];
  push(props, pv("offer.offerType", "Angebotsart", uniqueValues(offers.map((o) => o.offerType))));
  if (unitPriced) {
    const label = unitPriceLabel(offers[0]);
    push(
      props,
      pv(
        "offer.unitPrice.amount",
        lowNet === highNet ? label : `${label} (von–bis)`,
        lowNet === highNet
          ? offers[0].unitPrice.amount
          : [microsToDecimalString(lowNet), microsToDecimalString(highNet)],
      ),
    );
  } else {
    const centsLabel = priceCentsLabel(offers[0]);
    const lowCents = lowNet / 10000;
    const highCents = highNet / 10000;
    push(
      props,
      pv(
        "offer.priceCents",
        lowCents === highCents ? centsLabel : `${centsLabel} (von–bis)`,
        lowCents === highCents ? lowCents : [lowCents, highCents],
      ),
    );
  }
  push(props, pv("offer.vatRate", "USt.-Satz", uniformValue(offers, (o) => o.vatRate), "%"));
  push(props, pv("offer.billingPeriod", "Abrechnungsperiode", uniformValue(offers, (o) => o.billingPeriod)));
  push(props, pv("offer.minTermMonths", "Mindestlaufzeit", uniformValue(offers, (o) => o.minTermMonths), "Monate"));
  const starting = offers.some((o) => o.isStartingPrice === true)
    ? true
    : offers.every((o) => o.isStartingPrice === false)
      ? false
      : undefined;
  push(props, pv("offer.isStartingPrice", "Ab-Preis", starting));
  push(props, pv("offer.serviceScope.level", "Serviceumfang (Stufe)", uniformValue(offers, (o) => o.serviceScope?.level)));
  if (props.length) out.additionalProperty = props;
  return out;
}

/* ------------------------------------------------------------------ *
 * Öffentliche API
 * ------------------------------------------------------------------ */

/**
 * Wandelt ein RobotSpec-v0.2-Listing in ein schema.org-JSON-LD-Objekt.
 *
 * @param {object} doc RobotSpec-Listing (v0.2)
 * @param {{profile?: "merchant-listing"|"product-snippet", vatMode?: "gross"|"net"}} [options]
 * @returns {object} JSON-LD mit @context und @graph (Organization + Product)
 */
export function toSchemaOrg(doc, options = {}) {
  if (!isPlainObject(doc)) {
    throw new TypeError(
      `toSchemaOrg: erwartet ein RobotSpec-Listing als Objekt, erhalten: ${describe(doc)}.`,
    );
  }
  if (!isPlainObject(options)) {
    throw new TypeError(`toSchemaOrg: options muss ein Objekt sein, erhalten: ${describe(options)}.`);
  }
  const { profile = "merchant-listing", vatMode = "gross", ...unknown } = options;
  const unknownKeys = Object.keys(unknown);
  if (unknownKeys.length) {
    throw new TypeError(
      `toSchemaOrg: unbekannte Option(en) ${unknownKeys.join(", ")}. Erlaubt sind: profile, vatMode.`,
    );
  }
  if (!PROFILES.includes(profile)) {
    throw new TypeError(
      `toSchemaOrg: profile muss ${PROFILES.map((p) => `"${p}"`).join(" oder ")} sein, erhalten: ${describe(profile)}.`,
    );
  }
  if (!VAT_MODES.includes(vatMode)) {
    throw new TypeError(
      `toSchemaOrg: vatMode muss ${VAT_MODES.map((v) => `"${v}"`).join(" oder ")} sein, erhalten: ${describe(vatMode)}.`,
    );
  }
  if (doc.schemaVersion !== undefined && !SUPPORTED_SCHEMA_VERSIONS.includes(doc.schemaVersion)) {
    throw new Error(
      `toSchemaOrg: unterstützt werden RobotSpec ${SUPPORTED_SCHEMA_VERSIONS.map((v) => `v${v}`).join(" und ")}, gefunden: schemaVersion ${describe(doc.schemaVersion)}.`,
    );
  }
  if (!doc.make || !doc.model) {
    throw new Error("toSchemaOrg: make und model sind Pflichtfelder eines RobotSpec-Listings.");
  }

  const orgId = organizationId(doc);
  const product = { "@type": "Product", name: productName(doc) };
  if (doc.listingId) product.sku = doc.listingId;
  if (doc.productId) product.productID = doc.productId;
  if (doc.manufacturerSku) product.mpn = doc.manufacturerSku;
  if (doc.gtin) product.gtin = doc.gtin;
  product.brand = { "@type": "Brand", name: doc.make };
  product.model = doc.model;
  if (doc.description) {
    product.description = doc.description;
    if (doc.summary) product.disambiguatingDescription = doc.summary;
  } else if (doc.summary) {
    product.description = doc.summary;
  }
  const image = buildImages(doc.media?.images);
  if (image) product.image = image;
  const weightKg = doc.capabilities?.weightKg ?? doc.humanoidCapabilities?.weightKg;
  if (weightKg !== undefined) product.weight = qv(weightKg, "KGM");
  product.additionalProperty = buildProductProps(doc);

  // Anti-Pattern-Guard: ein angekündigtes Produkt bekommt gar kein Offer-Markup
  // (und niemals PreOrder). rs:lifecycleStatus erklärt die Abwesenheit.
  const offers = doc.lifecycleStatus === "Announced" ? [] : (doc.offers ?? []);
  if (offers.length) {
    if (profile === "merchant-listing") {
      // Merchant Listings nie als AggregateOffer — immer einzelne Offer-Objekte.
      product.offers = offers.map((offer) => buildOffer(offer, doc, orgId, vatMode));
    } else {
      const aggregates = groupOffers(offers).map((g) => buildAggregateOffer(g, doc, orgId, vatMode));
      product.offers = aggregates.length === 1 ? aggregates[0] : aggregates;
    }
  }

  return {
    "@context": contextFor(doc),
    "@graph": [buildOrganization(doc, orgId), product],
  };
}

function describe(value) {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (Array.isArray(value)) return "Array";
  return typeof value === "object" ? "Object" : JSON.stringify(value);
}

export default toSchemaOrg;

/* ------------------------------------------------------------------ *
 * Optionales CLI: node converter/index.mjs <listing.json> [--profile=…] [--vatMode=…]
 * (dynamische Imports, damit das Modul selbst laufzeitumgebungs-neutral bleibt)
 * ------------------------------------------------------------------ */

const isMain = await (async () => {
  if (typeof process === "undefined" || !process.argv?.[1]) return false;
  const { pathToFileURL } = await import("node:url");
  return import.meta.url === pathToFileURL(process.argv[1]).href;
})();

if (isMain) {
  const { readFileSync } = await import("node:fs");
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  const flag = (name, fallback) => {
    const hit = args.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : fallback;
  };
  if (!file) {
    console.error("Aufruf: node converter/index.mjs <listing.json> [--profile=merchant-listing|product-snippet] [--vatMode=gross|net]");
    process.exit(2);
  }
  try {
    const doc = JSON.parse(readFileSync(file, "utf8"));
    const out = toSchemaOrg(doc, {
      profile: flag("profile", "merchant-listing"),
      vatMode: flag("vatMode", "gross"),
    });
    console.log(JSON.stringify(out, null, 2));
  } catch (e) {
    console.error(`Fehler: ${e.message}`);
    process.exit(1);
  }
}
