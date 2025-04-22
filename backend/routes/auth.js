require('dotenv').config();

const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const CryptoJS = require('crypto-js');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const authMiddleware = require("../middleware/authMiddleware");

// Configure nodemailer with Mailcow
const transporter = nodemailer.createTransport({
  host: 'mail.chaznet.online', // your Mailcow SMTP server
  port: 587, // or 465 for SSL
  secure: false, // true for port 465, false for 587
  auth: {
    user: process.env.MAILCOW_USER, // your Mailcow SMTP username (full email address)
    pass: process.env.MAILCOW_PASS, // your Mailcow SMTP password
  },
});

// Register a new user
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Create a new user (not verified yet)
    const newUser = new User({
      email,
      password: hashedPassword,
      isVerified: false,
      verificationToken,
    });
    await newUser.save();

    // Send verification email
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    const mailOptions = {
      to: newUser.email,
      from: process.env.MAILCOW_FROM,
      subject: "Verify your email",
      html: `<p>Welcome! Please verify your email by clicking <a href="${verifyUrl}">here</a>.</p>`,
    };
    console.log(`[Register] Sending verification email to: ${newUser.email} with link: ${verifyUrl}`);
    await transporter.sendMail(mailOptions);

    res.status(201).json({ message: "Registration successful. Please check your email to verify your account." });
  } catch (err) {
    console.error("[Register] Error during registration:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Email verification route
router.get("/verify-email/:token", async (req, res) => {
  try {
    const user = await User.findOne({ verificationToken: req.params.token });
    if (!user) {
      return res.status(400).send("Invalid or expired verification link.");
    }
    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();
    res.send("Email verified! You can now log in.");
  } catch (err) {
    res.status(500).send("Error verifying email.");
  }
});

/*
// Login an existing user
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Login request received:", { email, password });

    if (!email || !password) {
      console.log("Validation failed: Missing email or password");
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email }).select('+password +isVerified');
    console.log("User document returned from DB:", user);

    if (!user) {
      console.log("User not found for email:", email);
      return res.status(400).json({ message: "User not found" });
    }

    console.log("User isVerified value:", user.isVerified);

    // Only proceed if user is verified
    if (!user.isVerified) {
      console.log("User email not verified for email:", email);
      return res.status(403).json({ message: "Please verify your email before logging in." });
    }

    // --- Only verified users reach this point! ---

    // Check if the user's password is undefined
    if (!user.password) {
      console.log("Error: User's password is undefined in the database");
      return res.status(500).json({ message: "Server error: User password is missing" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    res.json({ token, user: { id: user._id, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong" });
  }
});
*/

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  console.log(`[ForgotPassword] Request received for email: ${email}`);
  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`[ForgotPassword] No user found for email: ${email}`);
      return res.status(400).json({ message: 'No user with that email.' });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();
    console.log(`[ForgotPassword] Token generated and saved for user: ${email}, token: ${token}`);

    // Send email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    const mailOptions = {
      to: user.email,
      from: process.env.MAILCOW_FROM,
      subject: 'Password Reset',
      html: `<p>You requested a password reset.</p>
             <p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`,
    };
    console.log(`[ForgotPassword] Sending email with options:`, mailOptions);

    await transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error(`[ForgotPassword] Error sending email:`, err);
        return res.status(500).json({ message: 'Error sending reset email.', error: err.message });
      } else {
        console.log(`[ForgotPassword] Email sent:`, info);
        return res.json({ message: 'Password reset email sent.' });
      }
    });
  } catch (err) {
    console.error(`[ForgotPassword] Unexpected error:`, err);
    res.status(500).json({ message: 'Error sending reset email.', error: err.message });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ message: 'Invalid or expired token.' });

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password has been reset.' });
  } catch (err) {
    res.status(500).json({ message: 'Error resetting password.' });
  }
});

// Get current user details
router.get("/me", authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const {
      _id: id,
      username,
      profilePicture,
      xp,
      level,
      walletBalance,
      nextBonus
    } = req.user;
    res.json({ id, username, profilePicture, xp, level, walletBalance, nextBonus });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
