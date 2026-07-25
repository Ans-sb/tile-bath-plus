import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const envFileArg = readArg("--env-file");
const allowPlaceholders = args.includes("--allow-placeholders");
const envPath = path.resolve(root, envFileArg || ".env.vps");
const errors = [];
const warnings = [];
const checks = [];

function readArg(name) {
  const index = args.indexOf(name);
  if (index >= 0 && args[index + 1]) return args[index + 1];
  const inline = args.find((item) => item.startsWith(`${name}=`));
  return inline ? inline.slice(name.length + 1) : "";
}

function parseEnv(text) {
  const result = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[match[1]] = value;
  }
  return result;
}

function looksPlaceholder(value) {
  return !value || /replace|example\.com|replace-me|replace_me/i.test(value);
}

function checkJson(relativePath, validator) {
  const target = path.join(root, relativePath);
  try {
    const parsed = JSON.parse(fs.readFileSync(target, "utf8"));
    if (!validator(parsed)) throw new Error("unexpected JSON shape");
    checks.push(`${relativePath}: valid`);
  } catch (error) {
    errors.push(`${relativePath}: ${error.message}`);
  }
}

function checkWritable(target) {
  try {
    fs.mkdirSync(target, { recursive: true });
    const probe = path.join(target, `.vps-write-test-${process.pid}`);
    fs.writeFileSync(probe, "ok", "utf8");
    fs.rmSync(probe, { force: true });
    checks.push(`${path.relative(root, target) || "."}: writable`);
  } catch (error) {
    errors.push(`${target}: not writable (${error.message})`);
  }
}

if (!fs.existsSync(envPath)) {
  errors.push(`environment file not found: ${envPath}`);
}

const env = fs.existsSync(envPath) ? parseEnv(fs.readFileSync(envPath, "utf8")) : {};
const required = [
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PUBLIC_SITE_URL",
  "OPENAI_API_KEY"
];

for (const key of required) {
  if (!(key in env)) {
    errors.push(`${key}: missing`);
  } else if (!allowPlaceholders && looksPlaceholder(env[key])) {
    errors.push(`${key}: empty or placeholder`);
  }
}

if (!allowPlaceholders && env.ADMIN_PASSWORD && env.ADMIN_PASSWORD.length < 16) {
  errors.push("ADMIN_PASSWORD: use at least 16 characters");
}

for (const key of ["SUPABASE_URL", "PUBLIC_SITE_URL"]) {
  if (!allowPlaceholders && env[key] && !/^https:\/\//i.test(env[key])) {
    errors.push(`${key}: HTTPS URL required`);
  }
}

const vendorCredentialKeys = Object.keys(env).filter((key) =>
  /(?:TILE114|SGCERA|HWASHIN|THEGOLD|USONG).*(?:PASSWORD|USER_ID)/i.test(key)
);
if (vendorCredentialKeys.length) {
  warnings.push(
    `supplier credentials detected (${vendorCredentialKeys.join(", ")}); keep them off the public VPS unless a manual task requires them`
  );
}

checkJson("data/products.json", Array.isArray);
checkJson("data/product-images.json", (value) => Array.isArray(value) || (value && typeof value === "object"));
checkJson("data/tile-brand-rules.json", (value) => value && typeof value === "object");
checkWritable(path.join(root, "data"));
checkWritable(path.join(root, "uploads"));
checkWritable(path.join(root, "outputs"));

if (typeof fs.statfsSync === "function") {
  const stats = fs.statfsSync(root);
  const freeBytes = Number(stats.bavail) * Number(stats.bsize);
  const freeGb = freeBytes / (1024 ** 3);
  checks.push(`free disk: ${freeGb.toFixed(1)} GiB`);
  if (freeGb < 10) warnings.push("less than 10 GiB free; production VPS should keep at least 20 GiB free");
}

console.log("JAJAEGO VPS preflight");
for (const item of checks) console.log(`  OK   ${item}`);
for (const item of warnings) console.warn(`  WARN ${item}`);
for (const item of errors) console.error(`  FAIL ${item}`);
console.log(`Result: ${errors.length ? "FAILED" : "READY"} (${errors.length} error(s), ${warnings.length} warning(s))`);

process.exitCode = errors.length ? 1 : 0;
