const mongoose = require("mongoose");
const dns = require("dns");

// Use a DNS resolver that can resolve MongoDB SRV records
dns.setServers(["8.8.8.8", "8.8.4.4"]);
let isConnected = false;

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

async function connectMongo() {
  if (isConnected) return mongoose.connection;

  const uri = requireEnv("MONGODB_URI");

  // Note: keep logs minimal (security + ISO 27001 logging hygiene)
  await mongoose.connect(uri, {
    dbName: undefined,
    autoIndex: false,
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 10
  });

  isConnected = true;
  return mongoose.connection;
}

module.exports = {
  connectMongo,
  getMongoConnection: () => mongoose.connection
};

