import { io, Socket } from "socket.io-client";

class SocketService {
    private socket: Socket | null = null;

    connect(userId: string) {
        this.socket = io("http://localhost:3000"); // Replace with your backend URL
        this.socket.emit("login", userId);
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }

    sendMessage(receiverId: string, message: string) {
        if (this.socket) {
            this.socket.emit("sendMessage", { senderId: localStorage.getItem("userId"), receiverId, message });
        }
    }

    onMessage(callback: (data: { senderId: string; message: string }) => void) {
        if (this.socket) {
            this.socket.on("receiveMessage", callback);
        }
    }
}

export default new SocketService();