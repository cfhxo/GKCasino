const User = require("../models/User");

// Updating winnings after a game
const updateUserWinnings = async (user, winnings) => {
    // Reset weekly winnings if a week has passed (remove this when we have a cron job)
    if (new Date() - user.lastWinningsUpdate > 7 * 24 * 60 * 60 * 1000) {
        user.weeklyWinnings = 0;
        user.lastWinningsUpdate = new Date();
    }

    // Update weekly winnings
    user.weeklyWinnings += winnings;

    // Update wallet balance
//    if (winnings !== 0) {
//       user.walletBalance += winnings;
//        console.log(`Updated wallet balance for user ${user._id}: ${user.walletBalance}`);
//    }

    // Save the user
}

module.exports = updateUserWinnings;
