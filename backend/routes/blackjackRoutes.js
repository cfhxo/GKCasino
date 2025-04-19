const BlackjackGameController = require('../games/blackjack');

module.exports = (io) => {
  const express = require("express");
  const router = express.Router();

  // Route for dealing cards
  router.post("/deal", async (req, res) => {
    try {
      console.log("Received payload for /deal:", req.body);
      const { userId, betAmount } = req.body;
      const result = await BlackjackGameController.play(userId, betAmount, io); // Pass io here
      res.json(result);
    } catch (error) {
      console.error("Error in /deal:", error.message);
      res.status(400).json({ message: error.message });
    }
  });

  // Route for hitting
  router.post("/hit", async (req, res) => {
    try {
      console.log("Received payload for /hit:", req.body);
      const { userId } = req.body;
      const result = await BlackjackGameController.hit(userId, io); // Pass io here
      res.json(result);
    } catch (error) {
      console.error("Error in /hit:", error.message);
      res.status(400).json({ message: error.message });
    }
  });

  // Route for standing
  router.post("/stand", async (req, res) => {
    console.log("=== /stand route hit ==="); // Log to confirm the route is hit
    try {
      console.log("Received payload for /stand:", req.body); // Log the incoming payload
      const { userId, betAmount } = req.body; // Extract betAmount
      if (!userId || !betAmount) {
        console.error("Missing userId or betAmount in request payload.");
        throw new Error("Missing userId or betAmount in request payload.");
      }
      const result = await BlackjackGameController.stand(userId, betAmount, io); // Pass betAmount
      console.log("Stand result:", result); // Log the result
      res.json(result); // Return the result as JSON
    } catch (error) {
      console.error("Error in /stand route:", error.message);
      res.status(400).json({ message: error.message }); // Return a valid JSON error response
    }
  });

  return router;
};