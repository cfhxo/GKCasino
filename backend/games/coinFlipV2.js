const User = require("../models/User");
const updateUserWinnings = require("../utils/updateUserWinnings");
const updateLevel = require("../utils/updateLevel");
const updateWallet = require("../utils/updateWallet"); // Add this import

const coinFlip = (io) => {
  let gameState = {
    heads: {
      players: {},
      bets: {},
      choices: {},
    },
    tails: {
      players: {},
      bets: {},
      choices: {},
    }
  };

  io.on("connection", (socket) => {
    socket.on("coinFlip:bet", async (user, bet, choice) => {
      try {
        if (isNaN(bet) || bet < 1 || bet > 1000000) {
          const reason = "You have been disconnected for sending an invalid bet.";
          console.log(`[CoinFlip] Invalid bet from user ${user.id}. Disconnecting socket ${socket.id}`);
          socket.emit("forceLogout", { reason });
          socket.disconnect(true);
          return;
        }

        // Atomic wallet deduction (same as slots)
        const updatedUser = await User.findOneAndUpdate(
          { _id: user.id, walletBalance: { $gte: bet } },
          { $inc: { walletBalance: -bet } },
          { new: true }
        ).select("-password -email -isAdmin -nextBonus -inventory");

        if (!updatedUser) {
          const reason = "You have been disconnected for insufficient funds or suspicious activity.";
          console.log(`[CoinFlip] User ${user.id} has insufficient funds or race condition detected (bet: ${bet}). Disconnecting socket ${socket.id}`);
          socket.emit("forceLogout", { reason });
          socket.disconnect(true);
          return;
        }

        const betType = choice === 0 ? "heads" : "tails";
        gameState[betType].bets[user.id] = bet;

        console.log(`[CoinFlip] Deducting ${bet} from user ${updatedUser._id} (after: ${updatedUser.walletBalance})`);

        updateLevel(updatedUser, bet);

        const userDataPayload = {
          walletBalance: updatedUser.walletBalance,
          xp: updatedUser.xp,
          level: updatedUser.level,
        }
        io.to(user.id).emit('userDataUpdated', userDataPayload);

        gameState[betType].players[user.id] = updatedUser;
        io.emit("coinFlip:gameState", gameState);
      } catch (err) {
        console.log(err);
      }
    });

    socket.on("coinFlip:choice", (user, choice) => {
      const choiceType = choice === 0 ? "heads" : "tails";
      gameState[choiceType].choices[user.id] = choice;
      io.emit("coinFlip:gameState", gameState);
    });
  });

  const calculatePayout = async (result) => {
    let winningChoice = result === 0 ? "heads" : "tails";

    for (let userId in gameState[winningChoice].choices) {
      try {
        const betAmount = gameState[winningChoice].bets[userId];
        const user = await User.findById(userId);

        // Use updateWallet for payout and prevent negative balances
        await updateWallet(user, betAmount * 2);
        updateUserWinnings(user, betAmount * 2);

        const userDataPayload = {
          walletBalance: user.walletBalance,
          xp: user.xp,
          level: user.level,
        }

        io.to(userId).emit('userDataUpdated', userDataPayload);

      } catch (err) {
        console.log(err);
      }
    }
  };

  const startGame = async () => {
    io.emit("coinFlip:start");

    const result = Math.floor(Math.random() * 2);

    setTimeout(async () => {
      io.emit("coinFlip:result", result);

      // Calculate payouts based on game result and player choices
      await calculatePayout(result);

      // Reset game state
      gameState = {
        heads: {
          players: {},
          bets: {},
          choices: {},
        },
        tails: {
          players: {},
          bets: {},
          choices: {},
        }
      };

      setTimeout(startGame, 14000);
    }, 5000);
  };

  startGame();
};

module.exports = coinFlip;
