const mongoose = require("mongoose");

const globalChatSchema = new mongoose.Schema({
  username: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("GlobalChat", globalChatSchema);