const { spawn } = require("child_process");
const path = require("path");

const { Client } = require("pg");
const jwt = require("jsonwebtoken");

const apiDir = path.resolve(__dirname, "..");
const database = `ideas_auth_${process.pid}_${Date.now()}`;

process.env.POSTGRES_HOST = process.env.POSTGRES_HOST || "127.0.0.1";
process.env.POSTGRES_PORT = process.env.POSTGRES_PORT || "5432";
process.env.POSTGRES_USER = process.env.POSTGRES_USER || "ideas";
process.env.POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || "ideas";
process.env.POSTGRES_DB = database;
process.env.JWT_SECRET = process.env.JWT_SECRET || "auth-e2e";
process.env.SERVER_PORT = process.env.SERVER_PORT || "18773";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function pgConfig(name) {
  return {
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: name
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
  if (!child || child.exitCode !== null || child.signalCode !== null) {
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

async function request(method, urlPath, body, token) {
  const headers = {};
  if (body) {
    headers["content-type"] = "application/json";
  }
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  const response = await fetch(`http://127.0.0.1:${process.env.SERVER_PORT}${urlPath}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (error) {
    json = null;
  }
  return { status: response.status, text, json };
}

function messageOf(payload) {
  if (!payload) {
    return "";
  }
  if (typeof payload.message === "string") {
    return payload.message;
  }
  return JSON.stringify(payload);
}

async function main() {
  await createDatabase(database);
  const app = startApp();
  try {
    await app.ready;
    const registered = await request("POST", "/auth/register", {
      username: "auth-user",
      password: "secret"
    });
    assert(registered.status === 201, `register ${registered.status} ${registered.text}`);
    const token = registered.json.token;
    assert(typeof token === "string", "register did not return a token");

    const wrong = await request("POST", "/auth/login", {
      username: "auth-user",
      password: "wrong-password"
    });
    assert(wrong.status === 400, `wrong password ${wrong.status} ${wrong.text}`);
    assert(!wrong.json || !wrong.json.token, "wrong password returned a token");

    const login = await request("POST", "/auth/login", {
      username: "auth-user",
      password: "secret"
    });
    assert(login.json && typeof login.json.token === "string", `login ${login.status} ${login.text}`);
    const me = await request("GET", "/auth/me", undefined, login.json.token);
    assert(me.status === 200, `me ${me.status} ${me.text}`);
    assert(me.json.username === "auth-user", JSON.stringify(me.json));

    const missingHeader = await request("GET", "/auth/me");
    assert(missingHeader.status === 403, `missing header ${missingHeader.status} ${missingHeader.text}`);

    const badSignature = jwt.sign(
      { id: registered.json.id, username: "auth-user" },
      "other-secret",
      { expiresIn: "1h" }
    );
    const forged = await request("GET", "/auth/me", undefined, badSignature);
    assert(forged.status === 403, `bad signature ${forged.status} ${forged.text}`);
    assert(!messageOf(forged.json).includes(badSignature), "403 body contains the token");

    const expired = jwt.sign(
      {
        id: registered.json.id,
        username: "auth-user",
        exp: Math.floor(Date.now() / 1000) - 60
      },
      process.env.JWT_SECRET
    );
    const expiredResponse = await request("GET", "/auth/me", undefined, expired);
    assert(expiredResponse.status === 401, `expired ${expiredResponse.status} ${expiredResponse.text}`);
    assert(messageOf(expiredResponse.json).toLowerCase().includes("expired"), messageOf(expiredResponse.json));

    const client = new Client(pgConfig(database));
    await client.connect();
    await client.query(`DELETE FROM "user" WHERE username = $1`, ["auth-user"]);
    await client.end();

    const deleted = await request("GET", "/auth/me", undefined, token);
    assert(deleted.status === 401, `deleted user ${deleted.status} ${deleted.text}`);
    assert(messageOf(deleted.json).includes("Unknown user"), messageOf(deleted.json));

    const stillUp = await request("GET", "/ideas?limit=1");
    assert(stillUp.status === 200, `follow-up ${stillUp.status} ${stillUp.text}`);

    const graphql = await request("POST", "/graphql", {
      query: "mutation { createIdea(data: { idea: \"gone\", description: \"gone\" }) { id } }"
    }, token);
    assert(graphql.status === 200, `graphql status ${graphql.status} ${graphql.text}`);
    assert(graphql.json && Array.isArray(graphql.json.errors) && graphql.json.errors.length > 0,
      `graphql did not reject: ${graphql.text}`);
    const graphqlMessage = JSON.stringify(graphql.json.errors);
    assert(/unknown user|unauthorized/i.test(graphqlMessage), graphqlMessage);

    const afterGraphql = await request("GET", "/ideas?limit=1");
    assert(afterGraphql.status === 200, `after graphql ${afterGraphql.status} ${afterGraphql.text}`);

    const log = app.readLog();
    assert(!log.includes(token), "log contains the bearer token");
    assert(!log.includes(login.json.token), "log contains the login bearer token");
    assert(!log.includes(expired), "log contains the expired bearer token");
    console.log("auth guard: 401 missing user, 401 expired, 403 bad signature, no bearer in the log");
  } finally {
    await stopApp(app.child);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await dropDatabase(database).catch(() => undefined);
  });
