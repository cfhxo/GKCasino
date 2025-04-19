import React, { useState, useEffect } from "react";

interface FriendsListProps {
    onSelectFriend: (friendId: string) => void;
}

const FriendsList: React.FC<FriendsListProps> = ({ onSelectFriend }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [friends, setFriends] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        // Fetch friends from the backend
        const fetchFriends = async () => {
            try {
                const response = await fetch("https://backend.casino.ghana-kebabs.com/api/users");
                if (!response.ok) {
                    throw new Error("Failed to fetch friends");
                }
                const data = await response.json();
                console.log("Fetched friends:", data); // Debugging: Log the fetched data
                setFriends(data);
            } catch (error) {
                console.error("Error fetching friends:", error);
                setFriends([]); // Set an empty array if the fetch fails
            }
        };

        fetchFriends();
    }, []);

    const filteredFriends = friends.filter(friend =>
        friend.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col p-2">
            <input
                type="text"
                placeholder="Search friends..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="p-2 mb-2 rounded bg-[#2d2b49] text-white"
            />
            <div className="flex flex-col gap-2 overflow-y-auto">
                {filteredFriends.length > 0 ? (
                    filteredFriends.map(friend => (
                        <button
                            key={friend.id}
                            onClick={() => onSelectFriend(friend.id)}
                            className="p-2 bg-blue-500 rounded hover:bg-blue-600"
                        >
                            {friend.name}
                        </button>
                    ))
                ) : (
                    <p className="text-gray-400">No friends found</p>
                )}
            </div>
        </div>
    );
};

export default FriendsList;