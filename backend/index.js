const authRoutes = require('./routes/auth');
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const socketIO = require("socket.io");
const cronJobs = require("./tasks/cronJobs");
const checkApiKey = require("./middleware/checkApiKey");
const rateLimit = require("express-rate-limit");
const paypalRoutes = require("./routes/paypalRoutes");
const bodyParser = require("body-parser");
const friendRoutes = require("./routes/friendRoutes");

const app = express();
const server = http.createServer(app);
const isDevelopment = process.env.NODE_ENV === "development";

// Initialize Socket.IO
const io = new socketIO.Server(server, {
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = isDevelopment
        ? ["*", "http://localhost:5173"]
        : [/^https:\/\/.*\.ghana-kebabs\.com$/];

      if (!origin || allowedOrigins.includes("*") || allowedOrigins.some((pattern) => pattern.test(origin))) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Now import blackjackRoutes after io is initialized
const blackjackRoutes = require("./routes/blackjackRoutes")(io);

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Failed to connect to MongoDB:", err));

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [/^https:\/\/.*\.ghana-kebabs\.com$/];
    if (!origin || allowedOrigins.some((pattern) => pattern.test(origin))) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  credentials: true,
};

app.use(express.json());
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(checkApiKey);

// Routes

app.use('/auth', authRoutes);
app.use("/users", require("./routes/userRoutes"));
app.use("/cases", require("./routes/caseRoutes"));
app.use("/items", require("./routes/itemRoutes"));
app.use("/marketplace", require("./routes/marketplaceRoutes")(io));
app.use("/admin", require("./routes/adminRoutes"));
app.use("/games", require("./routes/gamesRoutes")(io));
app.use("/api/paypal", paypalRoutes);
app.use("/api/friends", friendRoutes);
app.use("/games/blackjack", blackjackRoutes);
app.use("/blackjack", blackjackRoutes);


// Start the games
require("./games/coinFlipV2")(io);
require("./games/crash")(io);

// Start the cron jobs
cronJobs.startCronJobs(io);

const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Socket logic
let onlineUsers = 0;
const users = {}; // Map to store connected users and their socket IDs

const chatSchema = new mongoose.Schema({
  from: String,
  to: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
});

const Chat = mongoose.model("Chat", chatSchema);
const GlobalChat = require("./models/GlobalChat");

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Handle user joining a chat room
  socket.on("joinRoom", (userId) => {
    console.log(`User ${userId} joined the chat room`);
    socket.join(userId); // Join a room named after the userId

    // Increment the online user count only when joining a chat room
    if (!users[userId]) {
      onlineUsers++;
      users[userId] = socket.id; // Map the userId to the socket ID
      console.log("Current users map:", users);
      console.log("Online users count:", onlineUsers);

      // Emit the updated online user count to all clients
      io.emit("onlineUsers", onlineUsers);
    }
  });

  // Handle user disconnection
  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);

    // Remove the user from the users map and decrement the online user count
    for (const userId in users) {
      if (users[userId] === socket.id) {
        delete users[userId];
        console.log(`User ${userId} removed from users map`);
        onlineUsers--;
        break;
      }
    }

    // Emit the updated online user count to all clients
    io.emit("onlineUsers", onlineUsers);
  });

  // Handle slot spin logic
  socket.on("spinSlots", async (data) => {
    const { userId, betAmount } = data;

    // Perform slot spin logic...

    // Emit wallet update to the user
    const updatedWallet = await getUserWallet(userId);
    console.log("Emitting wallet update:", { userId, balance: updatedWallet });
    socket.emit("walletUpdate", { userId, balance: updatedWallet });
  });

  // Handle fetching chat history
  socket.on("fetchChatHistory", async ({ userId, friendId }) => {
    console.log(`Fetching chat history between ${userId} and ${friendId}`);

    try {
      const chatHistory = await Chat.find({
        $or: [
          { from: userId, to: friendId },
          { from: friendId, to: userId },
        ],
      }).sort({ timestamp: 1 });

      console.log("Chat history retrieved:", chatHistory);
      socket.emit("chatHistory", chatHistory);
    } catch (error) {
      console.error("Error fetching chat history:", error);
    }
  });

  // Handle sending messages
  socket.on("sendMessage", async ({ from, to, message }) => {
    console.log(`Message received: from ${from} to ${to}: ${message}`);

    try {
      const chatMessage = new Chat({ from, to, message });
      await chatMessage.save();

      io.to(to).emit("receiveMessage", { from, to, message });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  });

  // Join the global chat room
  socket.on("joinGlobalChat", async () => {
    console.log(`Socket ${socket.id} joined the global chat`);
    socket.join("globalChat");

    try {
      // Fetch the last 50 messages from the database
      const chatHistory = await GlobalChat.find().sort({ timestamp: -1 }).limit(50).sort({ timestamp: 1 });

      // Send the chat history to the user
      socket.emit("globalChatHistory", chatHistory);
    } catch (error) {
      console.error("Error fetching global chat history:", error);
    }
  });

  // Handle global chat messages
  socket.on("sendGlobalMessage", async ({ username, message }) => {
    console.log(`Global message from ${username}: ${message}`);

    try {
      // Save the message to the database
      const globalMessage = new GlobalChat({ username, message });
      await globalMessage.save();

      // Broadcast the message to everyone in the global chat room
      io.to("globalChat").emit("receiveGlobalMessage", {
        username,
        message,
        timestamp: globalMessage.timestamp,
      });
    } catch (error) {
      console.error("Error saving global message:", error);
    }
  });
});

// Disconnect all connected sockets
for (const [id, socket] of io.of("/").sockets) {
  socket.disconnect(true);
}
