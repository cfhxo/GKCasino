import React, { useState, useEffect, useContext } from "react";
import "./Blackjack.css";
import { dealCards, hitCard, stand } from "../../services/games/GamesServices";
import UserContext from "../../UserContext";
import { io } from "socket.io-client";

interface Card {
  suit: string;
  value: string;
  faceDown?: boolean;
  id: string; // Added unique card ID
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

  useEffect(() => {
    const socket = io();
    socket.on("userDataUpdated", (updatedUserData: any) => {
      setUserData(updatedUserData);
    });

    return () => {
      socket.off("userDataUpdated");
    };
  }, [setUserData]);

  useEffect(() => {
    console.log("Player Hand:", playerHand);
    console.log("Dealer Hand:", dealerHand);
  }, [playerHand, dealerHand]);

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
      setMessage(`You won $${result.winnings}!`);
    } else if (result.message) {
      setMessage(result.message);
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
        setMessage("You busted! Game over.");
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
      setTurn(result.turn || "gameOver");
    } catch (error: any) {
      setMessage(error.message || "An error occurred while standing.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-screen flex flex-col items-center justify-center gap-12">
      <div className="flex bg-[#212031] rounded flex-col lg:flex-row relative" style={{ width: "1140px" }}>
        {/* Side Menu */}
        <div className="side-menu flex flex-col items-center gap-6 border-r border-gray-700 py-6 px-6">
          {/* Bet Input */}
          <input
            type="number"
            value={bet}
            onKeyDown={(event) => {
              if (!/[0-9]/.test(event.key) && event.key !== "Backspace") {
                event.preventDefault();
              }
            }}
            onChange={(e) => {
              const value = Number(e.target.value);
              setBet((value < 0 ? 0 : value).toString());
            }}
            className="p-3 border rounded w-3/4 lg:w-full text-lg h-14"
            placeholder="Enter your bet"
          />

          {/* Deal Section */}
          <div className="flex flex-col gap-4 w-full">
            <button
              onClick={handleDealCards}
              className={`p-3 border rounded w-full text-lg h-14 ${
                isLoading || !userId || turn !== "gameOver"
                  ? "bg-blue-900 text-gray-800 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              }`}
              disabled={isLoading || !userId || turn !== "gameOver"}
            >
              {isLoading ? "Dealing..." : "Deal"}
            </button>
          </div>

          {/* Hit/Stand Section */}
          <div className="flex flex-col gap-4 w-full">
            <h3 className="text-lg font-bold text-center text-white">Actions</h3>
            <button
              onClick={handleHit}
              className={`p-3 border rounded w-full text-lg h-14 ${
                isLoading || turn !== "player"
                  ? "bg-green-900 text-gray-800 cursor-not-allowed"
                  : "bg-green-500 hover:bg-green-600 text-white"
              }`}
              disabled={isLoading || turn !== "player"}
            >
              {isLoading ? "Processing..." : "Hit"}
            </button>
            <button
              onClick={handleStand}
              className={`p-3 border rounded w-full text-lg h-14 ${
                isLoading || turn !== "player"
                  ? "bg-red-900 text-gray-800 cursor-not-allowed"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }`}
              disabled={isLoading || turn !== "player"}
            >
              {isLoading ? "Processing..." : "Stand"}
            </button>
          </div>
        </div>

        {/* Game Area */}
        <div className="game-area p-6">
          <div className="blackjack-container">
            {/* Dealer's Hand */}
            <div className="hand">
              <h2>Dealer's Hand</h2>
              <div className="cards">
                {dealerHand.length > 0 ? (
                  dealerHand.map((card) => (
                    <img
                      key={card.id}
                      src={
                        card.faceDown
                          ? "/images/cards/back.png"
                          : getCardImageName(card.value, card.suit)
                      }
                      alt={card.faceDown ? "Face Down Card" : `${card.value} of ${card.suit}`}
                      className="card"
                    />
                  ))
                ) : (
                  <>
                    <img
                      src="/images/cards/back.png"
                      alt="Face Down Card"
                      className="card"
                    />
                    <img
                      src="/images/cards/back.png"
                      alt="Face Down Card"
                      className="card"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Player's Hand */}
            <div className="hand">
              <h2>Your Hand</h2>
              <div className="cards">
                {playerHand.length > 0 ? (
                  playerHand.map((card) => (
                    <img
                      key={card.id}
                      src={getCardImageName(card.value, card.suit)}
                      alt={`${card.value} of ${card.suit}`}
                      className="card"
                    />
                  ))
                ) : (
                  <>
                    <img
                      src="/images/cards/back.png"
                      alt="Face Down Card"
                      className="card"
                    />
                    <img
                      src="/images/cards/back.png"
                      alt="Face Down Card"
                      className="card"
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Hand Values Section */}
          <div className="hand-values">
            <div className="flex flex-col items-center">
              <h4 className="text-lg font-bold">Player</h4>
              <p className="text-xl">{playerHandValue || 0}</p>
            </div>
            <div className="flex flex-col items-center">
              <h4 className="text-lg font-bold">Dealer</h4>
              <p className="text-xl">{turn === "player" ? "?" : dealerHandValue || 0}</p>
            </div>
            {/* Message Section */}
            {message && (
              <div className="message">
                <h4 className="text-lg font-bold"> </h4>
                <p>{message}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Blackjack;