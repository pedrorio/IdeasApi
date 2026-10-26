const { spawn } = require("child_process");
const path = require("path");

const { Client } = require("pg");
const { DataSource } = require("typeorm");

const { UserEntity } = require("../src/user/user.entity");
const { IdeaEntity } = require("../src/idea/idea.entity");
const { CommentEntity } = require("../src/comment/comment.entity");
const { VoteEntity } = require("../src/idea/vote/vote.entity");

const apiDir = path.resolve(__dirname, "..");
const migrationDatabase = `ideas_mig_${process.pid}_${Date.now()}`;
const syncDatabase = `ideas_sync_${process.pid}_${Date.now()}`;

process.env.POSTGRES_HOST = process.env.POSTGRES_HOST || "127.0.0.1";
process.env.POSTGRES_PORT = process.env.POSTGRES_PORT || "5432";
process.env.POSTGRES_USER = process.env.POSTGRES_USER || "ideas";
process.env.POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || "ideas";
process.env.POSTGRES_DB = migrationDatabase;
process.env.JWT_SECRET = process.env.JWT_SECRET || "migration-e2e";
process.env.SERVER_PORT = process.env.SERVER_PORT || "18765";

const [connection] = require("../ormconfig");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function pgConfig(database) {
  return {
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database
  };
}

async function createDatabase(name) {
  const client = new Client(pgConfig("postgres"));
  await client.connect();
  await client.query(`CREATE DATABASE "${name}"`);
  await client.end();
}

async function dropDatabase(name) {
  const client = new Client(pgConfig("postgres"));
  await client.connect();
  await client.query(
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
    [name]
  );
  await client.query(`DROP DATABASE IF EXISTS "${name}"`);
  await client.end();
}

async function snapshot(database) {
  const client = new Client(pgConfig(database));
  await client.connect();
  const columns = await client.query(
    `SELECT table_name, column_name, data_type, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name <> 'migrations'
     ORDER BY table_name, column_name`
  );
  const constraints = await client.query(
    `SELECT conrelid::regclass::text AS table_name, conname, pg_get_constraintdef(oid) AS definition
     FROM pg_constraint
     WHERE connamespace = 'public'::regnamespace
       AND conrelid::regclass::text NOT IN ('migrations', '"migrations"')
     ORDER BY 1, 2`
  );
  const indexes = await client.query(
    `SELECT tablename, indexname, indexdef
     FROM pg_indexes
     WHERE schemaname = 'public' AND tablename <> 'migrations'
     ORDER BY tablename, indexname`
  );
  await client.end();
  return JSON.stringify({
    columns: columns.rows,
    constraints: constraints.rows,
    indexes: indexes.rows
  }, null, 2);
}

function startApp() {
  const child = spawn(
    process.execPath,
    ["-r", "ts-node/register", "-r", "tsconfig-paths/register", "src/main.ts"],
    {
      cwd: apiDir,
      env: process.env,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
  let log = "";
  child.stdout.on("data", (chunk) => {
    log += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    log += chunk.toString();
  });
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("app did not listen\n" + log.slice(-4000)));
    }, 60000);
    const check = () => {
      if (log.includes("Server running on port")) {
        clearTimeout(timer);
        child.removeListener("exit", onExit);
        resolve(log);
      }
    };
    const onExit = (code) => {
      clearTimeout(timer);
      reject(new Error("app exited " + code + "\n" + log.slice(-4000)));
    };
    child.stdout.on("data", check);
    child.stderr.on("data", check);
    child.on("exit", onExit);
  });
  return {
    child,
    ready,
    readLog: () => log
  };
}

async function stopApp(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch (error) {
        child.kill("SIGKILL");
      }
      resolve();
    }, 5000);
    child.on("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch (error) {
      child.kill("SIGTERM");
    }
  });
}

async function requestJson(method, urlPath, body) {
  const response = await fetch(`http://127.0.0.1:${process.env.SERVER_PORT}${urlPath}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  return { status: response.status, text };
}

async function usersNamed(username) {
  const listed = await requestJson("GET", "/users");
  assert(listed.status === 200, "GET /users returned " + listed.status + " " + listed.text);
  const users = JSON.parse(listed.text);
  return users.filter((user) => user.username === username);
}

async function synchronizeEmptyDatabase() {
  const sync = new DataSource({
    type: "postgres",
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: syncDatabase,
    synchronize: true,
    dropSchema: true,
    logging: false,
    entities: [UserEntity, IdeaEntity, CommentEntity, VoteEntity]
  });
  await sync.initialize();
  await sync.destroy();
}

async function main() {
  assert(connection.synchronize === false, "synchronize is not false");
  assert(connection.dropSchema === false, "dropSchema is not false");
  assert(connection.migrationsRun === true, "migrationsRun is not true");

  await createDatabase(migrationDatabase);
  await createDatabase(syncDatabase);

  const first = startApp();
  try {
    await first.ready;
    const created = await requestJson("POST", "/auth/register", {
      username: "kept-user",
      password: "secret"
    });
    assert(created.status === 201, "register returned " + created.status + " " + created.text);
    assert((await usersNamed("kept-user")).length === 1, "registered user was not listed");
  } finally {
    await stopApp(first.child);
  }

  const migrated = await snapshot(migrationDatabase);
  await synchronizeEmptyDatabase();
  const synced = await snapshot(syncDatabase);
  assert(migrated === synced, "migrated schema does not match synchronize\n" + migrated + "\n---\n" + synced);

  const second = startApp();
  try {
    await second.ready;
    assert(second.readLog().includes("Server running on port"), "second boot did not listen");
    const kept = await usersNamed("kept-user");
    assert(kept.length === 1, "row missing after restart");
    console.log("kept user " + kept[0].id + " " + kept[0].username);
  } finally {
    await stopApp(second.child);
  }

  console.log("schema match: tables, columns, constraints, and indexes");
  console.log("synchronize false, dropSchema false, migrationsRun true");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await dropDatabase(migrationDatabase).catch(() => undefined);
    await dropDatabase(syncDatabase).catch(() => undefined);
  });
