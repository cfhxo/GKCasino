const User = require("../models/User");
const updateWallet = require("../utils/updateWallet");
const updateLevel = require("../utils/updateLevel");
const updateUserWinnings = require("../utils/updateUserWinnings");

class BlackjackGameController {
  // Generate a shuffled deck
  static generateDeck() {
    const suits = ["hearts", "diamonds", "clubs", "spades"];
    const values = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
    const deck = [];

    let id = 1; // Unique ID for each card
    for (const suit of suits) {
      for (const value of values) {
        deck.push({ id: id++, suit, value, faceDown: false });
      }
    }

    return deck.sort(() => Math.random() - 0.5); // Shuffle the deck
  }

  // Calculate the value of a hand
  static calculateHandValue(hand) {
    let total = 0;
    let aces = 0;

    hand.forEach((card) => {
      if (card.value === "A") {
        aces += 1;
        total += 11;
      } else if (["K", "Q", "J"].includes(card.value)) {
        total += 10;
      } else {
        total += parseInt(card.value, 10);
      }
    });

    // Adjust Aces from 11 to 1 if total exceeds 21
    while (total > 21 && aces > 0) {
      total -= 10;
      aces -= 1;
    }

    return total;
  }

  // Start a new game
  static async play(userId, betAmount, io) {
    const player = await User.findById(userId).select("-password -email -isAdmin -nextBonus -inventory");
    if (!player) throw new Error("User not found");

    if (isNaN(betAmount) || betAmount <= 0) throw new Error("Invalid bet amount");
    if (player.walletBalance < betAmount) throw new Error("Insufficient balance");

    // Deduct the bet amount
    await updateWallet(player, -betAmount);
    player.betAmount = betAmount;
       // Emit updated user data to the client immediately after payout
       const userDataPayload = {
        walletBalance: player.walletBalance,
        xp: player.xp,
        level: player.level,
      };
      io.to(userId).emit("userDataUpdated", userDataPayload);

    // Generate a new deck and deal initial hands
    const deck = this.generateDeck();
    const playerHand = [deck.pop(), deck.pop()];
    const dealerHand = [
      { ...deck.pop(), faceDown: true }, // First card is face down
      { ...deck.pop(), faceDown: false }, // Second card is face up
    ];

    // Save the game state
    player.currentHand = playerHand;
    player.dealerHand = dealerHand; // Save the dealer's hand
    player.currentDeck = deck;
    await player.save();

    console.log("Player Hand:", player.currentHand);
    console.log("Dealer Hand:", player.dealerHand);

    return {
      userId,
      betAmount,
      playerHand,
      dealerHand,
      playerHandValue: this.calculateHandValue(playerHand),
      dealerHandValue: this.calculateHandValue(dealerHand.filter((card) => !card.faceDown)),
      message: "Game started successfully. Your turn!",
    };
  }

  // Handle the "hit" action
  static async hit(userId, io) {
    console.log("=== hit method called ===");

    const player = await User.findById(userId).select("-password -email -isAdmin -nextBonus -inventory");
    if (!player) throw new Error("User not found");

    if (!player.currentHand || player.currentHand.length === 0) {
      throw new Error("Player hand is not initialized. Start a new game.");
    }

    const deck = player.currentDeck;
    const newCard = deck.pop();
    player.currentHand.push(newCard);

    const playerHandValue = this.calculateHandValue(player.currentHand);

    // Save the updated game state
    player.currentDeck = deck;
    await player.save();

    console.log("Player Hand After Hit:", player.currentHand);

    return {
      playerHand: player.currentHand,
      playerHandValue,
      message: playerHandValue > 21 ? "You busted!" : "Your turn!",
    };
  }

  // Handle the "stand" action
  static async stand(userId, betAmount, io) {
    console.log("=== stand method called ===");

    const player = await User.findById(userId).select("-password -email -isAdmin -nextBonus -inventory");
    if (!player) throw new Error("User not found");

    if (!player.currentHand || player.currentHand.length === 0) {
      throw new Error("Player hand is not initialized. Start a new game.");
    }

    // Use the existing dealer hand or initialize it
    const dealerHand = this.simulateDealerTurn(player.currentDeck, player.dealerHand || []);
    const playerHandValue = this.calculateHandValue(player.currentHand);
    const dealerHandValue = this.calculateHandValue(dealerHand);

    console.log("Player Hand:", player.currentHand);
    console.log("Dealer Hand:", dealerHand);

    let outcome = "lose";
    if (playerHandValue > 21) {
      outcome = "lose"; // Player busts
    } else if (dealerHandValue > 21) {
      outcome = "win"; // Dealer busts
    } else if (playerHandValue > dealerHandValue) {
      outcome = "win"; // Player has a higher value
    } else if (playerHandValue === dealerHandValue) {
      outcome = "tie"; // Both have the same value
    }

    let winnings = 0;
    let message = `Game over. You ${outcome}.`;
    if (outcome === "win") {
      winnings = player.betAmount * 2;
      updateUserWinnings(player, winnings); // Update user winnings
      message = `You won! Your winnings are $${winnings}.`;
    } else if (outcome === "tie") {
      winnings = player.betAmount;
      message = "It's a tie! Your bet has been returned.";
    }

    if (winnings > 0) await updateWallet(player, winnings);
    // Emit updated user data to the client immediately after payout
    const userDataPayload = {
      walletBalance: player.walletBalance,
      xp: player.xp,
      level: player.level,
    };
    io.to(userId).emit("userDataUpdated", userDataPayload);

    // Save the updated dealer hand and reset the game state
    player.dealerHand = dealerHand; // Persist the updated dealer hand
    player.currentHand = [];
    player.currentDeck = [];
    player.betAmount = 0;
    await player.save();

    return {
      userId,
      outcome,
      dealerHand,
      dealerHandValue,
      playerHand: player.currentHand,
      playerHandValue,
      winnings,
      message,
    };
  }

  // Simulate the dealer's turn
  static simulateDealerTurn(deck, existingDealerHand = []) {
    const dealerHand = [...existingDealerHand];

    // Reveal the face-down card
    if (dealerHand.length > 0 && dealerHand[0].faceDown) {
      dealerHand[0].faceDown = false;
    }

    let dealerValue = this.calculateHandValue(dealerHand);

    // Draw cards until the dealer's hand value is at least 17
    while (dealerValue < 17) {
      const newCard = deck.pop();
      dealerHand.push({ ...newCard, faceDown: false });
      dealerValue = this.calculateHandValue(dealerHand);
    }

    return dealerHand;
  }
}



module.exports = BlackjackGameController;