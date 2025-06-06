const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middleware/authMiddleware");

const User = require("../models/User");
const Case = require("../models/Case");
const upgradeItems = require("../games/upgrade");
const SlotGameController = require("../games/slot");
const updateLevel = require("../utils/updateLevel");
const { v4: uuidv4 } = require('uuid');
const mongoose = require("mongoose");
const { create } = require("lodash");
const updateWallet = require("../utils/updateWallet");

// Rarities array
const Rarities = [
  { id: "1", chance: 0.7992 },
  { id: "2", chance: 0.1598 },
  { id: "3", chance: 0.032 },
  { id: "4", chance: 0.0064 },
  { id: "5", chance: 0.0026 },
];

// Helper functions
function groupItemsByRarity(items) {
  const itemsByRarity = {};
  items.forEach((item) => {
    if (!itemsByRarity[item.rarity]) {
      itemsByRarity[item.rarity] = [];
    }
    itemsByRarity[item.rarity].push(item);
  });
  return itemsByRarity;
}

function getRandomWeightedItem(items, weightPropertyName) {
  const randomNumber = Math.random();
  let cumulativeWeight = 0;
  for (const item of items) {
    cumulativeWeight += item[weightPropertyName];
    if (randomNumber <= cumulativeWeight) {
      return item;
    }
  }
}

function getRandomItemFromRarity(itemsByRarity, rarity) {
  const items = itemsByRarity[rarity];
  if (!items || items.length === 0) {
    return null;
  }
  return items[Math.floor(Math.random() * items.length)];
}

const getWinningItem = (caseData) => {
  const itemsByRarity = groupItemsByRarity(caseData.items);
  const winningRarity = getRandomWeightedItem(Rarities, "chance");
  let winningItem = getRandomItemFromRarity(itemsByRarity, winningRarity.id);

  if (!winningItem) {
    const existingRarities = Object.keys(itemsByRarity);
    const randomExistingRarity = existingRarities[Math.floor(Math.random() * existingRarities.length)];
    winningItem = getRandomItemFromRarity(itemsByRarity, randomExistingRarity);
  }
  return winningItem;
};

const addUniqueInfoToItem = (item) => {
  return {
    _id: item._id,
    name: item.name,
    image: item.image,
    rarity: item.rarity,
    case: item.case,
    uniqueId: require('uuid').v4(),
  };
};

// Exports
module.exports = (io) => {
  // Routes
  router.post("/openCase/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user;
      const quantityToOpen = req.body.quantity;
      const winningItems = [];

      const caseData = await Case.findById(id).populate("items");

      if (!caseData || !user) {
        if (!caseData) {
          return res.status(404).json({ message: "Case not found" });
        } else {
          return res.status(404).json({ message: "User not found" });
        }
      }

      if (!Number.isInteger(quantityToOpen)) {
        return res.status(400).json({ message: "Quantity to open must be an integer" });
      }

      if (quantityToOpen > 5) {
        return res.status(400).json({ message: "You can only open up to 5 cases at a time" });
      }

      if (quantityToOpen < 1) {
        return res.status(400).json({ message: "You need to open at least 1 case" });
      }

      if (user.walletBalance < (caseData.price * quantityToOpen)) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // --- WALLET DEDUCTION HERE ---
      await updateWallet(user, -(caseData.price * quantityToOpen));
      console.log(`[CaseOpen] Deducted ${caseData.price * quantityToOpen} from user ${user._id}`);

      for (let i = 0; i < quantityToOpen; i++) {
        const winningItem = getWinningItem(caseData);
        const itemWithUniqueId = addUniqueInfoToItem(winningItem);
        winningItems.push(itemWithUniqueId);
      }

      // Add the entire winning items object to the user's inventory
      await User.updateOne(
        { _id: user._id },
        {
          $push: { inventory: winningItems }
        }
      )

      updateLevel(user, caseData.price * quantityToOpen);

      await user.save();

      const winnerUser = {
        name: user.username,
        id: user._id,
        profilePicture: user.profilePicture
      }

      // Emit the caseOpened event
      io.emit("caseOpened", {
        winningItems: winningItems,
        user: winnerUser,
        caseImage: caseData.image,
      });

      res.json({ items: winningItems });

      const userDataPayload = {
        walletBalance: user.walletBalance,
        xp: user.xp,
        level: user.level,
      }
      io.to(user._id.toString()).emit('userDataUpdated', userDataPayload);

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Upgrade items
  router.post("/upgrade", isAuthenticated, async (req, res) => {
    const { selectedItemIds, targetItemId } = req.body;
    const user = req.user._id;


    const result = await upgradeItems(user, selectedItemIds, targetItemId);
    res.status(result.status).json(result);
  });

  // Spin the slot machine
  router.post('/slots', isAuthenticated, async (req, res) => {
    const user = req.user;

    try {
      const { betAmount } = req.body;

      const result = await SlotGameController.spin(user._id, betAmount, io);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });


  return router;
};