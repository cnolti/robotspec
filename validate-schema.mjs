import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFileSync, readdirSync } from "fs";

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

const v01 = loadSchema("./schema/robotspec-v0.1.schema.json");
const v02 = loadSchema("./schema/robotspec-v0.2.schema.json");
const feedSchema = loadSchema("./schema/robotspec-feed-0.2.schema.json");

let validateV02, validateFeed;
try {
  ajv.compile(v01); // v0.1 bleibt kompilierbar (Bestandssysteme)
  validateV02 = ajv.compile(v02); // registriert $id für den Feed-$ref
  validateFeed = ajv.compile(feedSchema);
  console.log("✓ Schemata kompilieren (JSON Schema Draft 2020-12)");
} catch (e) {
  console.error("✗ Schema kompiliert NICHT:", e.message);
  process.exit(1);
}

const examplesDir = "./schema/examples";
let passed = 0,
  failed = 0;
for (const file of readdirSync(examplesDir).filter((f) => f.endsWith(".json"))) {
  const data = JSON.parse(readFileSync(`${examplesDir}/${file}`, "utf8"));
  // Feed-Beispiele gegen das Feed-Schema, Listings gegen das Listing-Schema
  const validate = file.startsWith("feed-") ? validateFeed : validateV02;
  if (validate(data)) {
    console.log(`  ✓ ${file}`);
    passed++;
  } else {
    console.log(`  ✗ ${file}:`);
    for (const err of validate.errors.slice(0, 6)) {
      console.log(`    - ${err.instancePath || "/"}: ${err.message}`);
    }
    failed++;
  }
}

// Negativtest der Announced-Regel: Announced + offers MUSS scheitern
const announced = JSON.parse(
  readFileSync(`${examplesDir}/neura-4ne1-announced-specsheet.json`, "utf8"),
);
announced.offers = [
  {
    offerType: "Purchase",
    priceCents: 9800000,
    currency: "EUR",
    vatRate: 19,
    serviceScope: { level: "None" },
  },
];
if (validateV02(announced)) {
  console.log("  ✗ Negativtest: Announced+offers wurde fälschlich akzeptiert");
  failed++;
} else {
  console.log("  ✓ Negativtest: Announced+offers wird korrekt abgelehnt");
  passed++;
}

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen`);
process.exit(failed > 0 ? 1 : 0);
