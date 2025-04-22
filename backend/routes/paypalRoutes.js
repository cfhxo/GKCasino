const express = require("express");
const router = express.Router();
const paypal = require("@paypal/checkout-server-sdk"); // Import the PayPal SDK
const client = require("../config/paypalClient"); // Import the centralized PayPal client
require("dotenv").config();
const ProcessedEvent = require("../models/ProcessedEvent"); // Import the processed event model

router.post("/create-order", async (req, res) => {
    const { userId, amount, gp } = req.body;

    console.log("Received Amount:", amount); // Log the received amount
    console.log("Received GP:", gp); // Log the received GP value

    if (!userId || !amount || !gp) {
        return res.status(400).json({ message: "Missing required fields: userId, amount, or gp" });
    }

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
        intent: "CAPTURE",
        purchase_units: [
            {
                amount: {
                    currency_code: "AUD",
                    value: amount.toFixed(2), // Use the selected amount
                },
                custom_id: userId, // Associate the order with the user ID
                description: `Top-up GP${gp}`, // Include the GP value in the description
            },
        ],
        application_context: {
            return_url: "https://casino.ghana-kebabs.com/payment-success", // Static return URL
            cancel_url: "https://casino.ghana-kebabs.com/payment-cancel",
        },
    });

    try {
        const order = await client.execute(request);
        const approvalUrl = order.result.links.find(link => link.rel === "approve").href;

        res.json({ id: order.result.id, approvalUrl });
    } catch (err) {
        console.error("PayPal Order Creation Error:", err);
        res.status(500).send("Error creating PayPal order");
    }
});

router.post("/webhook", async (req, res) => {
    const webhookEvent = req.body;

    try {
        console.log("Webhook Event Received:", JSON.stringify(webhookEvent, null, 2));

        // Check if the event has already been processed
        const existingEvent = await ProcessedEvent.findOne({ eventId: webhookEvent.id });
        if (existingEvent) {
            console.log(`Duplicate event received: ${webhookEvent.id}`);
            return res.status(200).send("Event already processed");
        }

        // Save the event ID to the database
        await ProcessedEvent.create({ eventId: webhookEvent.id });

        if (webhookEvent.event_type === "PAYMENT.CAPTURE.COMPLETED") {
            const captureResource = webhookEvent.resource;

            // Log the entire capture resource for debugging
            console.log("Capture Resource:", JSON.stringify(captureResource, null, 2));

            // Extract the custom_id directly from the resource object
            const userId = captureResource.custom_id;

            if (!userId) {
                console.error("custom_id is undefined in capture response");
                return res.status(400).send("custom_id is undefined");
            }

            console.log(`Extracted custom_id: ${userId}`);

            // Find the user in the database
            const user = await User.findById(userId);

            if (!user) {
                console.error(`User not found for custom_id: ${userId}`);
                return res.status(404).send("User not found");
            }

        //    // Add 10,000 to the user's wallet balance
        //    user.walletBalance += 10000;
        //    await user.save();

            console.log(`Wallet updated for User ID: ${userId}, New Balance: ${user.walletBalance}`);
        } else if (webhookEvent.event_type === "CHECKOUT.ORDER.APPROVED") {
            const orderID = webhookEvent.resource.id;

            console.log(`Order Approved. Attempting to capture payment for Order ID: ${orderID}`);

            // Capture the payment manually
            const captureRequest = new paypal.orders.OrdersCaptureRequest(orderID);
            captureRequest.requestBody({}); // Empty body for capture request
            const captureResponse = await client.execute(captureRequest);

            console.log("Capture Response:", JSON.stringify(captureResponse, null, 2));

            if (captureResponse.result.status === "COMPLETED") {
                const userId = captureResponse.result.purchase_units[0]?.custom_id;

                if (!userId) {
                    console.error("custom_id is undefined in capture response");
                    return res.status(400).send("custom_id is undefined");
                }

                console.log(`Extracted custom_id from capture response: ${userId}`);

                // Find the user in the database
                const user = await User.findById(userId);

                if (!user) {
                    console.error(`User not found for custom_id: ${userId}`);
                    return res.status(404).send("User not found");
                }

                // Add 10,000 to the user's wallet balance
                user.walletBalance += 10000;
                await user.save();

                console.log(`Wallet updated for User ID: ${userId}, New Balance: ${user.walletBalance}`);
            } else {
                console.error("Payment capture failed or not completed.");
            }
        }

        res.status(200).send("Webhook received");
    } catch (err) {
        console.error("Error handling webhook:", err);
        res.status(500).send("Error handling webhook");
    }
});

router.post("/verify-payment", async (req, res) => {
    const { orderID } = req.body;

    try {
        const request = new paypal.orders.OrdersGetRequest(orderID);
        const order = await client.execute(request);

        if (order.result.status === "COMPLETED") {
            const userId = order.result.purchase_units[0]?.custom_id;
            const description = order.result.purchase_units[0]?.description; // Extract the description
            const gp = description?.match(/GP(\d+)/)?.[1]; // Extract GP value from the description

            if (!userId) {
                return res.status(400).json({ success: false, message: "custom_id is undefined" });
            }

            const user = await User.findById(userId);

            if (!user) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            // Add the extracted GP value to the user's wallet balance
            user.walletBalance += parseInt(gp, 10);
            await user.save();

            console.log(`Wallet updated for User ID: ${userId}, New Balance: ${user.walletBalance}`);
            return res.json({ success: true });
        } else {
            return res.status(400).json({ success: false, message: "Payment not completed" });
        }
    } catch (err) {
        console.error("Error verifying payment:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

module.exports = router;