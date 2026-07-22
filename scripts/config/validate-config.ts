import fs from "fs";
import path from "path";
import { Validator } from "jsonschema";

const ROOT = process.cwd();
const schemaDir = path.join(ROOT, "config", "schema");

const v = new Validator();

type SchemaMap = Record<string, any>;

function loadSchemas(): SchemaMap {
  const schemas: SchemaMap = {};
  fs.readdirSync(schemaDir)
    .filter((f) => f.endsWith(".json"))
    .forEach((file) => {
      const schema = JSON.parse(fs.readFileSync(path.join(schemaDir, file), "utf-8"));
      schemas[schema.title || file] = schema;
      v.addSchema(schema, `/${schema.title || file}`);
    });
  return schemas;
}

function validateAll() {
  const schemas = loadSchemas();
  let errors = 0;

  const validateDir = (dir: string, schemaKey: string) => {
    if (!schemas[schemaKey]) {
      console.error(`[SCHEMA MANQUANT] "${schemaKey}" introuvable parmi : ${Object.keys(schemas).join(", ")}`);
      errors += 1;
      return;
    }
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
    files.forEach((file) => {
      const data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8"));
      // Certains fichiers (actions, obligations) sont des tableaux d'objets —
      // on valide chaque élément individuellement plutôt que le tableau entier.
      const items = Array.isArray(data) ? data : [data];
      items.forEach((item, i) => {
        const result = v.validate(item, schemas[schemaKey]);
        if (result.errors.length) {
          errors += result.errors.length;
          const label = Array.isArray(data) ? `${dir}/${file} [item ${i}]` : `${dir}/${file}`;
          console.error(`[INVALID] ${label}`);
          result.errors.forEach((e) => console.error(`  - ${e.stack}`));
        }
      });
    });
  };

  validateDir(path.join(ROOT, "config", "risks"), "Risk");
  validateDir(path.join(ROOT, "config", "obligations"), "Obligation");
  validateDir(path.join(ROOT, "config", "naf"), "NAFProfile");
  validateDir(path.join(ROOT, "config", "actions"), "Action");

  if (errors > 0) {
    console.error(`Validation failed with ${errors} error(s).`);
    process.exit(1);
  }
  console.log("Validation OK");
}

validateAll();
