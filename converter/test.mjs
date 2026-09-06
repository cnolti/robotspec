/**
 * Testrunner für @robotspec/to-schemaorg — zero-dependency, node:assert.
 *
 *   node converter/test.mjs            # Golden-File-Vergleich + Unit-Tests
 *   node converter/test.mjs --update   # Golden-Files neu schreiben
 */

import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { toSchemaOrg, PROFILES } from "./index.mjs";

const UPDATE = process.argv.includes("--update");
const EXAMPLES_DIR = fileURLToPath(new URL("../schema/examples/", import.meta.url));
const GOLDEN_DIR = fileURLToPath(new URL("./test/golden/", import.meta.url));

let passed = 0;
let failed = 0;

function check(label, fn) {
  try {
    fn();
    console.log(`  ✓ ${label}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${label}`);
    console.log(`    ${String(e.message).split("\n").slice(0, 8).join("\n    ")}`);
    failed++;
  }
}

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

/* ------------------------------------------------------------------ *
 * 1) Golden-File-Tests: jedes v0.3-Listing-Beispiel × jedes Profil
 * ------------------------------------------------------------------ */

const listingFiles = readdirSync(EXAMPLES_DIR)
  .filter((f) => f.endsWith(".json") && !f.startsWith("feed-"))
  .filter((f) => readJson(EXAMPLES_DIR + f).schemaVersion === "0.3")
  .sort();

console.log(`Golden-Files (${listingFiles.length} Beispiele × ${PROFILES.length} Profile):`);

for (const file of listingFiles) {
  const doc = readJson(EXAMPLES_DIR + file);
  const base = file.replace(/\.json$/, "");
  for (const profile of PROFILES) {
    const goldenPath = `${GOLDEN_DIR}${base}.${profile}.json`;
    const actual = toSchemaOrg(doc, { profile, vatMode: "gross" });
    if (UPDATE) {
      writeFileSync(goldenPath, JSON.stringify(actual, null, 2) + "\n");
      console.log(`  ⟳ ${base}.${profile}.json geschrieben`);
      continue;
    }
    check(`${base}.${profile}.json`, () => {
      assert.deepStrictEqual(actual, readJson(goldenPath));
    });
  }
}

if (UPDATE) {
  console.log("\nGolden-Files aktualisiert — Ergebnis vor dem Commit inhaltlich prüfen.");
  process.exit(0);
}

/* ------------------------------------------------------------------ *
 * 2) Unit-Tests für Regeln, die die Beispiele nicht abdecken
 * ------------------------------------------------------------------ */

console.log("\nOptionen und Fehlerfälle:");

const gausium = readJson(EXAMPLES_DIR + "gausium-scrubber-50-raas.json");
const nexaro = readJson(EXAMPLES_DIR + "nexaro-nr1700-leasing-ohne-service.json");
const neura = readJson(EXAMPLES_DIR + "neura-4ne1-announced-specsheet.json");
const payPerUse = readJson(EXAMPLES_DIR + "pay-per-use-per-m2.json");
const gausiumV02 = readJson(EXAMPLES_DIR + "v0.2/gausium-scrubber-50-raas.json");

const productOf = (out) => out["@graph"].find((n) => n["@type"] === "Product");
const offersOf = (out) => productOf(out).offers;
const propOf = (node, id) => node.additionalProperty?.find((p) => p.propertyID === id);

check("ungültiges profile wirft mit verständlicher Meldung", () => {
  assert.throws(() => toSchemaOrg(gausium, { profile: "rich-snippet" }), (e) => {
    assert.ok(e instanceof TypeError);
    assert.match(e.message, /profile muss "merchant-listing" oder "product-snippet" sein/);
    return true;
  });
});

check("ungültiger vatMode wirft mit verständlicher Meldung", () => {
  assert.throws(() => toSchemaOrg(gausium, { vatMode: "brutto" }), (e) => {
    assert.match(e.message, /vatMode muss "gross" oder "net" sein/);
    return true;
  });
});

check("unbekannte Option wirft", () => {
  assert.throws(() => toSchemaOrg(gausium, { locale: "de" }), /unbekannte Option\(en\) locale/);
});

check("Nicht-Objekt als doc wirft", () => {
  assert.throws(() => toSchemaOrg(null), /erwartet ein RobotSpec-Listing als Objekt/);
  assert.throws(() => toSchemaOrg("{}"), /erwartet ein RobotSpec-Listing als Objekt/);
});

check("fremde schemaVersion wirft", () => {
  assert.throws(
    () => toSchemaOrg({ ...gausium, schemaVersion: "0.1" }),
    /unterstützt werden RobotSpec v0.2 und v0.3/,
  );
});

check("v0.2-Listings bleiben konvertierbar, rs:-Präfix folgt der Schemaversion", () => {
  const out = toSchemaOrg(gausiumV02);
  assert.equal(out["@context"][1].rs, "https://robotspec.org/schema/v0.2/#");
  assert.equal(toSchemaOrg(gausium)["@context"][1].rs, "https://robotspec.org/schema/v0.3/#");
  // Ohne schemaVersion gilt die aktuelle Version.
  const { schemaVersion, ...ohneVersion } = gausium;
  assert.equal(toSchemaOrg(ohneVersion)["@context"][1].rs, "https://robotspec.org/schema/v0.3/#");
  // Der v0.2-Datensatz kennt weder offerId noch productId — das Markup bleibt trotzdem vollständig.
  assert.equal(productOf(out).productID, undefined);
  assert.equal(offersOf(out)[0].price, "1416.10");
});

check("Defaults: merchant-listing + gross", () => {
  assert.deepStrictEqual(
    toSchemaOrg(gausium),
    toSchemaOrg(gausium, { profile: "merchant-listing", vatMode: "gross" }),
  );
});

console.log("\nPreise und MwSt.:");

check("gross rechnet vatRate auf und setzt valueAddedTaxIncluded", () => {
  const [raas, purchase] = offersOf(toSchemaOrg(gausium));
  assert.equal(purchase.price, "38068.10"); // 31.990,00 × 1,19
  assert.equal(raas.price, "1416.10"); // 1.190,00 × 1,19
  assert.equal(purchase.priceSpecification.valueAddedTaxIncluded, true);
  assert.equal(purchase.addOn[0].price, "1487.50"); // 1.250,00 × 1,19
  assert.equal(purchase.addOn[1].price, "296.31"); // 249,00 × 1,19
});

check("net liefert den Nettobetrag und valueAddedTaxIncluded: false", () => {
  const [raas, purchase] = offersOf(toSchemaOrg(gausium, { vatMode: "net" }));
  assert.equal(purchase.price, "31990.00");
  assert.equal(raas.price, "1190.00");
  assert.equal(purchase.priceSpecification.valueAddedTaxIncluded, false);
  assert.equal(purchase.addOn[0].price, "1250.00");
});

check("Nicht-ganzzahliger Steuersatz (CH 8,1 %) rundet auf ganze Cent", () => {
  const doc = {
    ...nexaro,
    offers: [{ ...nexaro.offers[0], priceCents: 6200, currency: "CHF", vatRate: 8.1 }],
  };
  // 62,00 × 1,081 = 67,022 → 67,02
  assert.equal(offersOf(toSchemaOrg(doc))[0].price, "67.02");
});

check("Netto-Cent bleiben als rs:offer.priceCents erhalten", () => {
  const [raas] = offersOf(toSchemaOrg(gausium));
  assert.equal(propOf(raas, "rs:offer.priceCents").value, 119000);
});

console.log("\nAngebotstypen und Laufzeiten:");

check("Kauf → gr:Sell ohne referenceQuantity", () => {
  const purchase = offersOf(toSchemaOrg(gausium))[1];
  assert.equal(purchase.businessFunction, "http://purl.org/goodrelations/v1#Sell");
  assert.equal(purchase.priceSpecification.referenceQuantity, undefined);
  assert.equal(purchase.priceSpecification.priceComponentType, undefined);
});

check("RaaS → gr:ProvideService, Subscription, referenceQuantity MON, billingDuration", () => {
  const raas = offersOf(toSchemaOrg(gausium))[0];
  assert.equal(raas.businessFunction, "http://purl.org/goodrelations/v1#ProvideService");
  assert.equal(raas.eligibleCustomerType, "http://purl.org/goodrelations/v1#Business");
  assert.deepStrictEqual(raas.priceSpecification.referenceQuantity, {
    "@type": "QuantitativeValue",
    value: 1,
    unitCode: "MON",
  });
  assert.deepStrictEqual(raas.priceSpecification.billingDuration, {
    "@type": "QuantitativeValue",
    value: 24,
    unitCode: "MON",
  });
});

check("Leasing/Miete → gr:LeaseOut, kein eligibleCustomerType", () => {
  const leasing = offersOf(toSchemaOrg(nexaro))[0];
  assert.equal(leasing.businessFunction, "http://purl.org/goodrelations/v1#LeaseOut");
  assert.equal(leasing.eligibleCustomerType, undefined);
});

check("Tagesmiete → referenceQuantity 1 DAY", () => {
  const day = readJson(EXAMPLES_DIR + "delivery-robot-dayrate.json");
  const offer = offersOf(toSchemaOrg(day))[0];
  assert.equal(offer.businessFunction, "http://purl.org/goodrelations/v1#LeaseOut");
  assert.equal(offer.priceSpecification.referenceQuantity.unitCode, "DAY");
  assert.equal(offer.price, "177.31"); // 149,00 × 1,19
});

check("PayPerUse (v0.2, Cent-Preis) → referenceQuantity 1 MTK ohne Subscription", () => {
  const doc = {
    ...gausiumV02,
    offers: [
      {
        offerType: "PayPerUse",
        priceCents: 3,
        currency: "EUR",
        vatRate: 19,
        billingPeriod: "PerSquareMeter",
        serviceScope: { level: "Full" },
      },
    ],
  };
  const offer = offersOf(toSchemaOrg(doc))[0];
  assert.equal(offer.priceSpecification.referenceQuantity.unitCode, "MTK");
  assert.equal(offer.priceSpecification.priceComponentType, undefined);
  assert.equal(propOf(offer, "rs:offer.priceCents").name, "Nettopreis je m² in Cent");
});

console.log("\nDezimaler Einheitspreis (unitPrice):");

check("unitPrice 0,036 EUR/m² bleibt subcent-genau (brutto und netto)", () => {
  const [flaeche] = offersOf(toSchemaOrg(payPerUse));
  assert.equal(flaeche.price, "0.04284"); // 0,036 × 1,19
  assert.equal(flaeche.priceSpecification.price, "0.04284");
  assert.equal(flaeche.priceSpecification.valueAddedTaxIncluded, true);
  const [netto] = offersOf(toSchemaOrg(payPerUse, { vatMode: "net" }));
  assert.equal(netto.price, "0.036");
  assert.equal(netto.priceSpecification.valueAddedTaxIncluded, false);
  // Der Nettobetrag bleibt zusätzlich als rs:-Wert erhalten (wie priceCents sonst).
  assert.equal(propOf(flaeche, "rs:offer.unitPrice.amount").value, "0.036");
  assert.equal(propOf(flaeche, "rs:offer.unitPrice.amount").name, "Nettopreis je m²");
  assert.equal(propOf(flaeche, "rs:offer.priceCents"), undefined);
});

check("unitPrice → UnitPriceSpecification mit referenceQuantity aus der Bezugsgröße", () => {
  const [flaeche, stunde] = offersOf(toSchemaOrg(payPerUse));
  assert.deepStrictEqual(flaeche.priceSpecification.referenceQuantity, {
    "@type": "QuantitativeValue",
    value: 1,
    unitCode: "MTK",
  });
  assert.equal(flaeche.priceSpecification.priceComponentType, undefined);
  assert.deepStrictEqual(stunde.priceSpecification.referenceQuantity, {
    "@type": "QuantitativeValue",
    value: 1,
    unitCode: "HUR",
  });
  assert.equal(flaeche.businessFunction, "http://purl.org/goodrelations/v1#ProvideService");
});

check("Bezugsgröße Cycle hat keinen UN/CEFACT-Code und nutzt unitText", () => {
  const doc = {
    ...payPerUse,
    offers: [
      {
        ...payPerUse.offers[1],
        unitPrice: { amount: "1.75", currency: "EUR", referenceQuantity: { value: 1, unit: "Cycle" } },
      },
    ],
  };
  assert.deepStrictEqual(offersOf(toSchemaOrg(doc))[0].priceSpecification.referenceQuantity, {
    "@type": "QuantitativeValue",
    value: 1,
    unitText: "Zyklus",
  });
});

check("Bezugsmenge > 1 erscheint im Text und in referenceQuantity", () => {
  const doc = {
    ...payPerUse,
    offers: [
      {
        ...payPerUse.offers[1],
        unitPrice: { amount: "3.60", currency: "EUR", referenceQuantity: { value: 100, unit: "M2" } },
      },
    ],
  };
  const offer = offersOf(toSchemaOrg(doc))[0];
  assert.equal(offer.priceSpecification.referenceQuantity.value, 100);
  assert.ok(offer.description.startsWith("Netto 3,60 EUR je 100 m² zzgl. 19 % USt."), offer.description);
  assert.equal(propOf(offer, "rs:offer.unitPrice.amount").name, "Nettopreis je 100 m²");
});

check("Preistext nennt den Einheitspreis mit Bezugsgröße", () => {
  const [flaeche, stunde] = offersOf(toSchemaOrg(payPerUse));
  assert.ok(flaeche.description.startsWith("Netto 0,036 EUR/m² zzgl. 19 % USt."), flaeche.description);
  assert.ok(stunde.description.startsWith("Netto 12,50 EUR/h zzgl. 19 % USt."), stunde.description);
});

check("Full-Service erzeugt WarrantyPromise, None nicht", () => {
  const [raas, purchase] = offersOf(toSchemaOrg(gausium));
  assert.equal(
    raas.warranty.name,
    "Full-Service (Wartung, Reparaturen, Verschleißteile, Ersatzgerät binnen 48 h)",
  );
  assert.equal(raas.warranty.durationOfWarranty.value, 24);
  assert.equal(purchase.warranty, undefined);
});

check("setupFeeCents → addOn mit ActivationFee; 0 € erzeugt keinen addOn", () => {
  const [raas, purchase] = offersOf(toSchemaOrg(gausium));
  assert.equal(
    purchase.addOn[0].priceSpecification.priceComponentType,
    "https://schema.org/ActivationFee",
  );
  assert.equal(raas.addOn, undefined);
  assert.equal(propOf(raas, "rs:offer.setupFeeCents").value, 0);
});

console.log("\nVerfügbarkeit und Lifecycle:");

check("Status-Mapping auf ItemAvailability", () => {
  const cases = {
    InStock: "https://schema.org/InStock",
    LeadTime: "https://schema.org/InStock",
    MadeToOrder: "https://schema.org/MadeToOrder",
    PreOrder: "https://schema.org/PreOrder",
    OnRequest: "https://schema.org/LimitedAvailability",
    OutOfStock: "https://schema.org/OutOfStock",
  };
  for (const [status, expected] of Object.entries(cases)) {
    const availability = { status, asOf: "2026-08-11T12:00:00Z" };
    if (status === "PreOrder") availability.availableFrom = "2026-12-01";
    if (status === "LeadTime") availability.leadTimeDays = 14;
    const doc = { ...nexaro, offers: [{ ...nexaro.offers[0], availability }] };
    const offer = offersOf(toSchemaOrg(doc))[0];
    assert.equal(offer.availability, expected, status);
    assert.equal(propOf(offer, "rs:offer.availability.status").value, status);
  }
});

check("PreOrder übernimmt availableFrom als availabilityStarts", () => {
  const doc = {
    ...nexaro,
    offers: [
      {
        ...nexaro.offers[0],
        availability: { status: "PreOrder", asOf: "2026-08-11T12:00:00Z", availableFrom: "2026-12-01" },
      },
    ],
  };
  assert.equal(offersOf(toSchemaOrg(doc))[0].availabilityStarts, "2026-12-01");
});

check("Offer ohne availability bekommt kein availability-Feld (kein Raten)", () => {
  const offer = offersOf(toSchemaOrg(nexaro))[0];
  assert.equal(offer.availability, undefined);
  assert.equal(offer.availabilityStarts, undefined);
});

check("lifecycleStatus Announced ⇒ keine offers, auch wenn welche mitgeliefert werden", () => {
  const doc = {
    ...neura,
    offers: [
      {
        offerType: "Purchase",
        priceCents: 9800000,
        currency: "EUR",
        vatRate: 19,
        serviceScope: { level: "None" },
        availability: { status: "PreOrder", asOf: "2026-08-11T12:00:00Z", availableFrom: "2026-12-01" },
      },
    ],
  };
  for (const profile of PROFILES) {
    const product = productOf(toSchemaOrg(doc, { profile }));
    assert.equal(product.offers, undefined, profile);
    assert.equal(propOf(product, "rs:lifecycleStatus").value, "Announced");
    assert.ok(
      !JSON.stringify(product).includes("https://schema.org/PreOrder"),
      "kein PreOrder-Markup",
    );
  }
});

check("ISO-Regionen → eligibleRegion, PLZ-Präfixe → rs:…serviceRegions", () => {
  const iso = offersOf(toSchemaOrg(gausium))[0];
  assert.deepStrictEqual(iso.eligibleRegion, ["DE", "AT"]);
  assert.equal(propOf(iso, "rs:offer.availability.serviceRegions"), undefined);

  const doc = {
    ...nexaro,
    offers: [
      {
        ...nexaro.offers[0],
        availability: {
          status: "InStock",
          asOf: "2026-08-11T12:00:00Z",
          serviceRegions: ["DE", "506", "507"],
        },
      },
    ],
  };
  const mixed = offersOf(toSchemaOrg(doc))[0];
  assert.equal(mixed.eligibleRegion, "DE");
  assert.deepStrictEqual(propOf(mixed, "rs:offer.availability.serviceRegions").value, [
    "DE",
    "506",
    "507",
  ]);
});

console.log("\nProfil product-snippet:");

check("Kauf und Monatsrate landen nie im selben AggregateOffer", () => {
  const offers = offersOf(toSchemaOrg(gausium, { profile: "product-snippet" }));
  assert.equal(Array.isArray(offers), true);
  assert.equal(offers.length, 2);
  assert.equal(offers[0].name, "Kauf"); // Once zuerst
  assert.equal(offers[0].lowPrice, "38068.10");
  assert.equal(offers[1].name, "Robot-as-a-Service — Rate pro Monat");
  assert.equal(offers[1].lowPrice, "1416.10");
  for (const aggregate of offers) {
    assert.equal(aggregate["@type"], "AggregateOffer");
    assert.equal(aggregate.offerCount, 1);
  }
});

check("Kauf, Überlassung auf Zeit und Nutzungsabrechnung bleiben getrennt", () => {
  const doc = {
    ...gausium,
    offers: [
      ...gausium.offers,
      {
        offerId: "ppu-m2",
        offerType: "PayPerUse",
        unitPrice: { amount: "0.036", currency: "EUR", referenceQuantity: { value: 1, unit: "M2" } },
        currency: "EUR",
        vatRate: 19,
        billingPeriod: "PerSquareMeter",
        serviceScope: { level: "None" },
      },
      {
        offerId: "rent-monat",
        offerType: "Rent",
        priceCents: 149000,
        currency: "EUR",
        vatRate: 19,
        billingPeriod: "Month",
        minTermMonths: 6,
        serviceScope: { level: "None" },
      },
    ],
  };
  const aggregates = offersOf(toSchemaOrg(doc, { profile: "product-snippet" }));
  assert.deepStrictEqual(
    aggregates.map((a) => a.name),
    ["Kauf", "Robot-as-a-Service / Miete — Rate pro Monat", "Pay-per-Use — Preis je m²"],
  );
  assert.deepStrictEqual(
    aggregates.map((a) => [a.lowPrice, a.highPrice]),
    [
      ["38068.10", "38068.10"],
      ["1416.10", "1773.10"],
      ["0.04284", "0.04284"],
    ],
  );
  assert.equal(propOf(aggregates[2], "rs:offer.unitPrice.amount").value, "0.036");
  assert.equal(propOf(aggregates[2], "rs:offer.priceCents"), undefined);
});

check("nutzungsabhängige Angebote mit verschiedenen Bezugsgrößen mischen nicht", () => {
  const aggregates = offersOf(toSchemaOrg(payPerUse, { profile: "product-snippet" }));
  assert.equal(aggregates.length, 2);
  assert.deepStrictEqual(
    aggregates.map((a) => a.name),
    ["Pay-per-Use — Preis je m²", "Pay-per-Use — Preis je Stunde"],
  );
  assert.equal(aggregates[0].lowPrice, "0.04284");
  assert.equal(aggregates[1].lowPrice, "14.875");
});

check("merchant-listing erzeugt nie ein AggregateOffer", () => {
  for (const file of listingFiles) {
    const out = JSON.stringify(toSchemaOrg(readJson(EXAMPLES_DIR + file)));
    assert.ok(!out.includes("AggregateOffer"), file);
  }
});

check("gleiche Preisbasis wird zusammengefasst (low/high/offerCount)", () => {
  const doc = {
    ...nexaro,
    offers: [
      { ...nexaro.offers[0], priceCents: 6200 },
      { ...nexaro.offers[0], priceCents: 7900, minTermMonths: 36 },
    ],
  };
  const aggregate = offersOf(toSchemaOrg(doc, { profile: "product-snippet" }));
  assert.equal(Array.isArray(aggregate), false);
  assert.equal(aggregate.offerCount, 2);
  assert.equal(aggregate.lowPrice, "73.78"); // 62,00 × 1,19
  assert.equal(aggregate.highPrice, "94.01"); // 79,00 × 1,19
  assert.deepStrictEqual(propOf(aggregate, "rs:offer.priceCents").value, [6200, 7900]);
  assert.equal(propOf(aggregate, "rs:offer.minTermMonths"), undefined); // uneinheitlich
});

check("uneinheitliche Verfügbarkeit lässt availability weg", () => {
  const doc = {
    ...nexaro,
    offers: [
      {
        ...nexaro.offers[0],
        availability: { status: "InStock", asOf: "2026-08-11T12:00:00Z" },
      },
      {
        ...nexaro.offers[0],
        priceCents: 7900,
        availability: { status: "OutOfStock", asOf: "2026-08-11T12:00:00Z" },
      },
    ],
  };
  assert.equal(offersOf(toSchemaOrg(doc, { profile: "product-snippet" })).availability, undefined);
});

check("verschiedene Währungen werden getrennt aggregiert", () => {
  const doc = {
    ...nexaro,
    offers: [
      { ...nexaro.offers[0], currency: "EUR" },
      { ...nexaro.offers[0], currency: "CHF", vatRate: 8.1 },
    ],
  };
  const aggregates = offersOf(toSchemaOrg(doc, { profile: "product-snippet" }));
  assert.equal(aggregates.length, 2);
  assert.deepStrictEqual(
    aggregates.map((a) => a.priceCurrency).sort(),
    ["CHF", "EUR"],
  );
});

console.log("\nProdukt-Ebene:");

check("gtin/manufacturerSku/listingId → gtin/mpn/sku", () => {
  const doc = { ...gausium, gtin: "04012345678901", manufacturerSku: "S50PRO-ROLL" };
  const product = productOf(toSchemaOrg(doc));
  assert.equal(product.gtin, "04012345678901");
  assert.equal(product.mpn, "S50PRO-ROLL");
  assert.equal(product.sku, "demo-supplier-s50pro-001");
  assert.deepStrictEqual(product.brand, { "@type": "Brand", name: "Gausium" });
});

check("Bildmetadaten → ImageObject, Bilder ohne Metadaten bleiben URL-Strings", () => {
  const doc = {
    ...gausium,
    media: {
      images: [
        {
          url: "https://example-supplier.de/img/s50pro-1200x1200.jpg",
          type: "Product",
          widthPx: 1200,
          heightPx: 1200,
          altDe: "Scheuersaugroboter von vorn",
        },
        { url: "https://example-supplier.de/img/s50pro-2.jpg" },
      ],
      brochureUrl: "https://example-supplier.de/docs/s50pro.pdf",
    },
  };
  const product = productOf(toSchemaOrg(doc));
  assert.deepStrictEqual(product.image, [
    {
      "@type": "ImageObject",
      url: "https://example-supplier.de/img/s50pro-1200x1200.jpg",
      name: "Produktbild",
      caption: "Scheuersaugroboter von vorn",
      width: { "@type": "QuantitativeValue", value: 1200, unitCode: "E37", unitText: "px" },
      height: { "@type": "QuantitativeValue", value: 1200, unitCode: "E37", unitText: "px" },
    },
    "https://example-supplier.de/img/s50pro-2.jpg",
  ]);
  assert.equal(
    propOf(product, "rs:media.brochureUrl").value,
    "https://example-supplier.de/docs/s50pro.pdf",
  );
});

check("CE-Kennzeichnung nur als additionalProperty, nie als hasCertification", () => {
  for (const file of listingFiles) {
    const out = toSchemaOrg(readJson(EXAMPLES_DIR + file));
    assert.ok(!JSON.stringify(out).includes("hasCertification"), file);
  }
  const product = productOf(toSchemaOrg(gausium));
  assert.equal(propOf(product, "rs:compliance.ceMarking").value, true);
});

check("Mehrwertige Felder als Array, einwertige als Skalar", () => {
  const product = productOf(toSchemaOrg(gausium));
  assert.deepStrictEqual(propOf(product, "rs:capabilities.navigationTypes").value, [
    "Lidar2D",
    "DepthCamera",
  ]);
  assert.equal(propOf(product, "rs:compliance.standards").value, "EN IEC 63327:2021");
});

check("weightKg wird Product.weight und nicht zusätzlich rs:capabilities.weightKg", () => {
  const product = productOf(toSchemaOrg(gausium));
  assert.deepStrictEqual(product.weight, {
    "@type": "QuantitativeValue",
    value: 148,
    unitCode: "KGM",
  });
  assert.equal(propOf(product, "rs:capabilities.weightKg"), undefined);
});

check("Klassifikationen mit Systempräfix und Release im Namen", () => {
  const props = productOf(toSchemaOrg(gausium)).additionalProperty.filter((p) =>
    p.propertyID.startsWith("rs:classifications."),
  );
  assert.deepStrictEqual(props, [
    { "@type": "PropertyValue", propertyID: "rs:classifications.cpv", name: "CPV 2008", value: "90900000-6" },
    { "@type": "PropertyValue", propertyID: "rs:classifications.cpv", name: "CPV 2008", value: "42995000-7" },
  ]);
});

check("summary/description: description gewinnt, summary wird disambiguating", () => {
  const both = productOf(toSchemaOrg(neura));
  assert.equal(both.description, neura.description);
  assert.equal(both.disambiguatingDescription, neura.summary);
  const onlySummary = productOf(toSchemaOrg(gausium));
  assert.equal(onlySummary.description, gausium.summary);
  assert.equal(onlySummary.disambiguatingDescription, undefined);
});

check("interne Herkunftsfelder erscheinen nicht im Markup", () => {
  const doc = { ...gausium, sourceSystem: "demo-erp", createdAt: "2026-07-01T00:00:00Z", extensions: { intern: 1 } };
  const out = JSON.stringify(toSchemaOrg(doc));
  for (const needle of ["sourceSystem", "demo-erp", "createdAt", "extensions", "schemaVersion", "provenance", "OperatorReport"]) {
    assert.ok(!out.includes(needle), needle);
  }
});

check("dauerhafte Identitäten: productId → productID, supplierId → identifier, Rest rs:", () => {
  const product = productOf(toSchemaOrg(gausium));
  const org = toSchemaOrg(gausium)["@graph"][0];
  assert.equal(product.productID, gausium.productId);
  assert.equal(product.sku, gausium.listingId);
  assert.equal(org.identifier, gausium.supplier.supplierId);
  assert.equal(propOf(product, "rs:variantId").value, gausium.variantId);
  assert.equal(propOf(product, "rs:revision").value, 7);
  assert.equal(propOf(offersOf(toSchemaOrg(gausium))[0], "rs:offer.offerId").value, "raas-24m-full");
});

check("Supplier ohne Website bekommt einen Blank-Node statt erfundener URL", () => {
  const doc = { ...gausium, supplier: { ...gausium.supplier, website: undefined } };
  const out = toSchemaOrg(doc);
  assert.equal(out["@graph"][0]["@id"], "_:supplier");
  assert.equal(offersOf(out)[0].seller["@id"], "_:supplier");
});

check("location aus einem anderen Land wandert nicht in die Anbieteradresse", () => {
  const doc = { ...gausium, location: { countryCode: "AT", postalCode: "1010", city: "Wien" } };
  const out = toSchemaOrg(doc);
  assert.deepStrictEqual(out["@graph"][0].address, {
    "@type": "PostalAddress",
    addressCountry: "DE",
  });
  assert.equal(propOf(productOf(out), "rs:location.city").value, "Wien");
});

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen`);
process.exit(failed > 0 ? 1 : 0);
