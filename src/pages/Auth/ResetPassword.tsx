import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const ResetPassword: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    if (!password || !confirm) {
      setMessage("Please fill out both fields.");
      return;
    }
    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("https://backend.casino.ghana-kebabs.com/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Password reset successful! Redirecting to login...");
        setTimeout(() => navigate("/"), 2000);
      } else {
        setMessage(data.message || "Error resetting password.");
      }
    } catch (err) {
      setMessage("Network error. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="flex justify-center items-center bg-gradient-to-br from-indigo-900 via-purple-900 to-gray-900 w-full min-h-[90vh] py-32">
      <div className="w-full max-w-md bg-white bg-opacity-90 rounded-xl shadow-2xl p-8">
        <h2 className="text-3xl font-extrabold text-center text-indigo-700 mb-6 drop-shadow">
          Reset Your Password
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="password"
            placeholder="New password"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Confirm new password"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
          />
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-semibold transition"
            disabled={loading}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
          {message && (
            <div
              className={`mt-2 text-center text-sm ${
                message.includes("successful")
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;