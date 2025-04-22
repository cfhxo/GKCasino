const User = require("../models/User");

// Updating winnings after a game
const updateUserWinnings = async (user, winnings) => {
    // Reset weekly winnings if a week has passed
    if (new Date() - user.lastWinningsUpdate > 7 * 24 * 60 * 60 * 1000) {
        user.weeklyWinnings = 0;
        user.lastWinningsUpdate = new Date();
    }

    // Update weekly winnings
    user.weeklyWinnings += winnings;

    // Save the user after updating weekly winnings
    await user.save();
};

module.exports = updateUserWinnings;
