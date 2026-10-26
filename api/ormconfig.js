module.exports = [
  {
    type: "postgres",
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT, 10),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    synchronize: false,
    dropSchema: false,
    migrationsRun: true,
    logging: true,
    entities: [
      "./src/**/*.entity.ts",
      "./dist/**/*.entity.js"
    ],
    migrations: [
      "./src/migration/**/*.ts"
    ],
    subscribers: [
      "./src/subscriber/**/*.ts"
    ],
    cli: {
      entitiesDir: "./src",
      migrationsDir: "./src/migration",
      subscribersDir: "./src"
    }
  }
];
