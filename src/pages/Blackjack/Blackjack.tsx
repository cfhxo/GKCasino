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

  const cardValue = faceCardMap[value] || value.toLowerCase();
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
  const [bet, setBet] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [gameHistory, setGameHistory] = useState<string[]>([]);

  useEffect(() => {
    const socket = io();
    socket.on("userDataUpdated", (updatedUserData: any) => {
      setUserData(updatedUserData);
    });

    return () => {
      socket.off("userDataUpdated");
    };
  }, [setUserData]);

  const calculateHandValue = (hand: Card[]) => {
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
    setPlayerHand(result.playerHand || []);
    setPlayerHandValue(
      result.playerHandValue ?? calculateHandValue(result.playerHand || [])
    );
    setDealerHand(result.dealerHand || []);
    setDealerHandValue(
      result.dealerHandValue ?? calculateHandValue(result.dealerHand || [])
    );

    if (result.winnings && result.winnings > 0) {
      const winMessage = `You won $${result.winnings}!`;
      setMessage(winMessage);
      setGameHistory(prev => [`${new Date().toLocaleTimeString()}: ${winMessage}`, ...prev.slice(0, 9)]);
    } else if (result.message) {
      setMessage(result.message);
      setGameHistory(prev => [`${new Date().toLocaleTimeString()}: ${result.message}`, ...prev.slice(0, 9)]);
    }

    if (result.playerHandValue > 21 || result.turn === "gameOver") {
      setTurn("gameOver");
    }
  };

  const handleDealCards = async () => {
    const betAmount = parseFloat(bet);
    if (isNaN(betAmount) || betAmount <= 0 || !userId) return;
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
      setPlayerHandValue(newPlayerHandValue);
      setMessage(result.message || "");

      if (newPlayerHandValue > 21) {
        const bustMessage = "You busted! Game over.";
        setMessage(bustMessage);
        setGameHistory(prev => [`${new Date().toLocaleTimeString()}: ${bustMessage}`, ...prev.slice(0, 9)]);
        setTurn("gameOver");
      } else {
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
        setTurn("gameOver");
      }
    } catch (error: any) {
      setMessage(error.message || "An error occurred while standing.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#1a1a2e] flex items-center justify-center">
      <div className="w-[900px] flex rounded-lg shadow-lg bg-[#19192b] border border-[#232336]">
        {/* Left Panel */}
        <div className="w-80 p-8 flex flex-col justify-between bg-[#232336] border-r border-[#232336]" style={{ minHeight: 600 }}>
          <div>
            <h1 className="text-3xl font-bold mb-8">Blackjack</h1>
            <div className="mb-6">
              <div className="font-bold mb-2">Place Your Bet</div>
              <input
                type="text"
                value={bet}
                onChange={(e) => setBet(e.target.value)}
                className="bg-[#26263c] border border-gray-700 rounded p-2 mb-2 w-full text-white"
                placeholder="Enter your bet"
              />
              <button
                onClick={handleDealCards}
                disabled={isLoading || turn === "player" || !userId}
                className="bg-[#4169e1] hover:bg-blue-700 text-white py-2 px-4 rounded w-full"
              >
                Deal
              </button>
            </div>
            {turn === "player" && (
              <div className="mb-6 flex gap-2">
                <button
                  onClick={handleHit}
                  disabled={isLoading || turn !== "player"}
                  className="bg-[#3cb371] hover:bg-green-700 text-white py-2 px-4 rounded flex-1"
                >
                  Hit
                </button>
                <button
                  onClick={handleStand}
                  disabled={isLoading || turn !== "player"}
                  className="bg-[#e74c3c] hover:bg-red-700 text-white py-2 px-4 rounded flex-1"
                >
                  Stand
                </button>
              </div>
            )}
            <div className="mb-4">
              <div className="font-bold">Your Hand</div>
              <div>Hand Value: {playerHandValue || 0}</div>
            </div>
            <div className="mb-4">
              <div className="font-bold">Dealer's Hand</div>
              <div>Hand Value: {turn === "player" ? "?" : dealerHandValue || 0}</div>
            </div>
          </div>
          <div>
            <div className="font-bold mb-2">Game History:</div>
            <div className="text-sm text-gray-400 border-t border-[#232336] pt-2">
              {gameHistory.length > 0 ? (
                gameHistory.map((entry, index) => (
                  <div key={index}>{entry}</div>
                ))
              ) : (
                <div>No game history yet</div>
              )}
            </div>
          </div>
        </div>
        {/* Right Panel */}
        <div className="flex-1 p-8 flex flex-col">
          <div className="mb-8 border-b border-[#232336] pb-6">
            <h2 className="font-bold mb-4">Dealer's Hand</h2>
            <div className="flex flex-wrap gap-2">
              {dealerHand.map((card, index) => (
                <div key={index} className="card-container">
                  <img
                    src={getCardImageName(card.value, card.suit)}
                    alt={`${card.value} of ${card.suit}`}
                    className="h-32 rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/images/cards/default.png";
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="font-bold mb-4">Your Hand</h2>
            <div className="flex flex-wrap gap-2">
              {playerHand.map((card, index) => (
                <div key={index} className="card-container">
                  <img
                    src={getCardImageName(card.value, card.suit)}
                    alt={`${card.value} of ${card.suit}`}
                    className="h-32 rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/images/cards/default.png";
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          {message && (
            <div className={`mt-8 p-3 rounded text-center ${message.includes("won") ? "bg-green-900 bg-opacity-50" : "bg-red-900 bg-opacity-50"}`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Blackjack;

