import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";

import "./VerifyEmail.css"; // Adjust the path as necessary

const VerifyEmail: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [message, setMessage] = useState("Verifying...");
  const [showRedirect, setShowRedirect] = useState(false);
  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!token) {
      setMessage("No verification token provided.");
      setShowRedirect(true);
      timeoutRef.current = setTimeout(() => navigate("/"), 5000);
      console.log("[VerifyEmail] No token in URL params.");
      return;
    }
    console.log("[VerifyEmail] Sending verification request for token:", token);
    fetch(`https://backend.casino.ghana-kebabs.com/users/verify-email/${token}`)
      .then(async res => {
        const text = await res.text();
        console.log("[VerifyEmail] Server response:", text);
        setMessage(text);
        setShowRedirect(true);
        timeoutRef.current = setTimeout(() => navigate("/"), 5000);
      })
      .catch((err) => {
        console.error("[VerifyEmail] Error during verification:", err);
        setMessage("Verification failed.");
        setShowRedirect(true);
        timeoutRef.current = setTimeout(() => navigate("/"), 5000);
      });

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [token, navigate]);

  return (
    <div className="verify-email-fullscreen">
      <div className="bg-white bg-opacity-95 rounded-xl shadow-2xl p-8 w-full max-w-md flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold mb-4 text-indigo-700 drop-shadow">Email Verification</h2>
        <p className="text-lg text-gray-800 mb-2 text-center">{message}</p>
        {showRedirect && (
          <p className="text-sm text-gray-500 mt-2 text-center">Redirecting in 5 seconds...</p>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;