const BASE_XP = 1000; // XP required for the first level
const GROWTH_RATE = 1.25; // Growth rate for each level

function calculateXPForLevel(level) {
    return Math.floor(BASE_XP * Math.pow(GROWTH_RATE, level - 1));
}

// Modify but don't save - let the caller handle saving
function updateLevel(player, betAmount) {
    // Add XP based on bet amount
    player.xp += Math.floor(betAmount * 0.1);

    // Check and update level if necessary
    let nextLevelXP = calculateXPForLevel(player.level + 1);

    while (player.xp >= nextLevelXP) {
        player.level += 1;
        nextLevelXP = calculateXPForLevel(player.level + 1);
    }
    
    // Don't call player.save() here
}

module.exports = updateLevel;