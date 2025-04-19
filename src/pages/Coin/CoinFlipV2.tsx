import { useContext, useEffect, useState } from "react";
import SocketConnection from "../../services/socket"
import Coin from "./Coin"
import { motion } from "framer-motion";
import UserContext from "../../UserContext";
import LiveBets from "./LiveBets";

const FRONTEND_VERSION = "1.0.0"; // Update this on each deploy

const socket = SocketConnection.getInstance();

interface GameHistory {
  result: number;
}

const CoinFlip = () => {
  const { userData } = useContext(UserContext);
  const [bet, setBet] = useState(0);
  const [_betAux, setBetAux] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [result, setResult] = useState<number | null>(null);
  const [history, setHistory] = useState<GameHistory[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [countDown, setCountDown] = useState(0);
  const [userGambled, setUserGambled] = useState(false);
  const [gameState, setGameState] = useState<any>({
    heads: { players: {}, bets: {}, choices: {} },
    tails: { players: {}, bets: {}, choices: {} }
  });
  

  // Version check for this page
  useEffect(() => {
    async function checkVersion() {
      try {
        const res = await fetch("/api/version");
        const { version } = await res.json();
        if (version !== FRONTEND_VERSION) {
          alert("A new version is available. Reloading...");
          window.location.reload();
        }
      } catch (err) {}
    }
    checkVersion();
    const interval = setInterval(checkVersion, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const startListener = () => {
      setResult(null);
      setSpinning(true); // Start spinning when the game starts
      setCountDown(0); // Reset the countdown
      setGameEnded(false); // The game has started
    };

    const resultListener = (result: number) => {
      setResult(result);
      setSpinning(false);

      //wait 1 second before adding the result to the history
      setTimeout(() => {
        setHistory((prevHistory) => [...prevHistory, { result }]);
        setGameEnded(true);
        setCountDown(11.4);
        setGameState({
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
        });
      }, 1200);

      setUserGambled(false);
    };

    socket.on("coinFlip:start", startListener);
    socket.on("coinFlip:result", resultListener);

    return () => {
      // Clean up listeners when the component is unmounted
      socket.off("coinFlip:start", startListener);
      socket.off("coinFlip:result", resultListener);
    };
  }, [choice, bet, userGambled]);

  useEffect(() => {
    const gameStateListener = (gameState: any) => {
      setGameState(gameState);

    };

    socket.on("coinFlip:gameState", gameStateListener);


    return () => {
      socket.off("coinFlip:gameState", gameStateListener);
    };
  }, []);

  useEffect(() => {
    function onForceLogout({ reason }: { reason: string }) {
      alert(reason);
      // Optionally, clear user data and redirect to login
      window.location.reload();
    }
    socket.on("forceLogout", onForceLogout);
    return () => {
      socket.off("forceLogout", onForceLogout);
    };
  }, []);

  useEffect(() => {
    if (countDown > 0.1 && !spinning) {
      setTimeout(() => {
        setCountDown(countDown - 0.1);
      }, 100);
    }
  }, [countDown]);

  const handleBet = () => {
    const user = [{
      id: userData?.id,
      name: userData?.username,
      profilePicture: userData?.profilePicture,
      level: userData?.level,
      fixedItem: userData?.fixedItem,
      payout: null
    }];

    socket.emit("coinFlip:bet", user[0], bet, choice);
    socket.emit("coinFlip:choice", user[0], choice);

    setUserGambled(true);
    setBetAux(bet);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#19172D] to-[#212031] flex flex-col items-center pt-0">
      {/* Red banner at the very top */}
    
      {/* Main content container */}
      <div className="flex flex-col lg:flex-row gap-8 mt-24 w-full max-w-6xl px-4">
        {/* Left Panel: Bet Controls */}
        <div className="flex flex-col items-center bg-[#23213a] rounded-xl shadow-lg p-8 w-full lg:w-1/3 min-w-[320px]">
          <h2 className="text-2xl font-bold mb-6 text-white tracking-wide">Coinflip Game</h2>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            value={bet === 0 ? "" : bet}
            placeholder="Enter a bet"
            onChange={e => {
              const value = e.target.value;
              // Only allow digits
              if (/^\d*$/.test(value)) {
                setBet(value === "" ? 0 : Number(value));
              }
            }}
            className="p-3 border-2 border-gray-700 rounded-lg w-full mb-4 bg-[#18162a] text-white text-lg placeholder-gray-400"
          />
          <div className="flex flex-col gap-3 w-full mb-4">
            <label className="text-lg font-semibold text-gray-200 mb-1">Choose a side</label>
            <div className="flex gap-4 w-full">
              {[
                { name: "Heads", color: "red", id: 0 },
                { name: "Tails", color: "green", id: 1 }
              ].map((e) => (
                <button
                  key={e.id}
                  onClick={() => setChoice(e.id)}
                  className={`flex-1 py-2 rounded-lg font-semibold border-2 border-gray-700 transition-all
                    ${choice === e.id ? `bg-${e.color}-600 text-white` : "bg-[#18162a] text-gray-300"}
                  `}
                  
                >
                  {e.name}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleBet}
            className={`w-full py-3 mt-2 rounded-lg bg-indigo-600 text-white font-bold text-lg
              ${bet > 0 && choice !== null && !spinning && userData?.walletBalance >= bet ? "opacity-100 cursor-pointer hover:bg-indigo-700" : "opacity-60 cursor-not-allowed"}
            `}
            disabled={
              bet <= 0 ||
              choice === null ||
              spinning ||
              !userData ||
              userData.walletBalance < bet
            }
          >
            Enter the Game
          </button>
        </div>

        {/* Center Panel: Coin Animation & Countdown */}
        <div className="flex flex-col items-center justify-center bg-[#23213a] rounded-xl shadow-lg p-8 w-full lg:w-2/3">
          <div className="relative w-full flex flex-col items-center">
            <div className="w-full flex items-center justify-center h-[340px]">
              <Coin spinning={spinning} result={result} />
              {gameEnded && (
                <div className="absolute top-2 left-2 bg-black bg-opacity-60 px-4 py-2 rounded text-white font-semibold shadow">
                  Next game in: {countDown.toFixed(1)}
                </div>
              )}
            </div>
            {/* Game History */}
            <div className="w-full mt-6">
              <h3 className="mb-2 text-lg font-semibold text-white">Game History</h3>
              <div className="flex items-center gap-2 overflow-x-auto h-[32px]">
                {history.map((e, i) => (
                  <motion.div
                    key={i}
                    className={`min-w-[32px] min-h-[32px] rounded-full border-2 border-gray-700 ${e.result === 0 ? "bg-red-500" : "bg-green-500"}`}
                    initial={i === history.length - 1 ? { opacity: 0, x: 30 } : {}}
                    animate={i === history.length - 1 ? { opacity: 1, x: 0 } : {}}
                    transition={{ ease: "easeOut", duration: 1 }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Panel: Live Bets */}
      <div className="flex flex-col lg:flex-row gap-8 w-full max-w-6xl px-4 mt-8">
        {gameState &&
          ["Heads", "Tails"].map((e, i) => (
            <div className="flex-1 bg-[#23213a] rounded-xl shadow-lg p-6">
              <LiveBets gameState={gameState} type={e} key={i} />
            </div>
          ))
        }
      </div>
    </div>
  );
};

export default CoinFlip;
