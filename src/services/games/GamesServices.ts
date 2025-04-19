import api from '../api';

export async function openBox(id: string, quantity: number) {
    const response = await api.post(`/games/openCase/${id}`, {
        quantity: quantity || 1
    });
    return response.data;
}

export async function upgradeItem(selectedItemIds: string[], targetItemId: string) {
    const response = await api.post(`/games/upgrade/`, { selectedItemIds, targetItemId });
    return response.data;
}

export async function spinSlots(betAmount: number) {
    const response = await api.post(`/games/slots/`, {
        betAmount
    });
    return response.data;
}

// Blackjack game functions
export async function dealCards(userId: string, betAmount: number) {
    console.log("Sending to backend (dealCards):", { userId, betAmount }); // Log the payload
    const response = await api.post(`/games/blackjack/deal`, { userId, betAmount });
    return response.data;
}

export async function hitCard(userId: string) {
    console.log("Sending to backend (hitCard):", { userId }); // Log the payload
    const response = await api.post(`/games/blackjack/hit`, { userId });
    return response.data;
}

export const stand = async (userId: string, betAmount: number) => {
    try {
        console.log("Sending request to https://backend.casino.ghana-kebabs.com/blackjack/stand with:", { userId, betAmount }); // Log the request payload
        const response = await fetch("https://backend.casino.ghana-kebabs.com/blackjack/stand", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId, betAmount }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: "Unknown error occurred" }));
            console.error("Error response from /stand:", error);
            throw new Error(error.message || "Failed to process stand.");
        }

        const result = await response.json();
        console.log("Successful response from /stand:", result);
        return result;
    } catch (error) {
        console.error("Error in stand service:", error.message);
        throw error;
    }
};