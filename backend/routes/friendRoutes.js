const express = require("express");
const router = express.Router();
const User = require("../models/User"); // Assuming you have a User model
const { ObjectId } = require('mongodb');

// Send a friend request
router.post("/request", async (req, res) => {
    const { senderId, receiverId } = req.body;

    try {
        console.log(`[FriendsService] Friend request initiated.`);
        console.log(`[FriendsService] Sender ID: ${senderId}`);
        console.log(`[FriendsService] Receiver ID: ${receiverId}`);

        const sender = await User.findById(senderId);
        const receiver = await User.findById(receiverId);

        if (!sender || !receiver) {
            console.log(`[FriendsService] Sender or receiver not found.`);
            return res.status(404).json({ message: "Sender or receiver not found" });
        }

        // Check if a request already exists
        const existingRequest = receiver.friendRequests.some(
            (request) => String(request.senderId) === String(senderId)
        );

        if (existingRequest) {
            console.log(`[FriendsService] Friend request already exists.`);
            return res.status(400).json({ message: "Friend request already sent" });
        }

        // Add the friend request
        receiver.friendRequests.push({ senderId });
        await receiver.save();

        console.log(`[FriendsService] Friend request sent successfully.`);
        res.json({ message: "Friend request sent successfully" });
    } catch (error) {
        console.error(`[FriendsService] Error sending friend request:`, error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Accept a friend request
router.post("/accept", async (req, res) => {
    const { userId, senderId } = req.body;

    console.log("Accepting friend request:", { userId, senderId }); // Debugging log

    try {
        if (!ObjectId.isValid(userId) || !ObjectId.isValid(senderId)) {
            return res.status(400).json({ message: "Invalid userId or senderId" });
        }

        const user = await User.findById(userId);
        const sender = await User.findById(senderId);

        if (!user || !sender) {
            return res.status(404).json({ message: "User or sender not found" });
        }

        // Remove the friend request
        user.friendRequests = user.friendRequests.filter(
            (request) => request.senderId.toString() !== senderId
        );

        // Add each other as friends
        user.friends.push(senderId);
        sender.friends.push(userId);

        await user.save();
        await sender.save();

        res.json({ message: "Friend request accepted" });
    } catch (error) {
        console.error("Error accepting friend request:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Decline a friend request
router.post("/decline", async (req, res) => {
    console.log("Request body:", req.body); // Debugging log

    const { userId, senderId } = req.body;

    try {
        // Validate and convert IDs to ObjectId
        if (!ObjectId.isValid(userId) || !ObjectId.isValid(senderId)) {
            return res.status(400).json({ message: "Invalid userId or senderId" });
        }

        const userObjectId = new ObjectId(userId);
        const senderObjectId = new ObjectId(senderId);

        const user = await User.findById(userObjectId).select("+friendRequests"); // Explicitly include friendRequests

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        console.log("Friend requests before update:", user.friendRequests);

        // Ensure friendRequests is initialized as an array
        if (!Array.isArray(user.friendRequests)) {
            user.friendRequests = [];
        }

        // Remove the friend request where senderId matches
        user.friendRequests = user.friendRequests.filter(
            (request) => request.senderId.toString() !== senderObjectId.toString()
        );

        console.log("Friend requests after update:", user.friendRequests);

        // Save the user without triggering validation for other fields
        await user.save({ validateModifiedOnly: true });

        res.json({ message: "Friend request declined" });
    } catch (error) {
        console.error("Error declining friend request:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Fetch pending friend requests
router.get("/requests/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        if (!ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid userId" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Fetch usernames for each senderId in friendRequests
        const friendRequests = await Promise.all(
            user.friendRequests.map(async (request) => {
                const sender = await User.findById(request.senderId);
                return {
                    id: request.senderId.toString(), // senderId
                    name: sender?.username || "Unknown User", // Fetch username or fallback
                };
            })
        );

        console.log("Friend requests for user:", friendRequests); // Debugging log
        res.json(friendRequests);
    } catch (error) {
        console.error("Error fetching friend requests:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Fetch friends list
router.get("/friends/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Fetch usernames for each friendId in friends
        const friends = await Promise.all(
            user.friends.map(async (friendId) => {
                const friend = await User.findById(friendId);
                return {
                    id: friendId.toString(), // friendId
                    name: friend?.username || "Unknown User", // Fetch username or fallback
                    profilePicture: friend?.profilePicture || "", // Optional: Fetch profile picture
                };
            })
        );

        console.log("Friends for user:", friends); // Debugging log
        res.json(friends);
    } catch (error) {
        console.error("Error fetching friends list:", error);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;