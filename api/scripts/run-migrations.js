const { DataSource } = require("typeorm");

const [connection] = require("../ormconfig");

async function main() {
  const options = Object.assign({}, connection);
  delete options.cli;
  options.migrationsRun = false;

  const dataSource = new DataSource(options);
  await dataSource.initialize();
  const applied = await dataSource.runMigrations();
  console.log("database " + options.database);
  if (applied.length === 0) {
    console.log("no pending migrations");
  }
  for (const migration of applied) {
    console.log("applied " + migration.name);
  }
  await dataSource.destroy();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
