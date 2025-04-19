import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Suspense, lazy, useEffect, useState } from "react";
import UserContext from "./UserContext";
import { SkeletonTheme } from "react-loading-skeleton";
import "react-tooltip/dist/react-tooltip.css";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import SocketConnection from "./services/socket";
import ScrollToTop from "./components/ScrollToTop";
import { GoogleOAuthProvider } from '@react-oauth/google';
import Footer from "./components/Footer";
import { disableReactDevTools } from '@fvilers/disable-react-devtools';
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import PaymentSuccess from "./components/PaymentSuccess";
import ChatOverlay from "./components/ChatOverlay/ChatOverlay";

const Header = lazy(() => import("./components/header/index"));
const AppRoutes = lazy(() => import("./Routes"));
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "722834551475-bko9ovoph3hjdoqf0809nrjos3rf7hcl.apps.googleusercontent.com";
const environment = import.meta.env.VITE_NODE_ENV || "";

import { User } from './components/Types';

interface userDataSocketProps {
  walletBalance: number;
  xp: number;
  level: number;
}

const FRONTEND_VERSION = "1.0.0"; // Update this on each deploy

function App() {
  const [isLogged, setIsLogged] = useState<boolean>(false);
  const [onlineUsers, setOnlineUsers] = useState<number>(0);
  const [userData, setUserData] = useState<User | null>(null);
  const [recentCaseOpenings, setRecentCaseOpenings] = useState<any>([]);
  const [openUserFlow, setOpenUserFlow] = useState<boolean>(false);
  const [joinedRoom, setJoinedRoom] = useState<boolean>(false);
  const [notification, setNotification] = useState<any>();

  const socket = SocketConnection.getInstance();

  if (environment === "production") {
    disableReactDevTools();
  }

  const userDataSocket = () => {
    socket.on("userDataUpdated", (payload: userDataSocketProps) => {
      setUserData(prevUserData => prevUserData ? {
        ...prevUserData,
        walletBalance: payload.walletBalance,
        xp: payload.xp,
        level: payload.level
      } : null);
    });

    return () => {
      socket.off("userDataUpdated");
    };
  };

  useEffect(() => {
    socket.on("onlineUsers", (count) => {
      setOnlineUsers(count);
    });

    socket.on("caseOpened", (data) => {
      data.timestamp = Date.now();

      // Wait 7.5 seconds to show the notification
      setTimeout(() => {
        setRecentCaseOpenings((prevOpenings: any) => [data, ...prevOpenings]);
      }, 7500);
    });

    userDataSocket();

    return () => {
      socket.disconnect();
    };
  }, [socket]);

  useEffect(() => {
    if (userData && userData.id && !joinedRoom) {
      socket.emit("joinRoom", userData.id);
      setJoinedRoom(true);
    }
  }, [joinedRoom, socket, userData]);

  useEffect(() => {
    socket.on("newNotification", (notification) => {
      setNotification(notification);
    });

    return () => {
      socket.off("newNotification");
    };
  }, [socket]);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token !== null) {
      setIsLogged(true);
    }
  }, [isLogged]);

  const toggleLogin = () => {
    setIsLogged(!isLogged);
  };

  const toogleUserData = (data: any) => {
    setUserData(data);
  };

  const toogleUserFlow = (state: boolean) => {
    setOpenUserFlow(state);
  };

  // If there's more than 20 items, remove the last one from the array
  useEffect(() => {
    if (recentCaseOpenings.length > 20) {
      setRecentCaseOpenings((prevOpenings: any) => {
        prevOpenings.pop();
        return prevOpenings;
      });
    }
  }, [recentCaseOpenings]);

  useEffect(() => {
    async function checkVersion() {
      const res = await fetch("/api/version"); // Create this endpoint in backend
      const { version } = await res.json();
      if (version !== FRONTEND_VERSION) {
        alert("A new version is available. Reloading...");
        window.location.reload();
      }
    }
    checkVersion();
    const interval = setInterval(checkVersion, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <PayPalScriptProvider options={{ clientId: "AV3rsAWJDS6l47hqT8O7fgZJmdGxBhmF4anv0I19ls0ozubxS_cpcbmp4qz9g6zldxQrC9xMvN_aj0X6" }}>
      <div className="flex flex-col min-h-screen items-start justify-start bg-[#151225] text-white">
        <UserContext.Provider
          value={{
            isLogged,
            toggleLogin,
            userData,
            toogleUserData,
            openUserFlow,
            toogleUserFlow
          }}
        >
          <Suspense fallback={<div />}>
            <GoogleOAuthProvider clientId={clientId}>
              <Router>
                <SkeletonTheme highlightColor="#161427" baseColor="#1c1a31">
                  <ScrollToTop />
                  <ToastContainer
                    position="top-right"
                    autoClose={4000}
                    hideProgressBar={false}
                    closeOnClick={false}
                    pauseOnHover={true}
                    draggable={false}
                    theme="dark"
                  />
                  <Header
                    onlineUsers={onlineUsers}
                    recentCaseOpenings={recentCaseOpenings}
                    notification={notification}
                    setNotification={setNotification}
                  />
                  <div className="flex w-full">
                    <Routes>
                      <Route path="/payment-success" element={<PaymentSuccess />} />
                      <Route path="/*" element={<AppRoutes />} />
                    </Routes>
                  </div>
                  <div className="w-full pt-12">
                    <Footer />
                  </div>
                  <ChatOverlay />
                </SkeletonTheme>
              </Router>
            </GoogleOAuthProvider>
          </Suspense>
        </UserContext.Provider>
      </div>
    </PayPalScriptProvider>
  );
}

export default App;
