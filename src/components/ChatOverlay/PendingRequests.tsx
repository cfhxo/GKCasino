import React, { useState, useEffect, useContext } from "react";
import UserContext from "../../UserContext"; // Adjust the path as needed

interface PendingRequestsProps {
    userId: string; // The ID of the logged-in user
}

interface Friend {
    id: string;
    name: string;
    profilePicture: string;
}

const PendingRequests: React.FC<PendingRequestsProps> = ({ userId }) => {
    const [requests, setRequests] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

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
                console.log("Fetched friend requests:", data); // Debugging log
                setRequests(data);
            } catch (error) {
                console.error("Error fetching friend requests:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRequests();
    }, [userId]);

    const handleAccept = async (senderId: string) => {
        console.log("Accepting friend request for senderId:", senderId);
        try {
            const response = await fetch("https://backend.casino.ghana-kebabs.com/api/friends/accept", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ userId, senderId }),
            });

            if (!response.ok) {
                throw new Error("Failed to accept friend request");
            }

            setRequests((prevRequests) => prevRequests.filter((request) => request.id !== senderId));
            console.log(`Friend request from ${senderId} accepted`);
        } catch (error) {
            console.error("Error accepting friend request:", error);
        }
    };

    const handleDecline = async (senderId: string) => {
        console.log("Declining friend request for senderId:", senderId);
        try {
            const response = await fetch("https://backend.casino.ghana-kebabs.com/api/friends/decline", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ userId, senderId }),
            });

            if (!response.ok) {
                throw new Error("Failed to decline friend request");
            }

            setRequests((prevRequests) => prevRequests.filter((request) => request.id !== senderId));
            console.log(`Friend request from ${senderId} declined`);
        } catch (error) {
            console.error("Error declining friend request:", error);
        }
    };

    if (loading) {
        return <p>Loading friend requests...</p>;
    }

    return (
        <div>
            <h2>Pending Friend Requests</h2>
            {requests.length > 0 ? (
                requests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between">
                        <span>{request.name || "Unknown User"}</span> {/* Display username or fallback */}
                        <div>
                            <button onClick={() => handleAccept(request.id)} className="bg-green-500 p-2 rounded">
                                Accept
                            </button>
                            <button onClick={() => handleDecline(request.id)} className="bg-red-500 p-2 rounded ml-2">
                                Decline
                            </button>
                        </div>
                    </div>
                ))
            ) : (
                <p>No pending friend requests</p>
            )}
        </div>
    );
};

const ChatOverlay: React.FC = () => {
    const [showRequests, setShowRequests] = useState(false);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const { userData } = useContext(UserContext);
    const userId = userData?.id;

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
                console.log("Fetched friends list:", data); // Debugging log
                setFriends(data);
            } catch (error) {
                console.error("Error fetching friends list:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchFriends();
    }, [userId]);

    if (loading) {
        return <p>Loading friends...</p>;
    }

    return (
        <div className="fixed bottom-0 right-0 bg-[#1c1a31] text-white shadow-lg w-[300px]">
            <div className="flex items-center justify-between p-2 bg-[#2d2b49]">
                <h3 className="text-lg font-bold">Friends & Chat</h3>
                <button
                    onClick={() => setShowRequests(!showRequests)}
                    className="text-sm bg-blue-500 px-2 py-1 rounded hover:bg-blue-600"
                >
                    {showRequests ? "Hide Requests" : "View Friend Requests"}
                </button>
            </div>
            {showRequests && userId ? (
                <PendingRequests userId={userId} />
            ) : (
                <div>
                    {friends.length > 0 ? (
                        friends.map((friend) => (
                            <div key={friend.id} className="flex items-center p-2 border-b border-gray-700">
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
        </div>
    );
};

export default ChatOverlay;