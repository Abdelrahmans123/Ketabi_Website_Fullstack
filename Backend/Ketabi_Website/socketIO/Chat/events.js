// events.js - FIXED VERSION
import { sendMessageService, registerEventService } from "./eventService.js";

export const registerEvents = (socket) => {
    // Backend expects just the message string directly
    return socket.on("register", (msg, cb) => {
        registerEventService({ message: msg, socket, cb });
    });
};

export const sendMessage = (socket, io) => {
    return socket.on("sendMessage", ({ content, sendTo }) => {

        sendMessageService({ message: { content, sendTo }, socket, io });
    });
};

export const handleTyping = (socket, io) => {
    return socket.on("typing", ({ recipientId, isTyping }) => {
        socket.to(recipientId).emit("userTyping", {
            userId: socket.user.id,
            userName: socket.user.name,
            isTyping,
        });
    });
};
