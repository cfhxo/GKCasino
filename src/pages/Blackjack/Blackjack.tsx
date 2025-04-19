import React, { useState, useEffect, useContext } from "react";
import "./Blackjack.css";
import { dealCards, hitCard, stand } from "../../services/games/GamesServices";
import UserContext from "../../UserContext";
import { io } from "socket.io-client";

interface Card {
  suit: string;
  value: string;
}

const getCardImageName = (value: string, suit: string) => {
  const faceCardMap: { [key: string]: string } = {
    Jack: "j",
    Queen: "q",
    King: "k",
  };

  const cardValue = faceCardMap[value] || value.toLowerCase(); // Map face cards or use the value as-is
  return `/images/cards/${cardValue}_of_${suit}.png`;
};

const Blackjack: React.FC = () => {
  const { userData, setUserData } = useContext(UserContext);
  const userId = userData?.id;
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [playerHandValue, setPlayerHandValue] = useState<number>(0);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [dealerHandValue, setDealerHandValue] = useState<number>(0);
  const [message, setMessage] = useState<string>("");
  const [turn, setTurn] = useState<"player" | "dealer" | "gameOver">("gameOver");
  const [bet, setBet] = useState<string>(""); // Initialize as an empty string
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const socket = io();
    socket.on("userDataUpdated", (updatedUserData: any) => {
      setUserData(updatedUserData); // Update global user data
    });

    return () => {
      socket.off("userDataUpdated");
    };
  }, [setUserData]);

  useEffect(() => {
    const socket = io();
    socket.on("userDataUpdated", (updatedUserData: any) => {
      console.log("User data updated:", updatedUserData); // Log the updated user data
      // Update the wallet display or other components as needed
    });

    return () => {
      socket.off("userDataUpdated");
    };
  }, []);

  const calculateHandValue = (hand: Card[]) => {
    // Implement hand value calculation logic here
    return hand.reduce((total, card) => {
      const valueMap: { [key: string]: number } = {
        Ace: 11,
        King: 10,
        Queen: 10,
        Jack: 10,
      };
      return total + (valueMap[card.value] || parseInt(card.value, 10));
    }, 0);
  };

  const updateGameState = (result: any) => {
    setPlayerHand(result.playerHand || []); // Preserve the player's final hand
    setPlayerHandValue(
      result.playerHandValue ?? calculateHandValue(result.playerHand || [])
    );
    setDealerHand(result.dealerHand || []);
    setDealerHandValue(
      result.dealerHandValue ?? calculateHandValue(result.dealerHand || [])
    );

    // Set the message based on the outcome
    if (result.winnings && result.winnings > 0) {
      setMessage(`You won $${result.winnings}!`); // Show only the winnings message
    } else if (result.message) {
      setMessage(result.message); // Show the default message for other outcomes
    }

    // End the game if the player busts or the game is over
    if (result.playerHandValue > 21 || result.turn === "gameOver") {
      setTurn("gameOver");
    }
  };

  const handleDealCards = async () => {
    const betAmount = parseFloat(bet); // Convert bet to a number
    if (isNaN(betAmount) || betAmount <= 0 || !userId) return; // Validate the bet
    try {
      setIsLoading(true);
      const result = await dealCards(userId, betAmount);

      console.log("Deal response:", result);

      updateGameState(result);
      setTurn("player");
    } catch (error: any) {
      setMessage(error.message || "An error occurred while dealing cards.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleHit = async () => {
    if (!userId) return;
    try {
      setIsLoading(true);
      const result = await hitCard(userId);

      console.log("Hit response:", result);

      if (!result.playerHand || result.playerHand.length === 0) {
        setMessage("Invalid response from server. Please try again.");
        return;
      }

      const newPlayerHand = result.playerHand;
      const newPlayerHandValue = result.playerHandValue ?? calculateHandValue(newPlayerHand);

      setPlayerHand(newPlayerHand);
      setPlayerHandValue(newPlayerHandValue); // Update player hand value
      setMessage(result.message || "");

      if (newPlayerHandValue > 21) {
        // Player busts
        setMessage("You busted! Game over.");
        setTurn("gameOver"); // End the game
      } else {
        // Continue the player's turn
        setTurn("player");
      }
    } catch (error: any) {
      setMessage(error.message || "An error occurred while hitting.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStand = async () => {
    if (!userId || parseFloat(bet) <= 0) return;
    try {
      setIsLoading(true);
      const result = await stand(userId, parseFloat(bet));

      updateGameState(result);

      if (result.turn) {
        setTurn(result.turn);
      } else {
        setTurn("gameOver"); // Default to game over if no turn is returned
      }
    } catch (error: any) {
      setMessage(error.message || "An error occurred while standing.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="blackjack-container">
      <h1 className="text-4xl font-bold mb-8">Blackjack</h1>

      <div className="controls" style={{ height: "80px" }}>
        {turn === "player" ? (
          <>
            {/* Show Hit and Stand buttons during the player's turn */}
            <button
              onClick={handleHit}
              className="bg-green-500 px-6 py-3 rounded text-white text-lg"
              disabled={isLoading || turn !== "player" || !userId}
            >
              {isLoading ? "Processing..." : "Hit"}
            </button>
            <button
              onClick={handleStand}
              className="bg-red-500 px-6 py-3 rounded text-white text-lg ml-4"
              disabled={isLoading || turn !== "player" || !userId}
            >
              {isLoading ? "Processing..." : "Stand"}
            </button>
          </>
        ) : (
          <div className="mb-4">
            {/* Show Bet field and Deal button before the game starts */}
            <input
              type="number"
              value={bet}
              onChange={(e) => setBet(e.target.value)} // Update state directly with the input value
              placeholder="Enter your bet"
              className="px-4 py-2 border rounded"
            />
            <button
              onClick={handleDealCards}
              className="bg-blue-500 px-6 py-3 rounded text-white text-lg ml-4"
              disabled={isLoading || !userId}
            >
              {isLoading ? "Dealing..." : "Deal"}
            </button>
          </div>
        )}
      </div>

      {(turn === "player" || turn === "dealer" || turn === "gameOver") && (
        <div className="hands-container">
          {/* Player's Hand */}
          <div className="hand player-hand">
            <h2 className="text-lg font-bold mb-2">Your Hand</h2>
            <div className="cards">
              {playerHand.map((card, index) => (
                <div key={index} className="card">
                  <img
                    src={getCardImageName(card.value, card.suit)}
                    alt={`${card.value} of ${card.suit}`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/images/cards/default.png";
                    }}
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-lg font-bold">Hand Value: {playerHandValue || 0}</p>
          </div>

          {/* Dealer's Hand */}
          <div className="hand dealer-hand">
            <h2 className="text-lg font-bold mb-2">Dealer's Hand</h2>
            <div className="cards">
              {dealerHand.map((card, index) => (
                <div key={index} className="card">
                  <img
                    src={getCardImageName(card.value, card.suit)}
                    alt={`${card.value} of ${card.suit}`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/images/cards/default.png";
                    }}
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-lg font-bold">
              Hand Value: {turn === "player" ? "?" : dealerHandValue || 0}
            </p>
          </div>
        </div>
      )}

      {message && (
        <p
          className={`mt-8 text-2xl font-bold ${
            message.includes("You won") ? "text-green-500" : "text-red-500"
          }`}
        >
          {message}
        </p>
      )}

      {/* Game Rules */}
      <div className="game-rules mt-8">
        <h2 className="text-xl font-bold mb-4">Game Rules</h2>
        <ul className="list-disc list-inside text-lg">
          <li>The goal is to get as close to 21 as possible without exceeding it.</li>
          <li>Face cards (King, Queen, Jack) are worth 10 points.</li>
          <li>Ace can be worth 1 or 11 points, whichever is more favorable.</li>
          <li>If your hand exceeds 21, you lose (bust).</li>
          <li>Place your bet and click "Deal" to start the game.</li>
        </ul>
      </div>
    </div>
  );
};

export default Blackjack;