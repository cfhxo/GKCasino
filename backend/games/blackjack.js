const User = require('../models/User');
const updateLevel = require("../utils/updateLevel");
const updateUserWinnings = require("../utils/updateUserWinnings");
const updateWallet = require("../utils/updateWallet");


class BlackjackGameController {
  static async play(userId, betAmount, io) {
    console.log("Starting a new game for user:", { userId, betAmount });

    const player = await User.findById(userId).select("-password -email -isAdmin -nextBonus -inventory");
    if (!player) {
      throw new Error("User not found");
    }

    if (isNaN(betAmount) || betAmount <= 0) {
      throw new Error("Invalid bet amount");
    }

    if (player.walletBalance < betAmount) {
      throw new Error("Insufficient balance");
    }

    // Deduct the bet amount using updateWallet
    await updateWallet(player, -betAmount);
    player.betAmount = betAmount; // Store the bet amount for later use

    const deck = this.generateDeck();
    const playerHand = [deck.pop(), deck.pop()];
    const dealerHand = [
      { ...deck.pop(), faceDown: true }, // First card is face down
      { ...deck.pop(), faceDown: false }, // Second card is face up
    ];

    player.currentHand = playerHand;
    player.currentDeck = deck;
    await player.save(); // Ensure the player's hand and deck are saved

    console.log(`Wallet balance after deduction: ${player.walletBalance}`);
    console.log("Player hand value:", this.calculateHandValue(playerHand));
    console.log("Dealer hand value (face-up card only):", this.calculateHandValue(dealerHand.filter((card) => !card.faceDown)));

    io.to(userId.toString()).emit("userDataUpdated", {
      walletBalance: player.walletBalance,
      xp: player.xp,
      level: player.level,
    });

    updateLevel(player, betAmount);

    return {
      userId,
      betAmount,
      playerHand,
      dealerHand,
      playerHandValue: this.calculateHandValue(playerHand),
      dealerHandValue: this.calculateHandValue(dealerHand.filter((card) => !card.faceDown)), // Only calculate value for face-up cards
      message: "Game started successfully. Your turn!",
    };
  }

  static async stand(userId, betAmount, io) {
    console.log("=== stand method called ===");
    try {
      if (!betAmount || isNaN(betAmount)) {
        throw new Error("Bet amount is not valid. Start a new game.");
      }

      const player = await User.findById(userId).select("-password -email -isAdmin -nextBonus -inventory");
      if (!player) {
        throw new Error("User not found");
      }

      if (!player.currentHand || player.currentHand.length === 0) {
        throw new Error("Player hand is not initialized. Start a new game.");
      }

      const dealerHand = this.simulateDealerTurn(player.currentDeck);
      const outcome = this.determineOutcome(player.currentHand, dealerHand);

      const playerHandValue = this.calculateHandValue(player.currentHand);
      const dealerHandValue = this.calculateHandValue(dealerHand);

      console.log("Player Hand:", player.currentHand);
      console.log("Player Hand Value:", playerHandValue);
      console.log("Dealer Hand:", dealerHand);
      console.log("Dealer Hand Value:", dealerHandValue);

      let winnings = 0;
      if (outcome === "win") {
        winnings = betAmount * 2;
      } else if (outcome === "tie") {
        winnings = betAmount;
      }

      // Update the wallet using updateWallet
      if (winnings > 0) {
        const updatedPlayer = await updateWallet(player, winnings);
        if (!updatedPlayer) {
          throw new Error("Failed to update wallet balance.");
        }
      }

      // Emit updated user data
      io.to(userId.toString()).emit("userDataUpdated", {
        walletBalance: player.walletBalance, // Updated wallet balance
        xp: player.xp,
        level: player.level,
      });

      // Prepare the final response before resetting the game state
      const finalResponse = {
        userId,
        outcome,
        dealerHand,
        dealerHandValue,
        playerHand: player.currentHand, // Preserve the player's final hand
        playerHandValue, // Preserve the player's final hand value
        winnings,
        walletBalance: player.walletBalance, // Include updated wallet balance
        message: `Game over. You ${outcome}.`,
      };

      // Reset game state
      player.currentHand = [];
      player.currentDeck = [];
      player.betAmount = 0;
      await player.save();

      return finalResponse;
    } catch (error) {
      console.error("Error in stand method:", error.message);
      throw error;
    }
  }

  static async hit(userId, io) {
    console.log("Processing hit action for user:", { userId });

    const player = await User.findById(userId).select("-password -email -isAdmin -nextBonus -inventory");
    if (!player) {
      throw new Error("User not found");
    }

    if (!player.currentHand || player.currentHand.length === 0) {
      throw new Error("Player hand is not initialized. Start a new game.");
    }

    if (!player.currentDeck || player.currentDeck.length === 0) {
      throw new Error("Deck is empty. Cannot draw a new card.");
    }

    const newCard = player.currentDeck.pop();
    player.currentHand.push(newCard);

    // Debugging logs
    console.log("New card drawn:", newCard);
    console.log("Updated player hand:", player.currentHand);

    await player.save(); // Save the updated hand and deck

    const playerHandValue = this.calculateHandValue(player.currentHand);

    // Debugging logs
    console.log("Updated player hand value:", playerHandValue);

    console.log("Player Hand:", player.currentHand);
    console.log("Player Hand Value:", playerHandValue);

    // Emit updated user data
    io.to(userId.toString()).emit("userDataUpdated", {
      walletBalance: player.walletBalance,
      xp: player.xp,
      level: player.level,
    });

    return {
      userId,
      playerHand: player.currentHand,
      playerHandValue: this.calculateHandValue(player.currentHand),
      newCard,
      message: "Card drawn successfully. Your turn continues.",
    };
  }



  static simulateGame() {
    const suits = ["clubs", "diamonds", "hearts", "spades"];
    const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

    const generateDeck = () => {
      const deck = [];
      for (const suit of suits) {
        for (const value of values) {
          deck.push({ suit, value });
        }
      }
      return deck.sort(() => Math.random() - 0.5);
    };

    const deck = generateDeck();

    // Ensure the deck has enough cards
    if (deck.length < 4) {
      throw new Error("Deck does not have enough cards to start the game.");
    }

    const playerHand = [deck.pop(), deck.pop()];
    const dealerHand = [deck.pop(), deck.pop()];

    // Validate that hands are populated
    if (!playerHand.length || !dealerHand.length) {
      throw new Error("Failed to generate player or dealer hands.");
    }

    const calculateHandValue = (hand) => {
      let value = 0;
      let aces = 0;

      for (const card of hand) {
        if (card.value === "A") {
          aces++;
          value += 11;
        } else if (["J", "Q", "K"].includes(card.value)) {
          value += 10;
        } else {
          value += parseInt(card.value);
        }
      }

      while (value > 21 && aces > 0) {
        value -= 10;
        aces--;
      }

      return value;
    };

    const playerValue = calculateHandValue(playerHand);
    const dealerValue = calculateHandValue(dealerHand);

    let outcome = "lose";
    if (playerValue > 21) {
      outcome = "lose";
    } else if (dealerValue > 21 || playerValue > dealerValue) {
      outcome = "win";
    } else if (playerValue === dealerValue) {
      outcome = "tie";
    }

    console.log("Player Hand:", playerHand);
    console.log("Player Hand Value:", playerValue);
    console.log("Dealer Hand:", dealerHand);
    console.log("Dealer Hand Value:", dealerValue);

    return { outcome, playerHand, dealerHand };
  }

  static simulateDealerTurn(deck) {
    const dealerHand = [
      { ...deck.pop(), faceDown: true }, // First card is face down
      { ...deck.pop(), faceDown: false }, // Second card is face up
    ];

    let dealerValue = this.calculateHandValue(dealerHand.filter((card) => !card.faceDown)); // Only calculate value for face-up cards initially

    // Reveal the face-down card
    dealerHand[0].faceDown = false; // Reveal the face-down card
    dealerValue = this.calculateHandValue(dealerHand);

    while (dealerValue < 17) {
      dealerHand.push({ ...deck.pop(), faceDown: false }); // Draw additional cards face up
      dealerValue = this.calculateHandValue(dealerHand);
    }

    console.log("Dealer Hand:", dealerHand);
    console.log("Dealer Hand Value:", dealerValue);

    return dealerHand;
  }

  static determineOutcome(playerHand, dealerHand) {
    const playerValue = this.calculateHandValue(playerHand);
    const dealerValue = this.calculateHandValue(dealerHand);

    console.log("Player Hand:", playerHand);
    console.log("Player Hand Value:", playerValue);
    console.log("Dealer Hand:", dealerHand);
    console.log("Dealer Hand Value:", dealerValue);

    if (playerValue > 21) {
      return "lose"; // Player busts
    } else if (dealerValue > 21) {
      return "win"; // Dealer busts
    } else if (playerValue > dealerValue) {
      return "win"; // Player has a higher value
    } else if (playerValue === dealerValue) {
      return "tie"; // Both have the same value
    } else {
      return "lose"; // Dealer has a higher value
    }
  }

  static calculateHandValue(hand) {
    if (!hand || hand.length === 0) return 0; // Return 0 for an empty or undefined hand

    let total = 0;
    let aces = 0;

    hand.forEach((card) => {
      const valueMap = {
        A: 11, // Match "A" for Ace
        K: 10, // Match "K" for King
        Q: 10, // Match "Q" for Queen
        J: 10, // Match "J" for Jack
      };

      if (card.value === "A") {
        aces += 1;
      }

      total += valueMap[card.value] || parseInt(card.value, 10) || 0;
    });

    // Adjust Aces from 11 to 1 if total exceeds 21
    while (total > 21 && aces > 0) {
      total -= 10;
      aces -= 1;
    }

    return total;
  }

  static generateDeck() {
    const suits = ["hearts", "diamonds", "clubs", "spades"];
    const values = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
    const deck = [];

    for (const suit of suits) {
      for (const value of values) {
        deck.push({ suit, value });
      }
    }

    return deck.sort(() => Math.random() - 0.5); // Shuffle the deck
  }

  static updateWallet(player, amount, reason) {
    console.log(`Wallet update: ${reason}`);
    console.log(`Wallet balance before update: ${player.walletBalance}`);
    player.walletBalance += amount;
    console.log(`Wallet balance after update: ${player.walletBalance}`);
  }
}



module.exports = BlackjackGameController;