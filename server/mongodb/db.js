const mongoose = require("mongoose");
const { ensureUsersIndexes } = require("./utils/users");

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await ensureUsersIndexes();
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

module.exports = connectDB;
