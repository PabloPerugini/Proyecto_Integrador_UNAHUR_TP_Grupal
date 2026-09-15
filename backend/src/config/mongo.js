const mongoose = require("mongoose");
require("dotenv").config();

const connectMongo = async () => {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/unahur-tp";
  await mongoose.connect(uri);
  console.log("MongoDB: Conectado");
};

module.exports = { connectMongo };