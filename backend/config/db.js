const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is missing from environment variables");
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: Number(process.env.MONGO_TIMEOUT_MS) || 10000
  });
  console.log("MongoDB connected");
};

module.exports = connectDB;
