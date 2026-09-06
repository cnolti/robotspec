/**
 * RobotSpec-Validator: Schemata kompilieren, alle Beispiele prüfen
 * (Schemawahl nach schemaVersion bzw. feedVersion), semantische Regeln
 * anwenden, die JSON Schema nicht ausdrücken kann, und die Pflichtregeln
 * gegen eine Negativ-Testsuite absichern.
 *
 *   node validate-schema.mjs
 */
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFileSync, readdirSync, statSync } from "fs";

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

function loadSchema(path) {
  try {
    const schema = JSON.parse(readFileSync(path, "utf8"));
    console.log(`✓ ${path} ist valides JSON`);
    return schema;
  } catch (e) {
    console.error(`✗ ${path} — kein valides JSON:`, e.message);
    process.exit(1);
  }
}

const schemas = {
  "0.1": loadSchema("./schema/robotspec-v0.1.schema.json"),
  "0.2": loadSchema("./schema/robotspec-v0.2.schema.json"),
  "0.3": loadSchema("./schema/robotspec-v0.3.schema.json"),
};
const feedSchemas = {
  "0.2": loadSchema("./schema/robotspec-feed-0.2.schema.json"),
  "0.3": loadSchema("./schema/robotspec-feed-0.3.schema.json"),
};

const validateListing = {};
const validateFeed = {};
try {
  // Reihenfolge: erst die Listing-Schemata (registrieren ihre $id für die Feed-$refs).
  for (const [version, schema] of Object.entries(schemas)) {
    validateListing[version] = ajv.compile(schema);
  }
  for (const [version, schema] of Object.entries(feedSchemas)) {
    validateFeed[version] = ajv.compile(schema);
  }
  console.log("✓ Schemata kompilieren (JSON Schema Draft 2020-12)");
} catch (e) {
  console.error("✗ Schema kompiliert NICHT:", e.message);
  process.exit(1);
}

/* ------------------------------------------------------------------ *
 * Semantische Regeln (JSON Schema kann sie nicht ausdrücken)
 * ------------------------------------------------------------------ */

/** Prüft ein einzelnes Listing. Rückgabe: Liste von Fehlermeldungen. */
export function semanticListingErrors(doc, prefix = "") {
  const errors = [];
  const at = (path) => `${prefix}${path}`;

  // Zeitlogik: ein Update kann nicht vor der Erstellung liegen.
  if (doc.createdAt && doc.updatedAt && Date.parse(doc.updatedAt) < Date.parse(doc.createdAt)) {
    errors.push(`${at("/updatedAt")}: liegt vor createdAt (${doc.updatedAt} < ${doc.createdAt})`);
  }

  // Flächenleistung: der praktische Wert kann den theoretischen nicht übersteigen.
  const caps = doc.capabilities;
  if (caps && typeof caps.areaPerformancePracticalM2h === "number" && typeof caps.areaPerformanceTheoreticalM2h === "number") {
    if (caps.areaPerformancePracticalM2h > caps.areaPerformanceTheoreticalM2h) {
      errors.push(
        `${at("/capabilities/areaPerformancePracticalM2h")}: praktische Flächenleistung (${caps.areaPerformancePracticalM2h}) über der theoretischen (${caps.areaPerformanceTheoreticalM2h})`,
      );
    }
  }

  const offers = Array.isArray(doc.offers) ? doc.offers : [];
  const seenOfferIds = new Set();
  offers.forEach((offer, i) => {
    if (offer.offerId !== undefined) {
      if (seenOfferIds.has(offer.offerId)) {
        errors.push(`${at(`/offers/${i}/offerId`)}: offerId "${offer.offerId}" kommt im Listing mehrfach vor`);
      }
      seenOfferIds.add(offer.offerId);
    }
    // Währung des Angebots und des Einheitspreises müssen übereinstimmen.
    if (offer.unitPrice && offer.currency && offer.unitPrice.currency !== offer.currency) {
      errors.push(
        `${at(`/offers/${i}/unitPrice/currency`)}: ${offer.unitPrice.currency} weicht von offers[${i}].currency (${offer.currency}) ab`,
      );
    }
  });

  return errors;
}

/** Prüft einen Feed-Umschlag inklusive seiner Listings. */
export function semanticFeedErrors(feed) {
  const errors = [];
  const listings = Array.isArray(feed.listings) ? feed.listings : [];

  if (feed.listingCount !== undefined && feed.listingCount !== listings.length) {
    errors.push(`/listingCount: ${feed.listingCount} entspricht nicht der Anzahl listings (${listings.length})`);
  }

  const seen = new Set();
  listings.forEach((listing, i) => {
    if (listing.listingId !== undefined) {
      if (seen.has(listing.listingId)) {
        errors.push(`/listings/${i}/listingId: "${listing.listingId}" kommt im Feed mehrfach vor`);
      }
      seen.add(listing.listingId);
    }
    errors.push(...semanticListingErrors(listing, `/listings/${i}`));
  });

  for (const id of feed.withdrawnListingIds ?? []) {
    if (seen.has(id)) {
      errors.push(`/withdrawnListingIds: "${id}" steht gleichzeitig unter listings — Rückzug und Bestand widersprechen sich`);
    }
  }

  return errors;
}

/* ------------------------------------------------------------------ *
 * Prüfung eines Dokuments (Schemawahl nach Versionsmarker)
 * ------------------------------------------------------------------ */

/** Rückgabe: { ok, errors[] } */
function checkDocument(data, label) {
  const isFeed = data.feedVersion !== undefined || data.feedType !== undefined;
  const version = isFeed ? data.feedVersion : data.schemaVersion;
  const table = isFeed ? validateFeed : validateListing;
  const validate = table[version];
  if (!validate) {
    return {
      ok: false,
      errors: [`${label}: unbekannte ${isFeed ? "feedVersion" : "schemaVersion"} ${JSON.stringify(version)}`],
    };
  }
  const errors = [];
  if (!validate(data)) {
    for (const err of validate.errors) {
      errors.push(`${err.instancePath || "/"}: ${err.message}`);
    }
  }
  errors.push(...(isFeed ? semanticFeedErrors(data) : semanticListingErrors(data)));
  return { ok: errors.length === 0, errors };
}

/* ------------------------------------------------------------------ *
 * 1) Alle Beispiele (rekursiv, damit auch schema/examples/v0.2/ läuft)
 * ------------------------------------------------------------------ */

const examplesDir = "./schema/examples";
let passed = 0;
let failed = 0;

function jsonFilesIn(dir) {
  const out = [];
  for (const entry of readdirSync(dir).sort()) {
    const full = `${dir}/${entry}`;
    if (statSync(full).isDirectory()) out.push(...jsonFilesIn(full));
    else if (entry.endsWith(".json")) out.push(full);
  }
  return out;
}

console.log("\nBeispiele:");
for (const file of jsonFilesIn(examplesDir)) {
  const label = file.replace(`${examplesDir}/`, "");
  const data = JSON.parse(readFileSync(file, "utf8"));
  const { ok, errors } = checkDocument(data, label);
  if (ok) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ ${label}:`);
    for (const err of errors.slice(0, 6)) console.log(`    - ${err}`);
    failed++;
  }
}

/* ------------------------------------------------------------------ *
 * 2) Negativtests: jeder Fall MUSS scheitern
 * ------------------------------------------------------------------ */

const read = (name) => JSON.parse(readFileSync(`${examplesDir}/${name}`, "utf8"));
const gausium = read("gausium-scrubber-50-raas.json");
const nexaro = read("nexaro-nr1700-leasing-ohne-service.json");
const neura = read("neura-4ne1-announced-specsheet.json");
const payPerUse = read("pay-per-use-per-m2.json");
const feedFull = read("feed-full.json");

const clone = (o) => structuredClone(o);

/** Listing mit genau einem Angebot, das aus `patch` entsteht. */
function withOffer(patch) {
  const doc = clone(nexaro);
  doc.offers = [{ ...clone(nexaro.offers[0]), ...patch }];
  return doc;
}

const negativeCases = [
  [
    "serviceScope level=Full ohne Wartung/Reparaturen/Ersatzgerät",
    withOffer({ serviceScope: { level: "Full" } }),
  ],
  [
    "serviceScope level=Full mit maintenance=false",
    withOffer({
      serviceScope: { level: "Full", maintenance: false, repairs: true, replacementDevice: true },
    }),
  ],
  [
    "serviceScope level=None mit maintenance=true",
    withOffer({ serviceScope: { level: "None", maintenance: true } }),
  ],
  [
    "Purchase mit billingPeriod=Month",
    withOffer({ offerType: "Purchase", billingPeriod: "Month", minTermMonths: undefined }),
  ],
  [
    "RaaS mit billingPeriod=Once",
    withOffer({ offerType: "RaaS", billingPeriod: "Once" }),
  ],
  [
    "PayPerUse mit priceCents statt unitPrice",
    withOffer({
      offerType: "PayPerUse",
      billingPeriod: "PerSquareMeter",
      priceCents: 4,
      unitPrice: { amount: "0.036", currency: "EUR", referenceQuantity: { value: 1, unit: "M2" } },
      minTermMonths: undefined,
    }),
  ],
  [
    "PayPerUse ohne unitPrice",
    withOffer({
      offerType: "PayPerUse",
      billingPeriod: "PerSquareMeter",
      priceCents: undefined,
      minTermMonths: undefined,
    }),
  ],
  [
    "Nicht-PayPerUse mit unitPrice",
    withOffer({
      unitPrice: { amount: "0.036", currency: "EUR", referenceQuantity: { value: 1, unit: "M2" } },
    }),
  ],
  [
    "unitPrice.amount mit mehr als sechs Nachkommastellen",
    (() => {
      const doc = clone(payPerUse);
      doc.offers[0].unitPrice.amount = "0.0360001";
      return doc;
    })(),
  ],
  [
    "unitPrice.currency weicht von offer.currency ab",
    (() => {
      const doc = clone(payPerUse);
      doc.offers[0].unitPrice.currency = "CHF";
      return doc;
    })(),
  ],
  [
    "praktische Flächenleistung über der theoretischen",
    (() => {
      const doc = clone(gausium);
      doc.capabilities.areaPerformancePracticalM2h = 2000;
      return doc;
    })(),
  ],
  [
    "updatedAt vor createdAt",
    (() => {
      const doc = clone(gausium);
      doc.createdAt = "2026-08-01T10:00:00Z";
      doc.updatedAt = "2026-07-31T10:00:00Z";
      return doc;
    })(),
  ],
  [
    "doppelte offerId innerhalb eines Listings",
    (() => {
      const doc = clone(gausium);
      doc.offers[1].offerId = doc.offers[0].offerId;
      return doc;
    })(),
  ],
  [
    "leere listingId (nur Leerzeichen)",
    (() => {
      const doc = clone(gausium);
      doc.listingId = "   ";
      return doc;
    })(),
  ],
  [
    "revision 0",
    (() => {
      const doc = clone(gausium);
      doc.revision = 0;
      return doc;
    })(),
  ],
  [
    "provenance-Eintrag ohne verificationStatus",
    (() => {
      const doc = clone(gausium);
      doc.provenance = [{ path: "/make", assertedBy: "Hersteller", assertedAt: "2026-07-31T10:00:00Z" }];
      return doc;
    })(),
  ],
  [
    "provenance.path ohne führenden Schrägstrich",
    (() => {
      const doc = clone(gausium);
      doc.provenance = [
        {
          path: "capabilities/weightKg",
          assertedBy: "Hersteller",
          assertedAt: "2026-07-31T10:00:00Z",
          verificationStatus: "ManufacturerClaim",
        },
      ];
      return doc;
    })(),
  ],
  [
    "lifecycleStatus Announced mit offers",
    (() => {
      const doc = clone(neura);
      doc.offers = [
        {
          offerType: "Purchase",
          priceCents: 9800000,
          currency: "EUR",
          vatRate: 19,
          serviceScope: { level: "None" },
        },
      ];
      return doc;
    })(),
  ],
  [
    "availability.inStock ist in v0.3 entfallen",
    withOffer({ availability: { status: "InStock", asOf: "2026-08-11T12:00:00Z", inStock: true } }),
  ],
  [
    "Feed-Listing ohne listingId",
    (() => {
      const feed = clone(feedFull);
      delete feed.listings[0].listingId;
      return feed;
    })(),
  ],
  [
    "Feed mit falschem listingCount",
    (() => {
      const feed = clone(feedFull);
      feed.listingCount = 5;
      return feed;
    })(),
  ],
  [
    "Feed mit doppelter listingId",
    (() => {
      const feed = clone(feedFull);
      feed.listings = [clone(feedFull.listings[0]), clone(feedFull.listings[0])];
      feed.listingCount = 2;
      return feed;
    })(),
  ],
  [
    "Feed: listingId gleichzeitig im Bestand und zurückgezogen",
    (() => {
      const feed = clone(feedFull);
      feed.withdrawnListingIds = [feed.listings[0].listingId];
      return feed;
    })(),
  ],
  [
    "Feed mit nextPage-String statt null",
    (() => {
      const feed = clone(feedFull);
      feed.nextPage = "https://example-supplier.de/robotspec-feed.json?page=2";
      return feed;
    })(),
  ],
];

console.log("\nNegativtests (jeder Fall MUSS abgelehnt werden):");
for (const [label, doc] of negativeCases) {
  const { ok } = checkDocument(doc, label);
  if (ok) {
    console.log(`  ✗ ${label}: wurde fälschlich akzeptiert`);
    failed++;
  } else {
    console.log(`  ✓ ${label}`);
    passed++;
  }
}

/* ------------------------------------------------------------------ *
 * 3) Positivtests: erlaubte Grenzfälle dürfen NICHT scheitern
 * ------------------------------------------------------------------ */

const positiveCases = [
  ["Purchase ohne billingPeriod", withOffer({ offerType: "Purchase", billingPeriod: undefined, minTermMonths: undefined })],
  ["Purchase mit billingPeriod=Once", withOffer({ offerType: "Purchase", billingPeriod: "Once", minTermMonths: undefined })],
  [
    "serviceScope level=None ohne die drei Bausteine",
    withOffer({ serviceScope: { level: "None" } }),
  ],
  [
    "serviceScope level=Partial mit gemischten Bausteinen",
    withOffer({ serviceScope: { level: "Partial", maintenance: true, repairs: false } }),
  ],
  ["Listing ohne offerId (offerId ist optional)", (() => {
    const doc = clone(gausium);
    for (const offer of doc.offers) delete offer.offerId;
    return doc;
  })()],
];

console.log("\nPositivtests (erlaubte Grenzfälle):");
for (const [label, doc] of positiveCases) {
  const { ok, errors } = checkDocument(doc, label);
  if (ok) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ ${label}: fälschlich abgelehnt`);
    for (const err of errors.slice(0, 4)) console.log(`    - ${err}`);
    failed++;
  }
}

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen`);
process.exit(failed > 0 ? 1 : 0);
