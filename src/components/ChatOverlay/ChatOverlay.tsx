import React, { useState, useEffect, useContext, useRef } from "react";
import UserContext from "../../UserContext"; // Adjust the path as needed
import { io } from "socket.io-client";
import { toast } from "react-toastify";

const socket = io("https://backend.casino.ghana-kebabs.com");

interface Friend {
    id: string;
    name: string;
    profilePicture: string;
}

interface FriendRequest {
    id: string;
    name: string;
}

interface ChatMessage {
    from: string;
    message: string;
    timestamp: string;
}

interface GlobalMessage {
    username: string;
    message: string;
    timestamp: string;
}

const ChatOverlay: React.FC = () => {
    const [activeTab, setActiveTab] = useState<"friends" | "requests" | "chat" | "global">("friends");
    const [friends, setFriends] = useState<Friend[]>([]);
    const [requests, setRequests] = useState<FriendRequest[]>([]);
    const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [message, setMessage] = useState<string>("");
    const [globalMessages, setGlobalMessages] = useState<GlobalMessage[]>([]);
    const [globalMessage, setGlobalMessage] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(true);
    const [isCollapsed, setIsCollapsed] = useState<boolean>(true);
    const { userData } = useContext(UserContext);
    const userId = userData?.id;
    const username = userData?.username || "Anonymous";
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const globalChatRef = useRef<HTMLDivElement>(null);

    // Log state changes for debugging
    useEffect(() => {
        console.log("Active Tab:", activeTab);
        console.log("Selected Friend:", selectedFriend);
        console.log("Messages:", messages);
    }, [activeTab, selectedFriend, messages]);

    // Log when the socket connects or disconnects
    useEffect(() => {
        socket.on("connect", () => {
            console.log("Connected to socket server with ID:", socket.id);
        });

        socket.on("disconnect", () => {
            console.log("Disconnected from socket server");
        });

        return () => {
            socket.off("connect");
            socket.off("disconnect");
        };
    }, []);

    useEffect(() => {
        if (userId) {
            console.log(`Registering user with ID: ${userId}`);
            socket.emit("register", userId);
        }
    }, [userId]);

    useEffect(() => {
        if (userId) {
            console.log(`Joining chat room with ID: ${userId}`);
            socket.emit("joinRoom", userId);
        }
    }, [userId]);

    // Join the global chat room
    useEffect(() => {
        // Join the global chat room
        socket.emit("joinGlobalChat");

        // Listen for global chat history
        socket.on("globalChatHistory", (chatHistory) => {
            setGlobalMessages(chatHistory);
        });

        // Listen for new global messages
        socket.on("receiveGlobalMessage", (message) => {
            setGlobalMessages((prevMessages) => [...prevMessages, message]);
        });

        return () => {
            socket.off("globalChatHistory");
            socket.off("receiveGlobalMessage");
        };
    }, []);

    // Fetch friends list
    useEffect(() => {
        const fetchFriends = async () => {
            if (!userId) {
                console.error("User ID is undefined");
                return;
            }

            try {
                const response = await fetch(`https://backend.casino.ghana-kebabs.com/api/friends/friends/${userId}`);
                if (!response.ok) {
                    throw new Error("Failed to fetch friends list");
                }
                const data = await response.json();
                setFriends(data);
            } catch (error) {
                console.error("Error fetching friends list:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchFriends();
    }, [userId]);

    // Fetch pending friend requests
    useEffect(() => {
        const fetchRequests = async () => {
            if (!userId) {
                console.error("User ID is undefined");
                return;
            }

            try {
                const response = await fetch(`https://backend.casino.ghana-kebabs.com/api/friends/requests/${userId}`);
                if (!response.ok) {
                    throw new Error("Failed to fetch friend requests");
                }
                const data = await response.json();

                // Log the raw data from the backend
                console.log("Raw friend requests data:", data);

                // Use the `id` and `name` fields directly from the backend response
                const mappedRequests = data.map((request: any) => ({
                    id: request.id, // Use `id` directly
                    name: request.name || "Unknown User", // Use `name` or fallback to "Unknown User"
                }));

                console.log("Mapped friend requests:", mappedRequests); // Log the mapped requests
                setRequests(mappedRequests);
            } catch (error) {
                console.error("Error fetching friend requests:", error);
            }
        };

        fetchRequests();
    }, [userId]);

    // Fetch chat history when a friend is selected
    useEffect(() => {
        if (selectedFriend) {
            console.log(`Fetching chat history with ${selectedFriend.id}`);
            socket.emit("fetchChatHistory", { userId, friendId: selectedFriend.id });

            socket.on("chatHistory", (chatHistory: ChatMessage[]) => {
                console.log("Chat history received:", chatHistory);
                setMessages(chatHistory);
            });

            return () => {
                socket.off("chatHistory");
            };
        }
    }, [selectedFriend, userId]);

    // Handle real-time chat messages
    useEffect(() => {
        socket.on("receiveMessage", ({ from, to, message }) => {
            console.log(`New message received from ${from} to ${to}: ${message}`);
            if (selectedFriend && (from === selectedFriend.id || to === selectedFriend.id)) {
                fetchChatHistory(); // Fetch updated chat history
            }
        });

        return () => {
            socket.off("receiveMessage");
        };
    }, [selectedFriend]);

    const fetchChatHistory = async () => {
        if (!userId || !selectedFriend) return;

        console.log(`Fetching chat history with ${selectedFriend.id}`);
        socket.emit("fetchChatHistory", { userId, friendId: selectedFriend.id });

        const handleChatHistory = (chatHistory: ChatMessage[]) => {
            console.log("Chat history received:", chatHistory);
            setMessages(chatHistory);
        };

        socket.on("chatHistory", handleChatHistory);

        return () => {
            socket.off("chatHistory", handleChatHistory); // Clean up the listener
        };
    };

    // Scroll to the latest message when messages change
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    // Scroll to the latest message in the global chat
    useEffect(() => {
        if (globalChatRef.current) {
            globalChatRef.current.scrollTop = globalChatRef.current.scrollHeight;
        }
    }, [globalMessages]);

    const sendMessage = () => {
        if (message.trim() && selectedFriend) {
            console.log(`Sending message to ${selectedFriend.id}: ${message}`);
            socket.emit("sendMessage", { from: userId, to: selectedFriend.id, message });
            setMessage(""); // Clear the input field

            // Fetch the updated chat history
            fetchChatHistory();
        }
    };

    const sendGlobalMessage = () => {
        if (globalMessage.trim()) {
            socket.emit("sendGlobalMessage", { username, message: globalMessage });
            setGlobalMessage(""); // Clear the input field
        }
    };

    const handleAcceptRequest = async (id: string) => {
        console.log("Accepting friend request:", { userId, senderId: id });

        try {
            const response = await fetch("https://backend.casino.ghana-kebabs.com/api/friends/accept", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ userId, senderId: id }),
            });

            if (!response.ok) {
                throw new Error("Failed to accept friend request");
            }

            setRequests((prevRequests) => prevRequests.filter((request) => request.id !== id));
            toast.success("Friend request accepted");
        } catch (error) {
            console.error("Error accepting friend request:", error);
            toast.error("Failed to accept friend request");
        }
    };

    const handleDeclineRequest = async (id: string) => {
        console.log("Declining friend request:", { userId, senderId: id });

        try {
            const response = await fetch("https://backend.casino.ghana-kebabs.com/api/friends/decline", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ userId, senderId: id }),
            });

            if (!response.ok) {
                throw new Error("Failed to decline friend request");
            }

            setRequests((prevRequests) => prevRequests.filter((request) => request.id !== id));
            toast.success("Friend request declined");
        } catch (error) {
            console.error("Error declining friend request:", error);
            toast.error("Failed to decline friend request");
        }
    };

    if (loading) {
        return <p>Loading...</p>;
    }

    return (
        <div
            className={`fixed bottom-0 right-[20px] bg-[#1c1a31] text-white shadow-lg ${
                isCollapsed ? "h-[50px] w-[450px]" : "w-[450px] h-[550px]"
            } overflow-hidden rounded-t-lg transition-all`}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-2 bg-[#2d2b49] h-[50px]">
                <h3 className="text-lg font-bold">Friends & Chat</h3>
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="text-sm bg-blue-500 px-2 py-1 rounded hover:bg-blue-600"
                >
                    {isCollapsed ? "▲" : "▼"}
                </button>
            </div>

            {/* Content */}
            {!isCollapsed && (
                <div className="p-2 h-[calc(100%-50px)] overflow-y-auto">
                    <div className="flex justify-around mb-4 space-x-2">
                        <button
                            onClick={() => setActiveTab("friends")}
                            className={`px-4 py-2 w-[100px] rounded ${
                                activeTab === "friends" ? "bg-blue-500" : "bg-gray-500"
                            }`}
                        >
                            Friends
                        </button>
                        <button
                            onClick={() => setActiveTab("requests")}
                            className={`px-4 py-2 w-[100px] rounded ${
                                activeTab === "requests" ? "bg-blue-500" : "bg-gray-500"
                            }`}
                        >
                            Requests
                        </button>
                        <button
                            onClick={() => setActiveTab("chat")}
                            className={`px-4 py-2 w-[100px] rounded ${
                                activeTab === "chat" ? "bg-blue-500" : "bg-gray-500"
                            }`}
                        >
                            Chat
                        </button>
                        <button
                            onClick={() => setActiveTab("global")}
                            className={`px-4 py-2 w-[100px] rounded ${
                                activeTab === "global" ? "bg-blue-500" : "bg-gray-500"
                            }`}
                        >
                            Global
                        </button>
                    </div>
                    {activeTab === "friends" && (
                        <div>
                            {friends.length > 0 ? (
                                friends.map((friend) => (
                                    <div
                                        key={friend.id}
                                        className="flex items-center p-2 border-b border-gray-700 cursor-pointer"
                                        onClick={() => {
                                            setSelectedFriend(friend);
                                            setActiveTab("chat");
                                        }}
                                    >
                                        <img
                                            src={friend.profilePicture || "https://via.placeholder.com/40"}
                                            alt={friend.name}
                                            className="w-10 h-10 rounded-full mr-2"
                                        />
                                        <span>{friend.name}</span>
                                    </div>
                                ))
                            ) : (
                                <p>No friends found</p>
                            )}
                        </div>
                    )}
                    {activeTab === "requests" && (
                        <div>
                            {requests.length > 0 ? (
                                requests.map((request) => (
                                    <div
                                        key={request.id}
                                        className="flex items-center justify-between p-2 border-b border-gray-700"
                                    >
                                        <span>{request.name}</span>
                                        <div>
                                            <button
                                                onClick={() => handleAcceptRequest(request.id)}
                                                className="bg-green-500 px-2 py-1 rounded"
                                            >
                                                Accept
                                            </button>
                                            <button
                                                onClick={() => handleDeclineRequest(request.id)}
                                                className="bg-red-500 px-2 py-1 rounded ml-2"
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p>No pending friend requests</p>
                            )}
                        </div>
                    )}
                    {activeTab === "chat" && selectedFriend && (
                        <div>
                            <h4 className="text-lg font-bold mb-2">Chat with {selectedFriend.name}</h4>
                            <div
                                className="h-[300px] overflow-y-auto border border-gray-700 p-2 mb-2"
                                ref={chatContainerRef}
                            >
                                {messages.map((msg, index) => (
                                    <div
                                        key={index}
                                        className={`mb-1 ${msg.from === userId ? "text-right" : "text-left"}`}
                                    >
                                        <span className="block">{msg.message}</span>
                                        <span className="text-xs text-gray-400">
                                            {new Date(msg.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="text"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") sendMessage();
                                    }}
                                    placeholder="Type a message..."
                                    className="flex-grow p-2 border border-gray-700 rounded"
                                />
                                <span className="ml-2 text-gray-400 text-sm">Enter to Send</span>
                            </div>
                        </div>
                    )}
                    {activeTab === "global" && (
                        <div>
                            <h4 className="text-lg font-bold mb-2">Global Chat</h4>
                            <div
                                className="h-[300px] overflow-y-auto border border-gray-700 p-2 mb-2"
                                ref={globalChatRef}
                            >
                                {globalMessages.map((msg, index) => (
                                    <div key={index} className="mb-1">
                                        <span className="font-bold">{msg.username}:</span> {msg.message}
                                        <div className="text-xs text-gray-400">
                                            {new Date(msg.timestamp).toLocaleTimeString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="text"
                                    value={globalMessage}
                                    onChange={(e) => setGlobalMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") sendGlobalMessage();
                                    }}
                                    placeholder="Type a message..."
                                    className="flex-grow p-2 border border-gray-700 rounded"
                                />
                                <span className="ml-2 text-gray-400 text-sm">Enter to Send</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ChatOverlay;