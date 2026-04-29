const mongoose = require("mongoose");
const { ensureUsersIndexes } = require("./utils/users");

// Open the shared MongoDB connection and prepare collection indexes the app depends on.
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
