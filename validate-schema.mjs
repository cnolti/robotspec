import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFileSync, readdirSync } from "fs";

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const schemaPath = "./schema/robotspec-v0.1.schema.json";
let schema;
try {
  schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  console.log("✓ Schema ist valides JSON");
} catch (e) {
  console.error("✗ Kein valides JSON:", e.message);
  process.exit(1);
}

let validate;
try {
  validate = ajv.compile(schema);
  console.log("✓ Schema kompiliert (JSON Schema Draft 2020-12)");
} catch (e) {
  console.error("✗ Schema kompiliert NICHT:", e.message);
  process.exit(1);
}

const examplesDir = "./schema/examples";
let passed = 0,
  failed = 0;
for (const file of readdirSync(examplesDir).filter((f) => f.endsWith(".json"))) {
  const data = JSON.parse(readFileSync(`${examplesDir}/${file}`, "utf8"));
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
console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen`);
process.exit(failed > 0 ? 1 : 0);
