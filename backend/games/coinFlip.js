const User = require("../models/User");
const updateUserWinnings = require("../utils/updateUserWinnings");
const updateLevel = require("../utils/updateLevel");
const updateWallet = require("../utils/updateWallet");

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
    },
  };

  io.on("connection", (socket) => {
    // Handle player bet
    socket.on("coinFlip:bet", async (user, bet, choice) => {
      try {
        // Validate bet amount
        if (isNaN(bet) || bet < 1 || bet > 1000000) {
          socket.emit("coinFlip:betRejected", { reason: "Invalid bet amount." });
          return;
        }

        // Fetch the user from the database
        const fetchedUser = await User.findById(user.id).select(
          "-password -email -isAdmin -nextBonus -inventory -bonusAmount"
        );

        if (!fetchedUser) {
          socket.emit("coinFlip:betRejected", { reason: "User not found." });
          return;
        }

        // Deduct bet amount directly from user's wallet balance
        if (fetchedUser.walletBalance < bet) {
          socket.emit("coinFlip:betRejected", { reason: "Insufficient funds." });
          return;
        }
        fetchedUser.walletBalance -= bet;
        await fetchedUser.save();

        // Update user level based on the bet amount
        await updateLevel(fetchedUser, bet);

        // Record the bet
        const betType = choice === 0 ? "heads" : "tails";
        gameState[betType].bets[user.id] = bet;

        // Add the user to the game state
        gameState[betType].players[user.id] = {
          id: fetchedUser._id,
          username: fetchedUser.username,
          profilePicture: fetchedUser.profilePicture,
          walletBalance: fetchedUser.walletBalance,
          xp: fetchedUser.xp,
          level: fetchedUser.level,
        };

        // Emit updated user data to the client
        const userDataPayload = {
          walletBalance: fetchedUser.walletBalance,
          xp: fetchedUser.xp,
          level: fetchedUser.level,
        };
        io.to(user.id).emit("userDataUpdated", userDataPayload);

        // Emit the updated game state to all clients
        io.emit("coinFlip:gameState", gameState);
        //console.log("Updated gameState after bet:", JSON.stringify(gameState, null, 2));
      } catch (err) {
        console.error(err);
        socket.emit("coinFlip:error", { message: "An error occurred while processing your bet." });
      }
    });

    // Handle player choice
    socket.on("coinFlip:choice", (user, choice) => {
      const choiceType = choice === 0 ? "heads" : "tails";
      gameState[choiceType].choices[user.id] = choice;

      // Emit the updated game state to all clients
      io.emit("coinFlip:gameState", gameState);
      //console.log("Updated gameState:", JSON.stringify(gameState, null, 2));
    });
  });

  // Calculate payouts for the winning choice
  const calculatePayout = async (result) => {
    const winningChoice = result === 0 ? "heads" : "tails";

    //console.log("Game state during payout:", JSON.stringify(gameState, null, 2));

    for (let userId in gameState[winningChoice].bets) {
      try {
        const betAmount = gameState[winningChoice].bets[userId];

        // Fetch the user from the database
        const user = await User.findById(userId).select(
          "-password -email -isAdmin -nextBonus -inventory -bonusAmount"
        );

        if (!user) {
          console.error(`User not found for payout: ${userId}`);
          continue;
        }

        // Calculate payout
        const payout = betAmount * 2;

        // Use updateWallet to add the payout to the user's wallet
        const updatedUser = await updateWallet(user, payout);
        if (!updatedUser) {
          console.error(`Failed to update wallet for user: ${userId}`);
          continue;
        }

        // Update user's winnings
        await updateUserWinnings(user, payout - betAmount);

        // Emit updated user data to the client immediately after payout
        const userDataPayload = {
          walletBalance: updatedUser.walletBalance,
          xp: updatedUser.xp,
          level: updatedUser.level,
        };
        io.to(userId).emit("userDataUpdated", userDataPayload);

        console.log(`Payout processed for user ${userId}: ${payout}`);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Start a new game
  const startGame = async () => {
    io.emit("coinFlip:start");

    const result = Math.floor(Math.random() * 2);

    setTimeout(async () => {
      io.emit("coinFlip:result", result);

      // Calculate payouts based on game result and player choices
      await calculatePayout(result);

      // Log the game state before resetting
      //console.log("Game state before reset:", JSON.stringify(gameState, null, 2));

      // Reset game state after payouts are processed
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
        },
      };

      //console.log("Game state after reset:", JSON.stringify(gameState, null, 2));

      // Start the next game after a delay
      setTimeout(startGame, 14000);
    }, 5000);
  };

  startGame();
};

module.exports = coinFlip;
