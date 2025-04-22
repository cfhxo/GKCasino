const User = require("../models/User");

const updateWallet = async (user, amount) => {
    try {
      user.walletBalance += amount;
      await user.save();
      return user;
    } catch (err) {
      console.error(`Error updating wallet for user ${user._id}:`, err);
      return null;
    }
  };

module.exports = updateWallet;