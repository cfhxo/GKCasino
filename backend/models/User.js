const uuid = require('uuid');
const mongoose = require("mongoose");

const friendRequestSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    timestamp: { type: Date, default: Date.now },
});

const UserSchema = new mongoose.Schema({
  googleId: {
    type: String,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    select: false, // Exclude password by default
  },
  walletBalance: {
    type: Number,
    default: 200,
  },
  inventory: [
    {
      uniqueId: {
        type: String,
        default: () => uuid.v4(),
      },
      _id: mongoose.Schema.Types.ObjectId,
      name: String,
      image: String,
      rarity: String,
      case: mongoose.Schema.Types.ObjectId,
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  fixedItem: {
    name: String,
    image: String,
    rarity: String,
    description: String,
  },
  xp: {
    type: Number,
    default: 0,
  },
  level: {
    type: Number,
    default: 0,
  },
  profilePicture: {
    type: String,
    default: "", // default "" to a default image URL
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  nextBonus: {
    type: Date,
    default: () => Date.now() - 86400000 // now - 24 hours
  },
  bonusAmount: {
    type: Number,
    default: 1000, // sets the initial bonus amount to 1000
  },
  weeklyWinnings: {
    type: Number,
    default: 0,
  },
  lastWinningsUpdate: {
    type: Date,
    default: Date.now,
  },
  friends: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the User model
    },
  ],
  friendRequests: [friendRequestSchema], // Array of friend requests
  currentHand: {
    type: Array,
    default: [],
  },
  currentDeck: {
    type: Array,
    default: [],
  },
  betAmount: {
    type: Number,
    default: 0, // Default to 0 if not set
  },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
});

module.exports = User = mongoose.model("User", UserSchema);
