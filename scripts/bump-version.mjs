#!/usr/bin/env node
// Bump the project version in package.json, src-tauri/tauri.conf.json,
// and src-tauri/Cargo.toml so all three stay in sync.
//
// Usage:
//   node scripts/bump-version.mjs <new-version>
//   node scripts/bump-version.mjs 0.2.0

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const newVersion = process.argv[2];
if (!newVersion || !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(newVersion)) {
  console.error("Usage: node scripts/bump-version.mjs <semver>");
  console.error("Example: node scripts/bump-version.mjs 0.2.0");
  process.exit(1);
}

function updateJson(path, mutate) {
  const file = join(root, path);
  const json = JSON.parse(readFileSync(file, "utf8"));
  mutate(json);
  writeFileSync(file, JSON.stringify(json, null, 2) + "\n");
  console.log(`  ${path}`);
}

function updateCargoToml(path) {
  const file = join(root, path);
  const text = readFileSync(file, "utf8");
  const re = /^(version\s*=\s*)"[^"]+"/m;
  if (!re.test(text)) {
    throw new Error(`Could not find version field in ${path}`);
  }
  writeFileSync(file, text.replace(re, `$1"${newVersion}"`));
  console.log(`  ${path}`);
}

console.log(`Bumping to ${newVersion}:`);
updateJson("package.json", (j) => {
  j.version = newVersion;
});
updateJson("src-tauri/tauri.conf.json", (j) => {
  j.version = newVersion;
});
updateCargoToml("src-tauri/Cargo.toml");

console.log("\nNext steps:");
console.log(`  git commit -am "Release v${newVersion}"`);
console.log(`  git tag v${newVersion}`);
console.log(`  git push && git push --tags`);
