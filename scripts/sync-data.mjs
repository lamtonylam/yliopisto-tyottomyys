import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname } from "node:path";

const source = "data.json";
const target = "public/data.json";

if (!existsSync(source)) {
  console.error(`[sync-data] Missing ${source}. Place the statistics file in the project root.`);
  process.exit(1);
}

mkdirSync(dirname(target), { recursive: true });

const needsCopy =
  !existsSync(target) ||
  statSync(source).size !== statSync(target).size ||
  statSync(source).mtimeMs > statSync(target).mtimeMs;

if (needsCopy) {
  copyFileSync(source, target);
  console.log(`[sync-data] Copied ${source} -> ${target}`);
}
