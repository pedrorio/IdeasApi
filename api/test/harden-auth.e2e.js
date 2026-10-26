const { spawn } = require("child_process");
const path = require("path");

const { Client } = require("pg");
const jwt = require("jsonwebtoken");

const apiDir = path.resolve(__dirname, "..");
const database = `ideas_harden_${process.pid}_${Date.now()}`;
const secret = "harden-auth-e2e-secret-32-bytes!";
const port = "18774";
const developmentPort = "18775";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function pgConfig(name) {
  return {
    host: process.env.POSTGRES_HOST || "127.0.0.1",
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER || "ideas",
    password: process.env.POSTGRES_PASSWORD || "ideas",
    database: name
  };
}

function childEnv(overrides) {
  const env = {
    ...process.env,
    POSTGRES_HOST: process.env.POSTGRES_HOST || "127.0.0.1",
    POSTGRES_PORT: process.env.POSTGRES_PORT || "5432",
    POSTGRES_USER: process.env.POSTGRES_USER || "ideas",
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || "ideas",
    POSTGRES_DB: database,
    JWT_SECRET: secret
  };
  delete env.NODE_ENV;
  for (const key of Object.keys(overrides)) {
    if (overrides[key] === undefined) {
      delete env[key];
    } else {
      env[key] = overrides[key];
    }
  }
  return env;
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

function spawnApp(env) {
  return spawn(
    process.execPath,
    ["-r", "ts-node/register", "-r", "tsconfig-paths/register", "src/main.ts"],
    {
      cwd: apiDir,
      env,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
}

function collect(child) {
  let log = "";
  child.stdout.on("data", (chunk) => {
    log += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    log += chunk.toString();
  });
  return {
    readLog: () => log
  };
}

function startApp(env) {
  const child = spawnApp(env);
  const output = collect(child);
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("app did not listen\n" + output.readLog().slice(-4000)));
    }, 60000);
    const check = () => {
      if (output.readLog().includes("Server running on port")) {
        clearTimeout(timer);
        child.removeListener("exit", onExit);
        resolve(output.readLog());
      }
    };
    const onExit = (code) => {
      clearTimeout(timer);
      reject(new Error("app exited " + code + "\n" + output.readLog().slice(-4000)));
    };
    child.stdout.on("data", check);
    child.stderr.on("data", check);
    child.on("exit", onExit);
  });
  return { child, ready, readLog: output.readLog };
}

function runUntilExit(env) {
  const child = spawn(
    process.execPath,
    ["-r", "ts-node/register", "-r", "tsconfig-paths/register", "src/main.ts"],
    {
      cwd: apiDir,
      env,
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
  const output = collect(child);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve({ code: null, log: output.readLog() });
    }, 60000);
    child.on("exit", (code) => {
      clearTimeout(timer);
      resolve({ code, log: output.readLog() });
    });
  });
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

async function request(serverPort, method, urlPath, body, token) {
  const headers = {};
  if (body) {
    headers["content-type"] = "application/json";
  }
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  const response = await fetch(`http://127.0.0.1:${serverPort}${urlPath}`, {
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

function hasProperty(value, key) {
  if (!value || typeof value !== "object") {
    return false;
  }
  if (Object.prototype.hasOwnProperty.call(value, key)) {
    return true;
  }
  const entries = Array.isArray(value) ? value : Object.values(value);
  return entries.some((entry) => hasProperty(entry, key));
}

function errorShape(payload) {
  const error = payload && payload.errors && payload.errors[0];
  return {
    message: error && error.message,
    code: error && error.extensions && error.extensions.code
  };
}

function noneToken(username) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ id: "1", username })).toString("base64url");
  return `${header}.${body}.`;
}

async function assertBootRefuses(jwtSecret, label) {
  const result = await runUntilExit(childEnv({
    JWT_SECRET: jwtSecret,
    SERVER_PORT: "18770"
  }));
  assert(result.code !== 0 && result.code !== null, `${label} exited ${result.code}\n${result.log.slice(-2000)}`);
  assert(!result.log.includes("Server running"), `${label} listened\n${result.log.slice(-2000)}`);
}

async function main() {
  await assertBootRefuses(undefined, "missing secret");
  await assertBootRefuses("", "empty secret");
  await assertBootRefuses("a".repeat(31), "31-byte secret");

  await createDatabase(database);
  const app = startApp(childEnv({ SERVER_PORT: port }));
  const devApp = { child: null };
  try {
    await app.ready;
    assert(app.readLog().includes("Server running on port"), "32-byte secret did not listen");

    const empty = await request(port, "POST", "/auth/register", {});
    assert(empty.status === 400, `empty register ${empty.status} ${empty.text}`);
    assert(empty.text.toLowerCase().includes("no body"), empty.text);

    const extraLogin = await request(port, "POST", "/auth/login", {
      username: "nobody",
      password: "secret",
      id: "client-id"
    });
    assert(extraLogin.status === 400, `extra login ${extraLogin.status} ${extraLogin.text}`);
    assert(!extraLogin.json || !extraLogin.json.token, "extra login returned a token");

    const registerBody = { username: "victim", password: "victim-pass" };
    const victim = await request(port, "POST", "/auth/register", registerBody);
    assert(victim.status === 201, `register ${victim.status} ${victim.text}`);
    const victimId = victim.json.id;
    const victimToken = victim.json.token;
    const header = JSON.parse(Buffer.from(victimToken.split(".")[0], "base64url").toString());
    assert(header.alg === "HS256", `token alg ${header.alg}`);

    const client = new Client(pgConfig(database));
    await client.connect();
    const stored = await client.query(`SELECT id, username, password FROM "user" WHERE id = $1`, [victimId]);
    assert(stored.rows[0].password !== "victim-pass", "password was stored in plaintext");
    assert(stored.rows[0].password.startsWith("$2"), stored.rows[0].password);
    assert(stored.rows[0].id === victimId, "stored id was not the response id");
    assert(stored.rows[0].id !== registerBody.username && stored.rows[0].id !== registerBody.password,
      "stored id came from the request body");

    const takeover = await request(port, "POST", "/auth/register", {
      id: victimId,
      username: "attacker-name",
      password: "x"
    });
    assert(takeover.status === 400, `takeover ${takeover.status} ${takeover.text}`);
    const afterTakeover = await client.query(`SELECT username, password FROM "user" WHERE id = $1`, [victimId]);
    assert(afterTakeover.rows[0].username === stored.rows[0].username, "victim username changed");
    assert(afterTakeover.rows[0].password === stored.rows[0].password, "victim password changed");
    const attacker = await client.query(`SELECT id FROM "user" WHERE username = $1`, ["attacker-name"]);
    assert(attacker.rowCount === 0, "attacker user was created");
    await client.end();

    const attackerUser = await request(port, "POST", "/auth/register", {
      username: "attacker",
      password: "attacker-pass"
    });
    assert(attackerUser.status === 201, `attacker register ${attackerUser.status} ${attackerUser.text}`);
    const attackerToken = attackerUser.json.token;

    const created = await request(port, "POST", "/ideas", {
      idea: "original",
      description: "original-description"
    }, victimToken);
    assert(created.status === 201, `create idea ${created.status} ${created.text}`);
    const ideaId = created.json.id;
    assert(created.json.author.id === victimId, `author ${JSON.stringify(created.json.author)}`);

    const hijack = await request(port, "POST", "/ideas", {
      id: ideaId,
      idea: "hijacked",
      description: "hijacked",
      author: { id: attackerUser.json.id }
    }, attackerToken);
    assert(hijack.status === 400, `hijack ${hijack.status} ${hijack.text}`);
    const afterHijack = await request(port, "GET", `/ideas/${ideaId}`);
    assert(afterHijack.json.idea === "original", JSON.stringify(afterHijack.json));
    assert(afterHijack.json.author.id === victimId, JSON.stringify(afterHijack.json.author));

    const reassign = await request(port, "PATCH", `/ideas/${ideaId}`, {
      idea: "original",
      description: "original-description",
      author: { id: attackerUser.json.id }
    }, victimToken);
    assert(reassign.status === 400, `reassign ${reassign.status} ${reassign.text}`);
    const afterReassign = await request(port, "GET", `/ideas/${ideaId}`);
    assert(afterReassign.json.author.id === victimId, JSON.stringify(afterReassign.json.author));

    const updated = await request(port, "PATCH", `/ideas/${ideaId}`, {
      idea: "original",
      description: "updated-description"
    }, victimToken);
    assert(updated.status === 200, `owner update ${updated.status} ${updated.text}`);
    const afterUpdate = await request(port, "GET", `/ideas/${ideaId}`);
    assert(afterUpdate.json.description === "updated-description", JSON.stringify(afterUpdate.json));
    assert(afterUpdate.json.author.id === victimId, JSON.stringify(afterUpdate.json.author));

    const stolen = await request(port, "PATCH", `/ideas/${ideaId}`, {
      idea: "stolen",
      description: "stolen"
    }, attackerToken);
    assert(stolen.status === 401, `non-owner update ${stolen.status} ${stolen.text}`);
    const afterStolen = await request(port, "GET", `/ideas/${ideaId}`);
    assert(afterStolen.json.idea === "original", JSON.stringify(afterStolen.json));
    assert(afterStolen.json.author.id === victimId, JSON.stringify(afterStolen.json.author));

    const missing = await request(port, "PATCH", "/ideas/00000000-0000-4000-8000-000000000000", {
      idea: "missing",
      description: "missing"
    }, victimToken);
    assert(missing.status === 404, `missing idea ${missing.status} ${missing.text}`);

    const comment = await request(port, "POST", `/ideas/${ideaId}/comments`, {
      comment: "keep-me"
    }, victimToken);
    assert(comment.status === 201, `comment ${comment.status} ${comment.text}`);
    const commentId = comment.json.id;
    const commentPatch = await request(port, "PATCH", `/ideas/${ideaId}/comments/${commentId}`, {
      comment: "changed"
    }, attackerToken);
    assert(commentPatch.status === 401, `comment patch ${commentPatch.status} ${commentPatch.text}`);
    const savedComment = await request(port, "GET", `/comments/${commentId}`);
    assert(savedComment.status === 200, `saved comment ${savedComment.status} ${savedComment.text}`);
    assert(savedComment.json.comment === "keep-me", savedComment.text);
    assert(savedComment.json.author.id === victimId, JSON.stringify(savedComment.json.author));

    const deleted = await request(port, "DELETE", `/ideas/${ideaId}`, undefined, attackerToken);
    assert(deleted.status === 401, `non-owner delete ${deleted.status} ${deleted.text}`);
    const stillThere = await request(port, "GET", `/ideas/${ideaId}`);
    assert(stillThere.status === 200, `idea deleted ${stillThere.status} ${stillThere.text}`);

    const none = await request(port, "GET", "/auth/me", undefined, noneToken("victim"));
    assert(none.status === 403, `alg none ${none.status} ${none.text}`);
    const badSignature = jwt.sign(
      { id: victimId, username: "victim" },
      "other-secret-0123456789abcdef012345",
      { algorithm: "HS256" }
    );
    const forged = await request(port, "GET", "/auth/me", undefined, badSignature);
    assert(forged.status === 403, `bad signature ${forged.status} ${forged.text}`);

    const findMe = await request(port, "POST", "/graphql", {
      query: "{ findMe { username } }"
    });
    const createIdea = await request(port, "POST", "/graphql", {
      query: "mutation { createIdea(data: { idea: \"a\", description: \"b\" }) { id } }"
    });
    assert(findMe.status === 200 && createIdea.status === 200, `graphql ${findMe.status} ${createIdea.status}`);
    assert(!findMe.json.data || findMe.json.data.findMe == null, JSON.stringify(findMe.json));
    assert(JSON.stringify(errorShape(findMe.json)) === JSON.stringify(errorShape(createIdea.json)),
      `${JSON.stringify(findMe.json)} vs ${JSON.stringify(createIdea.json)}`);
    assert(!hasProperty(findMe.json, "stacktrace"), JSON.stringify(findMe.json));
    assert(!hasProperty(findMe.json, "exception"), JSON.stringify(findMe.json));

    const me = await request(port, "GET", "/auth/me", undefined, victimToken);
    const authedFindMe = await request(port, "POST", "/graphql", {
      query: "{ findMe { username } }"
    }, victimToken);
    assert(me.status === 200, `me ${me.status} ${me.text}`);
    assert(authedFindMe.json.data.findMe.username === me.json.username,
      `${authedFindMe.text} vs ${me.text}`);

    const dev = startApp(childEnv({
      SERVER_PORT: developmentPort,
      NODE_ENV: "development"
    }));
    devApp.child = dev.child;
    await dev.ready;
    const devError = await request(developmentPort, "POST", "/graphql", {
      query: "{ findMe { username } }"
    });
    assert(devError.status === 200, `development graphql ${devError.status} ${devError.text}`);
    const stack = devError.json.errors[0].extensions.exception.stacktrace;
    assert(Array.isArray(stack) && stack.length > 0, JSON.stringify(devError.json.errors[0].extensions));

    console.log("harden auth: mass assignment, jwt boot, graphql errors, findMe, ownership");
  } finally {
    await stopApp(devApp.child);
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
