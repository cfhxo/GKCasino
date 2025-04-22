import React, { useContext, useState } from "react";
import { login, googleLogin, forgotPassword } from "../../../services/auth/auth";
import api from "../../../services/api"; // Ensure this path points to your API service
import { saveTokens } from "../../../services/auth/authUtils";
import MainButton from "../../MainButton";
import UserContext from "../../../UserContext";
import { Tooltip } from "react-tooltip";
import { GoogleLogin } from '@react-oauth/google';

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loadingButton, setLoadingButton] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const { toggleLogin } = useContext(UserContext);

  const handleSubmit = async (e: React.FormEvent) => {
    setLoadingButton(true);
    e.preventDefault();
    try {
      const response = await api.post('/users/login', { email, password });
      saveTokens(response.data.token, "");
      toggleLogin();
      setLoadingButton(false);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Invalid email or password. Have you verified your email?"
      );
      setLoadingButton(false);
    }
  };

  // Forgot password handler
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotMessage("");
    try {
      // You need to implement forgotPassword in your auth service
      await forgotPassword(forgotEmail);
      setForgotMessage("If this email exists, a reset link has been sent.");
    } catch (err: any) {
      setForgotMessage(
        err.response?.data?.message || "Error sending reset email."
      );
    }
    setForgotLoading(false);
  };

  const handleGoogleLoginSuccess = async (credentialResponse: any) => {
    try {
      const response = await googleLogin(credentialResponse.credential)
      const data = await response;
      if (data.token) {
        saveTokens(data.token, "");
        toggleLogin();
      }
    } catch (error) {
      console.error('Error during Google login', error);
    }
  };

  return (
    <div className="flex items-center justify-center transition-all ">
      <div className="max-w-md w-full space-y-4">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Sign in to your account
          </h2>
        </div>
        {errorMessage && (
          <div className="text-center text-red-500 ">{errorMessage}</div>
        )}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              {[
                {
                  type: "email",
                  name: "email",
                  autoComplete: "email",
                  required: true,
                  value: email,
                  onChange: (e: {
                    target: { value: React.SetStateAction<string> };
                  }) => setEmail(e.target.value),
                  className:
                    "appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none bg-white focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm",
                  placeholder: "Email address",
                },
                {
                  type: "password",
                  name: "password",
                  autoComplete: "current-password",
                  required: true,
                  value: password,
                  onChange: (e: {
                    target: { value: React.SetStateAction<string> };
                  }) => setPassword(e.target.value),
                  className:
                    "appearance-none bg-white rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm",
                  placeholder: "Password",
                },
              ].map((props, index) => {
                return <input key={index} {...props} />;
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Tooltip id="my-tooltip" />
            <div className="text-sm">
              <button
                type="button"
                className="font-medium text-indigo-600 hover:text-indigo-500 bg-transparent border-none p-0"
                onClick={() => setShowForgot(true)}
              >
                Forgot your password?
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 items-center">
            <MainButton
              text="Sign in"
              onClick={() => { }}
              disabled={loadingButton}
              loading={loadingButton}
              submit
            />

            <GoogleLogin
              onSuccess={handleGoogleLoginSuccess}
              onError={() => console.log('Login Failed')}
              auto_select={true}
              theme="outline"
            />
          </div>
        </form>

        {/* Forgot Password Modal */}
        {showForgot && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold mb-2">Reset your password</h3>
              <form onSubmit={handleForgotSubmit}>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  required
                  className="w-full mb-2 px-3 py-2 border border-gray-300 rounded"
                />
                <div className="flex justify-between items-center">
                  <button
                    type="button"
                    className="text-gray-500"
                    onClick={() => {
                      setShowForgot(false);
                      setForgotEmail("");
                      setForgotMessage("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 text-white px-4 py-2 rounded"
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? "Sending..." : "Send reset link"}
                  </button>
                </div>
              </form>
              {forgotMessage && (
                <div className="mt-2 text-center text-green-600">{forgotMessage}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
