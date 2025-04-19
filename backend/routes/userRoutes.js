const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { check, validationResult } = require("express-validator");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const User = require("../models/User");
const Notification = require("../models/Notification");
const authMiddleware = require("../middleware/authMiddleware");
const getRandomPlaceholderImage = require("../utils/placeholderImages");
const { ObjectId } = require('mongodb');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const bcryptTest = require("bcrypt");

async function testBcrypt() {
  const plainTextPassword = "China666";
  const hashedPassword = "$2a$10$1hMVsQk9F/BuqTgF.0TTiOB5C9kLNH2YvXil6pdewNQ4vhAEcfBja"; // Replace with the actual hashed password from your database

  const isMatch = await bcryptTest.compare(plainTextPassword, hashedPassword);
  console.log("Bcrypt test result:", isMatch);
}

testBcrypt();

// Register user with email verification
router.post(
  "/register",
  [
    check("email", "Please include a valid email").isEmail(),
    check(
      "password",
      "Please enter a password with 6 or more characters"
    ).isLength({ min: 6 }),
    check("username", "Please enter a valid username").not().isEmpty(),
    check("isAdmin", "isAdmin must be a boolean value").optional().isBoolean(),
  ],
  async (req, res) => {
    // Handle validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, username, profilePicture, isAdmin } = req.body;

    try {
      // Check if user already exists
      let userMail = await User.findOne({ email });
      if (userMail) {
        return res.status(400).json({ errors: [{ message: "Email already registered" }] });
      }
      let userName = await User.findOne({ username });
      if (userName) {
        return res.status(400).json({ errors: [{ message: "Username already registered" }] });
      }

      if (!isValidBase64(profilePicture) && profilePicture !== "") {
        return res.status(400).json({ errors: [{ message: "Invalid profile picture" }] });
      }

      // Hash the password
      const saltRounds = 10;
      const salt = await bcrypt.genSalt(saltRounds);
      const normalizedPassword = password.normalize('NFKC');
      const hashedPassword = await bcrypt.hash(normalizedPassword, salt);

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");

      // Create new user (not verified yet)
      const user = new User({
        email,
        username,
        profilePicture: profilePicture || getRandomPlaceholderImage(),
        isAdmin,
        password: hashedPassword,
        isVerified: false,
        verificationToken,
      });

      await user.save();

      // Send verification email
      const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
      const transporter = nodemailer.createTransport({
        host: process.env.MAILCOW_HOST || 'mail.chaznet.online',
        port: 587,
        secure: false,
        auth: {
          user: process.env.MAILCOW_USER,
          pass: process.env.MAILCOW_PASS,
        },
      });
      const mailOptions = {
        to: user.email,
        from: process.env.MAILCOW_FROM,
        subject: "Verify your email",
        html: `<p>Welcome! Please verify your email by clicking <a href="${verifyUrl}">here</a>.</p>`,
      };
      console.log(`[Register] Sending verification email to: ${user.email} with link: ${verifyUrl}`);
      await transporter.sendMail(mailOptions);

      res.status(201).json({ message: "Registration successful. Please check your email to verify your account." });
    } catch (err) {
      console.error("Registration failed:", err);
      res.status(500).json({ errors: ["Registration failed. Please try again."] });
    }
  }
);

// Email verification route
router.get("/verify-email/:token", async (req, res) => {
  try {
    const token = req.params.token;
    console.log(`[VerifyEmail] Received token: ${token}`);
    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      console.log(`[VerifyEmail] No user found for token: ${token}`);
      return res.status(400).send("Invalid or expired verification link.");
    }
    console.log(`[VerifyEmail] Found user: ${user.email}, isVerified: ${user.isVerified}`);
    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();
    console.log(`[VerifyEmail] User ${user.email} verified successfully.`);
    res.send("Email verified! You can now log in.");
  } catch (err) {
    console.error("[VerifyEmail] Error verifying email:", err);
    res.status(500).send("Error verifying email.");
  }
}
);

// Login user (Different routhe is being used now (auth.js))

router.post(
  "/login",
  [
    check("email", "Please include a valid email").isEmail(),
    check("password", "Password is required").exists(),
  ],
  async (req, res) => {
    console.log("Incoming request body:", req.body);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("Validation errors:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const trimmedPassword = password.trim();
    console.log("Login attempt with email:", email);

    try {
      // Check if user exists
      const user = await User.findOne({ email }).select('+password');
      console.log("User found:", user);

      if (!user) {
        console.log("User not found");
        return res.status(400).json({ errors: [{ msg: "Invalid Credentials" }] });
      }

      if (!user.isVerified) {
        return res.status(403).json({ errors: [{ msg: "Please verify your email before logging in." }] });
      }

      // Compare passwords using bcrypt
      console.log("Password provided (plain-text):", trimmedPassword);
      console.log("Password provided (plain-text) as byte array:", [...Buffer.from(trimmedPassword)]);
      console.log("Password stored in database (hashed):", user.password);
      const normalizedPassword = trimmedPassword.normalize('NFKC');
      const isMatch = await bcrypt.compare(normalizedPassword, user.password);
      console.log("Password match result:", isMatch);

      if (!isMatch) {
        console.log("Password does not match");
        return res.status(400).json({ errors: [{ msg: "Invalid Credentials" }] });
      }

      // Generate and send JWT
      const payload = { userId: user.id };
      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: "30d" },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error("Error during login:", err.message);
      res.status(500).send("Server error");
    }
  }
);


// Google login
router.post('/googlelogin', async (req, res) => {
  const { token } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const googlePayload = ticket.getPayload();

    // Check if user exists in your DB or create a new one
    let user = await User.findOne({ email: googlePayload.email });
    if (!user) {
      let username = googlePayload.name;
      let existingUser = await User.findOne({ username });
      while (existingUser) {
        // Handle username conflict
        username = googlePayload.name + Math.floor(Math.random() * 1000);
        existingUser = await User.findOne({ username });
      }
      user = new User({
        email: googlePayload.email,
        username: username,
        profilePicture: googlePayload.picture,
      });
      await user.save();
    }
    // Generate and send JWT
    const payload = { userId: user.id };
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "30d" },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error in Google Authentication' });
  }
});

// Get notifications
router.get("/notifications", authMiddleware.isAuthenticated, async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  try {
    const notifications = await Notification.find({ receiverId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get logged-in user data
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

// Fetch top players
router.get('/topPlayers', async (req, res) => {
  try {
    const topPlayers = await User.find({})
      .sort({ weeklyWinnings: -1 })
      .limit(10) // Top 10 players
      .select('username weeklyWinnings profilePicture level fixedItem');

    res.json(topPlayers);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Fetch user ranking
router.get('/ranking', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const allUsers = await User.find({}).sort({ weeklyWinnings: -1 }).select('username weeklyWinnings');
    const userIndex = allUsers.findIndex(u => u.id === req.user.id);

    let start = userIndex - 3; // Fetch 3 users above
    let end = userIndex + 4; // Fetch 3 users below (+1 for inclusive)

    // Adjust if start or end goes out of bounds
    if (start < 0) {
      start = 0;
      end = Math.min(7, allUsers.length); // Adjust end if start is adjusted
    }
    if (end > allUsers.length) {
      end = allUsers.length;
      start = Math.max(0, end - 7); // Adjust start if end is adjusted
    }

    const surroundingUsers = allUsers.slice(start, end);

    res.json({ ranking: userIndex + 1, users: surroundingUsers });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by id
router.get("/:id", async (req, res) => {
  try {
    res.json(
      await User.findById(req.params.id)
        .select("-inventory")
        .select("-password")
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Update wallet balance
router.put("/wallet", authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const { amount } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update wallet balance
    user.walletBalance += amount;
    await user.save();

    res.json(user.walletBalance);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Add item to user inventory
router.post("/inventory", authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const { itemId } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Add item to inventory
    user.inventory.push(itemId);
    await user.save();

    res.json(user.inventory);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Remove item from user inventory
router.delete(
  "/inventory/:itemId",
  authMiddleware.isAuthenticated,
  async (req, res) => {
    try {
      const { itemId } = req.params;

      const user = await User.findById(req.user._id);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove item from inventory
      user.inventory = user.inventory.filter(
        (item) => item.toString() !== itemId
      );
      await user.save();

      res.json(user.inventory);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// Get user inventory
const ITEMS_PER_PAGE = 18;

router.get("/inventory/:userId", async (req, res) => {

  try {
    const { userId } = req.params;
    const { name, rarity, sortBy, order, caseId } = req.query;
    const page = parseInt(req.query.page) || 1;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let query = { _id: user._id };  // Default to filtering by user ID

    // Count Pipeline
    let countPipeline = [
      { $match: query },
      { $project: { inventory: 1 } },
      { $unwind: "$inventory" }
    ];

    if (caseId) {
      countPipeline.push({ $match: { "inventory.case": new ObjectId(caseId) } });
    }

    if (name) {
      countPipeline.push({ $match: { "inventory.name": new RegExp(name, "i") } });
    }
    if (rarity) {
      countPipeline.push({ $match: { "inventory.rarity": rarity } });
    }

    countPipeline.push({ $count: "totalItems" });

    const totalCount = await User.aggregate(countPipeline);
    const totalItems = totalCount.length ? totalCount[0].totalItems : 0;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    // Main Pipeline
    let pipeline = [
      { $match: query },
      { $project: { inventory: 1 } },
      { $unwind: "$inventory" }
    ];

    if (caseId) {
      pipeline.push({ $match: { "inventory.case": new ObjectId(caseId) } });
    }


    if (name) {
      pipeline.push({ $match: { "inventory.name": new RegExp(name, "i") } });
    }
    if (rarity) {
      pipeline.push({ $match: { "inventory.rarity": rarity } });
    }

    let sortQuery = {};
    if (sortBy) {
      if (sortBy === "older") {
        pipeline.push({ $sort: { "inventory._id": -1 } });
      } else if (sortBy === "mostRare") {
        sortQuery["inventory.rarity"] = -1;
        pipeline.push({ $sort: sortQuery });
      } else if (sortBy === "mostCommon") {
        sortQuery["inventory.rarity"] = 1;
        pipeline.push({ $sort: sortQuery });
      } else {
        sortQuery[`inventory.${sortBy}`] = order === 'asc' ? 1 : -1;
        pipeline.push({ $sort: sortQuery });
      }
    }

    pipeline.push(
      { $group: { _id: null, inventory: { $push: "$inventory" } } },
      { $project: { inventory: { $slice: ["$inventory", (page - 1) * ITEMS_PER_PAGE, ITEMS_PER_PAGE] } } }
    );

    const inventoryItems = await User.aggregate(pipeline);

    res.json({
      items: inventoryItems[0]?.inventory || [],
      currentPage: page,
      totalPages: totalPages,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Set fixed item
router.put("/fixedItem", authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const { item } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if item is in user's inventory
    const inventoryItemIndex = user.inventory.find((inventoryItem) => {
      return inventoryItem._id.toString() === item.toString();
    });


    if (inventoryItemIndex === null || inventoryItemIndex === undefined) {
      return res.status(404).json({ message: "Item not found in inventory" });
    }


    // Update fixed item, keeping the same description
    user.fixedItem = {
      name: inventoryItemIndex.name,
      image: inventoryItemIndex.image,
      rarity: inventoryItemIndex.rarity,
      description: user.fixedItem.description,
    };
    await user.save();

    res.json(user.fixedItem);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// update fixed item description
router.put(
  "/fixedItem/description",
  authMiddleware.isAuthenticated,
  async (req, res) => {
    try {
      const { description } = req.body;

      const user = await User.findById(req.user._id);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update fixed item description (crop to 50 characters)
      user.fixedItem.description = description.substring(0, 50);

      await user.save();

      res.json(user.fixedItem);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

router.post('/claimBonus', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentTime = new Date();
    const nextBonusTime = new Date(user.nextBonus);

    // Check if bonus is available
    if (currentTime >= nextBonusTime) {
      let currentBonus = user.bonusAmount; // Get current bonus amount
      user.walletBalance += user.bonusAmount; // Add bonus to wallet

      user.nextBonus = new Date(currentTime.getTime() + 8 * 60000);      // Set next bonus time to 8 min later
      // Set bonus amount to 200 * 10% of the user current level
      user.bonusAmount = Math.floor(200 * (1 + 0.1 * user.level));

      // Save updated user
      await user.save();

      res.json({ message: `Claimed G₽${currentBonus}!`, value: currentBonus, nextBonus: user.nextBonus });

    } else {
      res.status(400).json({ message: 'Bonus not yet available' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});



const isValidBase64 = (str) => {
  const base64Regex = /^data:image\/(png|jpeg|jpg);base64,/;
  return base64Regex.test(str);
};


router.put('/profilePicture', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const newProfilePicture = req.body.image;

    if (!isValidBase64(newProfilePicture)) {
      return res.status(400).json({ message: 'Invalid image format' });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.profilePicture = newProfilePicture;

    await user.save();

    res.json({ message: 'Profile picture updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
