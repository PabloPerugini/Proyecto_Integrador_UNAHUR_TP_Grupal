const mongoose = require("mongoose");

const connectMongo = async () => {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/unahur-tp";
  await mongoose.connect(uri);
  console.log("MongoDB: Conectado");
};

const disconnectMongo = async () => {
  await mongoose.disconnect();
  console.log("MongoDB: Desconectado");
};

module.exports = { connectMongo, disconnectMongo };