const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const { Client } = require("pg");

const apiDir = path.resolve(__dirname, "..");
const files = [
  "test/schema-migration.e2e.js",
  "test/idea-votes.e2e.js",
  "test/auth-guard.e2e.js"
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (fs.existsSync(path.join(__dirname, "app.e2e-spec.ts"))) {
  fail("app.e2e-spec.ts is still present");
}

for (const file of files) {
  const text = fs.readFileSync(path.join(apiDir, file), "utf8");
  if (text.includes("Hello World")) {
    fail(file + " still expects Hello World");
  }
}

async function requireDatabase() {
  const client = new Client({
    host: process.env.POSTGRES_HOST || "127.0.0.1",
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER || "ideas",
    password: process.env.POSTGRES_PASSWORD || "ideas",
    database: "postgres",
    connectionTimeoutMillis: 3000
  });
  try {
    await client.connect();
    await client.end();
  } catch (error) {
    fail("e2e requires Postgres and did not skip: " + error.message);
  }
}

function runFile(file) {
  const result = spawnSync(
    process.execPath,
    ["-r", "ts-node/register", "-r", "tsconfig-paths/register", file],
    { cwd: apiDir, stdio: "inherit", env: process.env }
  );
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

requireDatabase()
  .then(() => {
    for (const file of files) {
      runFile(file);
    }
    console.log("e2e suite passed");
  })
  .catch((error) => {
    fail(error.message);
  });
