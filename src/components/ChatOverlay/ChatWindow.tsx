import React, { useState, useEffect, useRef } from "react";
import SocketService from "../../services/chat/SocketService";

interface ChatWindowProps {
    friendId: string;
    onBack: () => void;
}

interface ChatMessage {
    from: string;
    message: string;
    timestamp: number;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ friendId, onBack }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Listen for incoming messages
        SocketService.onMessage(({ senderId, message, timestamp }) => {
            if (senderId === friendId) {
                setMessages((prevMessages) => [...prevMessages, { from: senderId, message, timestamp }]);
            }
        });
    }, [friendId]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const sendMessage = () => {
        if (newMessage.trim()) {
            const timestamp = Date.now();
            setMessages([...messages, { from: "me", message: newMessage, timestamp }]);
            SocketService.sendMessage(friendId, newMessage);
            setNewMessage("");
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-2 bg-[#2d2b49]">
                <button onClick={onBack} className="text-sm bg-blue-500 px-2 py-1 rounded hover:bg-blue-600">
                    Back
                </button>
                <h3 className="text-lg font-bold">Chat with {friendId}</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 bg-[#1c1a31]" ref={chatContainerRef}>
                {messages.map((msg, index) => (
                    <div key={index} className={`mb-1 ${msg.from === "me" ? "text-right" : "text-left"}`}>
                        <span className="block">{msg.message}</span>
                        <span className="text-xs text-gray-400">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    </div>
                ))}
            </div>
            <div className="p-2 bg-[#2d2b49]">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="p-2 w-full rounded bg-[#1c1a31] text-white"
                />
                <button
                    onClick={sendMessage}
                    className="mt-2 w-full bg-blue-500 p-2 rounded hover:bg-blue-600"
                >
                    Send
                </button>
            </div>
        </div>
    );
};

export default ChatWindow;