const { Sequelize } = require("sequelize");

let sequelize;

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

async function connectMySQL() {
  if (sequelize) return sequelize;

  const host = requireEnv("MYSQL_HOST");
  const port = Number(requireEnv("MYSQL_PORT"));
  const database = requireEnv("MYSQL_DATABASE");
  const username = requireEnv("MYSQL_USER");
  const password = requireEnv("MYSQL_PASSWORD");
  const ssl = String(process.env.MYSQL_SSL || "false").toLowerCase() === "true";

  sequelize = new Sequelize(database, username, password, {
    host,
    port,
    dialect: "mysql",
    logging: false, // Avoid leaking queries/credentials in logs
    pool: {
      // Performance + stability: tuneable defaults
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: ssl
      ? {
          ssl: { require: true, rejectUnauthorized: false }
        }
      : undefined
  });

  // Verify connection at startup.
  await sequelize.authenticate();
  return sequelize;
}

module.exports = {
  connectMySQL,
  getSequelize: () => sequelize
};

