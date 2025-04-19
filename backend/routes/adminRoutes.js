const express = require("express");
const router = express.Router();
const { isAuthenticated, isAdmin } = require("../middleware/authMiddleware");
const User = require("../models/User");
const Case = require("../models/Case");
const Item = require("../models/Item");

const paypal = require('@paypal/checkout-server-sdk');

router.get("/users", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

//create case
router.post("/cases", isAuthenticated, isAdmin, async (req, res) => {
  const { name, description, price, items } = req.body;
  const newCase = new Case({ name, description, price, items });

  try {
    const savedCase = await newCase.save();
    res.status(201).json(savedCase);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

//update case
router.put("/cases/:id", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const updatedCase = await Case.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!updatedCase) {
      return res.status(404).json({ message: "Case not found" });
    }

    res.json(updatedCase);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

//delete case
router.delete("/cases/:id", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const deletedCase = await Case.findByIdAndDelete(req.params.id);

    if (!deletedCase) {
      return res.status(404).json({ message: "Case not found" });
    }

    res.json({ message: "Case deleted" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

//new item
router.post("/items", isAuthenticated, isAdmin, async (req, res) => {
  const { name, description, rarity, image } = req.body;
  const newItem = new Item({ name, description, rarity, image });

  try {
    const savedItem = await newItem.save();
    res.status(201).json(savedItem);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

//update item
router.put("/items/:id", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const updatedItem = await Item.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!updatedItem) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json(updatedItem);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

//delete item
router.delete("/items/:id", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const deletedItem = await Item.findByIdAndDelete(req.params.id);

    if (!deletedItem) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json({ message: "Item deleted" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

//update wallet balance
router.put("/users/:id/wallet", isAuthenticated, isAdmin, async (req, res) => {
  const { walletBalance } = req.body;

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.walletBalance = walletBalance;
    await user.save();

    res.json(user.walletBalance);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

router.post("/paypal/verify", isAuthenticated, async (req, res) => {
  const { orderID, amount } = req.body;
  const userId = req.user.id;

  try {
    const request = new paypal.orders.OrdersGetRequest(orderID);
    const order = await client().execute(request);

    const status = order.result.status;
    const paidAmount = order.result.purchase_units[0].amount.value;

    if (status === "COMPLETED" && parseFloat(paidAmount) === parseFloat(amount)) {
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      user.walletBalance += parseFloat(amount);
      await user.save();

      return res.json({ message: "Wallet updated", walletBalance: user.walletBalance });
    } else {
      return res.status(400).json({ message: "Invalid payment verification" });
    }
  } catch (err) {
    console.error(err.message);
    return res.status(500).send("Server error verifying PayPal payment");
  }
});

//update inventory
router.put(
  "/users/:id/inventory",
  isAuthenticated,
  isAdmin,
  async (req, res) => {
    const { inventory } = req.body;

    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      user.inventory = inventory;
      await user.save();

      res.json(user.inventory);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

module.exports = router;
