const { spawn } = require("child_process");
const path = require("path");

const { Client } = require("pg");
const { DataSource } = require("typeorm");

const { UserEntity } = require("../src/user/user.entity");
const { IdeaEntity } = require("../src/idea/idea.entity");
const { CommentEntity } = require("../src/comment/comment.entity");
const { VoteEntity } = require("../src/idea/vote/vote.entity");
const { Baseline1761508800000 } = require("../src/migration/1761508800000-Baseline");
const { Votes1761600000000 } = require("../src/migration/1761600000000-Votes");

const apiDir = path.resolve(__dirname, "..");
const database = `ideas_votes_${process.pid}_${Date.now()}`;

process.env.POSTGRES_HOST = process.env.POSTGRES_HOST || "127.0.0.1";
process.env.POSTGRES_PORT = process.env.POSTGRES_PORT || "5432";
process.env.POSTGRES_USER = process.env.POSTGRES_USER || "ideas";
process.env.POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || "ideas";
process.env.POSTGRES_DB = database;
if (!process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET) < 32) {
  process.env.JWT_SECRET = "votes-e2e-secret-padding-000032b";
}
process.env.SERVER_PORT = process.env.SERVER_PORT || "18772";

const [connection] = require("../ormconfig");

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

async function tableNames() {
  const client = new Client(pgConfig(database));
  await client.connect();
  const result = await client.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1"
  );
  await client.end();
  return result.rows.map(row => row.tablename);
}

async function voteRows(ideaId) {
  const client = new Client(pgConfig(database));
  await client.connect();
  const result = await client.query(
    `SELECT user_id, value FROM votes WHERE idea_id = $1 ORDER BY user_id`,
    [ideaId]
  );
  await client.end();
  return result.rows;
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
  return { child, ready };
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

async function register(username) {
  const created = await request("POST", "/auth/register", { username, password: "secret" });
  assert(created.status === 201, `register ${username} returned ${created.status} ${created.text}`);
  assert(typeof created.json.token === "string", "register did not return a token");
  return created.json;
}

async function createIdea(token, label) {
  const created = await request("POST", "/ideas", { idea: label, description: label }, token);
  assert(created.status === 201, `create idea returned ${created.status} ${created.text}`);
  assert(typeof created.json.score === "number", "created idea has no score");
  assert(!Object.prototype.hasOwnProperty.call(created.json, "viewerVote"), "idea read includes viewerVote");
  return created.json;
}

async function proveMigrations() {
  const source = new DataSource({
    type: "postgres",
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database,
    synchronize: false,
    logging: false,
    entities: [UserEntity, IdeaEntity, CommentEntity, VoteEntity],
    migrations: [Baseline1761508800000, Votes1761600000000]
  });
  await source.initialize();
  await source.runMigrations();
  let names = await tableNames();
  assert(names.includes("votes"), "up did not create votes: " + names.join(","));
  assert(!names.includes("idea_upvotes_user"), "up left idea_upvotes_user");
  assert(!names.includes("idea_downvotes_user"), "up left idea_downvotes_user");

  await source.undoLastMigration();
  names = await tableNames();
  assert(!names.includes("votes"), "down left votes");
  assert(names.includes("idea_upvotes_user"), "down did not restore idea_upvotes_user");
  assert(names.includes("idea_downvotes_user"), "down did not restore idea_downvotes_user");

  await source.runMigrations();
  names = await tableNames();
  assert(names.includes("votes"), "second up did not create votes");
  assert(!names.includes("idea_upvotes_user"), "second up left idea_upvotes_user");
  await source.destroy();
  console.log("migration up, down, and up again");
}

async function pageIds(pathPrefix) {
  const seen = [];
  let cursor = null;
  let pageCount = 0;
  let lastNext = "unset";
  while (pageCount < 20) {
    const path = cursor
      ? `${pathPrefix}limit=2&cursor=${encodeURIComponent(cursor)}`
      : `${pathPrefix}limit=2`;
    const page = await request("GET", path);
    assert(page.status === 200, `${path} returned ${page.status} ${page.text}`);
    assert(Array.isArray(page.json.items), "page items is not an array");
    for (const item of page.json.items) {
      assert(!seen.includes(item.id), "idea id repeated across pages: " + item.id);
      assert(typeof item.score === "number", "page item has no score");
      assert(!Object.prototype.hasOwnProperty.call(item, "upvotes"), "page item includes upvotes");
      assert(!Object.prototype.hasOwnProperty.call(item, "downvotes"), "page item includes downvotes");
      assert(!Object.prototype.hasOwnProperty.call(item, "viewerVote"), "page item includes viewerVote");
      seen.push(item.id);
    }
    lastNext = page.json.nextCursor;
    pageCount += 1;
    if (page.json.nextCursor === null) {
      break;
    }
    cursor = page.json.nextCursor;
  }
  assert(lastNext === null, "last page nextCursor was " + lastNext);
  assert(pageCount >= 2, "expected more than one page");
  return seen;
}

async function main() {
  assert(connection.synchronize === false, "synchronize is not false");
  assert(connection.dropSchema === false, "dropSchema is not false");
  await createDatabase(database);
  await proveMigrations();

  const app = startApp();
  try {
    await app.ready;
    const alice = await register("alice-votes");
    const bob = await register("bob-votes");
    const shared = await createIdea(alice.token, "shared");

    const [aliceVote, bobVote] = await Promise.all([
      request("PUT", `/ideas/${shared.id}/vote`, { value: 1 }, alice.token),
      request("PUT", `/ideas/${shared.id}/vote`, { value: -1 }, bob.token)
    ]);
    assert(aliceVote.status === 200, `alice vote ${aliceVote.status} ${aliceVote.text}`);
    assert(bobVote.status === 200, `bob vote ${bobVote.status} ${bobVote.text}`);
    const sharedRows = await voteRows(shared.id);
    assert(sharedRows.length === 2, "concurrent votes did not store both rows");
    const sharedSum = sharedRows.reduce((total, row) => total + Number(row.value), 0);
    const sharedRead = await request("GET", `/ideas/${shared.id}`);
    assert(sharedRead.status === 200, `detail ${sharedRead.status} ${sharedRead.text}`);
    assert(sharedRead.json.score === sharedSum, `score ${sharedRead.json.score} != ${sharedSum}`);
    assert(!Object.prototype.hasOwnProperty.call(sharedRead.json, "viewerVote"), "detail includes viewerVote");
    assert(!Object.prototype.hasOwnProperty.call(sharedRead.json, "upvotes"), "detail includes upvotes");

    const repeatIdea = await createIdea(alice.token, "repeat");
    const first = await request("PUT", `/ideas/${repeatIdea.id}/vote`, { value: 1 }, alice.token);
    const second = await request("PUT", `/ideas/${repeatIdea.id}/vote`, { value: 1 }, alice.token);
    assert(first.status === 200 && second.status === 200, `repeat status ${first.status} ${second.status}`);
    assert(JSON.stringify(first.json) === JSON.stringify(second.json), "second vote response changed");
    assert(second.json.score === 1 && second.json.viewerVote === 1, JSON.stringify(second.json));
    assert((await voteRows(repeatIdea.id)).length === 1, "repeat stored more than one row");
    const repeatRead = await request("GET", `/ideas/${repeatIdea.id}`);
    assert(repeatRead.json.score === 1, "read score " + repeatRead.json.score);

    const switchIdea = await createIdea(alice.token, "switch");
    const up = await request("PUT", `/ideas/${switchIdea.id}/vote`, { value: 1 }, alice.token);
    const down = await request("PUT", `/ideas/${switchIdea.id}/vote`, { value: -1 }, alice.token);
    assert(up.status === 200 && down.status === 200, `switch status ${up.status} ${down.status}`);
    assert(down.json.viewerVote === -1, "switch viewerVote " + down.json.viewerVote);
    assert(down.json.score === up.json.score - 2, `score moved by ${down.json.score - up.json.score}`);
    const switched = await voteRows(switchIdea.id);
    assert(switched.length === 1 && Number(switched[0].value) === -1, "switch did not update the row");

    const clearIdea = await createIdea(alice.token, "clear");
    await request("PUT", `/ideas/${clearIdea.id}/vote`, { value: 1 }, alice.token);
    const cleared = await request("PUT", `/ideas/${clearIdea.id}/vote`, { value: 0 }, alice.token);
    assert(cleared.status === 200, `clear ${cleared.status} ${cleared.text}`);
    assert(cleared.json.viewerVote === 0 && cleared.json.score === 0, JSON.stringify(cleared.json));
    assert((await voteRows(clearIdea.id)).length === 0, "clear left a row");

    const emptyIdea = await createIdea(alice.token, "empty");
    const alreadyClear = await request("PUT", `/ideas/${emptyIdea.id}/vote`, { value: 0 }, alice.token);
    assert(alreadyClear.status === 200, `clear empty ${alreadyClear.status} ${alreadyClear.text}`);
    assert(alreadyClear.json.viewerVote === 0 && alreadyClear.json.score === 0, JSON.stringify(alreadyClear.json));

    const beforeInvalid = (await voteRows(emptyIdea.id)).length;
    const notAllowed = await request("PUT", `/ideas/${emptyIdea.id}/vote`, { value: 2 }, alice.token);
    const fraction = await request("PUT", `/ideas/${emptyIdea.id}/vote`, { value: 1.5 }, alice.token);
    const missingValue = await request("PUT", `/ideas/${emptyIdea.id}/vote`, {}, alice.token);
    assert(notAllowed.status === 400, `value 2 returned ${notAllowed.status}`);
    assert(fraction.status === 400, `value 1.5 returned ${fraction.status}`);
    assert(missingValue.status === 400, `missing value returned ${missingValue.status}`);
    assert((await voteRows(emptyIdea.id)).length === beforeInvalid, "invalid value wrote a row");

    const missingIdea = await request(
      "PUT",
      "/ideas/00000000-0000-4000-8000-000000000000/vote",
      { value: 1 },
      alice.token
    );
    assert(missingIdea.status === 404, `missing idea returned ${missingIdea.status} ${missingIdea.text}`);

    const graphqlIdea = await createIdea(bob.token, "graphql");
    const graphqlVote = await request("POST", "/graphql", {
      query: "mutation($ideaId: ID!, $value: Int!) { setVote(ideaId: $ideaId, value: $value) { score viewerVote } }",
      variables: { ideaId: graphqlIdea.id, value: -1 }
    }, bob.token);
    assert(graphqlVote.status === 200, `graphql ${graphqlVote.status} ${graphqlVote.text}`);
    assert(graphqlVote.json.data.setVote.score === -1, JSON.stringify(graphqlVote.json));
    assert(graphqlVote.json.data.setVote.viewerVote === -1, JSON.stringify(graphqlVote.json));

    const mutations = await request("POST", "/graphql", {
      query: "{ __type(name: \"Mutation\") { fields { name } } }"
    });
    const mutationNames = mutations.json.data.__type.fields.map(field => field.name);
    assert(mutationNames.includes("setVote"), "schema is missing setVote");
    assert(!mutationNames.includes("upvoteIdea"), "schema still has upvoteIdea");
    assert(!mutationNames.includes("downvoteIdea"), "schema still has downvoteIdea");

    const oldRoute = await request("POST", `/ideas/${graphqlIdea.id}/upvote`, {}, alice.token);
    assert(oldRoute.status === 404, `upvote route returned ${oldRoute.status} ${oldRoute.text}`);

    const zero = await request("GET", "/ideas?limit=0");
    const tooHigh = await request("GET", "/ideas?limit=101");
    const newestZero = await request("GET", "/ideas/newest?limit=0");
    assert(zero.status === 400 && tooHigh.status === 400 && newestZero.status === 400,
      `limits ${zero.status} ${tooHigh.status} ${newestZero.status}`);

    await createIdea(alice.token, "page-a");
    await createIdea(alice.token, "page-b");
    await createIdea(alice.token, "page-c");
    const listed = await pageIds("/ideas?");
    const newest = await pageIds("/ideas/newest?");
    const client = new Client(pgConfig(database));
    await client.connect();
    const count = await client.query(`SELECT COUNT(*)::int AS count FROM idea`);
    await client.end();
    assert(listed.length === count.rows[0].count, `listed ${listed.length} of ${count.rows[0].count}`);
    assert(newest.length === count.rows[0].count, `newest listed ${newest.length}`);

    const duplicate = await createIdea(alice.token, "duplicate");
    await request("PUT", `/ideas/${duplicate.id}/vote`, { value: 1 }, alice.token);
    const insert = new Client(pgConfig(database));
    await insert.connect();
    let uniqueFailed = false;
    try {
      await insert.query(
        `INSERT INTO votes (user_id, idea_id, value) VALUES ($1, $2, 1)`,
        [alice.id, duplicate.id]
      );
    } catch (error) {
      uniqueFailed = error.code === "23505";
    }
    await insert.query(`DELETE FROM idea WHERE id = $1`, [duplicate.id]);
    const remaining = await insert.query(`SELECT COUNT(*)::int AS count FROM votes WHERE idea_id = $1`, [duplicate.id]);
    await insert.end();
    assert(uniqueFailed, "second insert of the same pair succeeded");
    assert(remaining.rows[0].count === 0, "deleting the idea left vote rows");

    console.log("votes: concurrent, repeat, switch, cursor pages, and migration");
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
