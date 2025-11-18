export const notifyLoggedOut = (userId, io) => {
    // Emit to the user's room (correct order: userId first, then io)
    io.to(`user_${userId}`).emit("force_logout", {
        reason: "account_deleted",
        message: "Your account has been deleted by an administrator",
    });

    // Also emit directly to userId room (from your initializeIO setup)
    io.to(userId).emit("force_logout", {
        reason: "account_deleted",
        message: "Your account has been deleted by an administrator",
    });
};
