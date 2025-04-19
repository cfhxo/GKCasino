const updateWallet = async (user, amount) => {
    
    user.walletBalance += amount;
    console.log(`Updated wallet balance for user ${user._id}: ${user.walletBalance}`);
    await user.save();
};

module.exports = updateWallet;