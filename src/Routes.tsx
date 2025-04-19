import { Route, Routes, Navigate } from "react-router-dom";
import Home from "./pages/Home/Home";
import Profile from "./pages/Profile/Profile";
import CasePage from "./pages/CasePage/CasePage";
import Marketplace from "./pages/Market/Marketplace";
import CoinFlip from "./pages/Coin/CoinFlipV2";
import CrashGame from "./pages/Crash/Crash";
import Upgrade from "./pages/Upgrade/Upgrade";
import Slot from "./pages/Slot/Slot";
import PrivacyPolicy from "./pages/About/PrivacyPolicy";
import ItemPage from "./pages/Market/ItemPage";
import Blackjack from "./pages/Blackjack/Blackjack";
import ResetPassword from "./pages/Auth/ResetPassword"; // <-- Import your reset password page
import VerifyEmail from "./pages/Auth/VerifyEmail"; // <-- Import your verify email page

const defaultRoutes = (
  <>
    <Route path="/" element={<Home />} />
    <Route path="/profile/:id" element={<Profile />} />
    <Route path="/case/:id" element={<CasePage />} />
    <Route path="/marketplace" element={<Marketplace />} />
    <Route path="/marketplace/item/:itemId" element={<ItemPage />} />
    <Route path="/coinflip" element={<CoinFlip />} />
    <Route path="/crash" element={<CrashGame />} />
    <Route path="/upgrade" element={<Upgrade />} />
    <Route path="/slot" element={<Slot />} />
    <Route path="/blackjack" element={<Blackjack />} />
    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
    <Route path="/reset-password/:token" element={<ResetPassword />} /> {/* <-- Add this line */}
    <Route path="/verify-email/:token" element={<VerifyEmail />} /> {/* <-- Add this line */}
  </>
);

const AppRoutes = () => {
  return (
    <Routes>
      {defaultRoutes}
      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default AppRoutes;
