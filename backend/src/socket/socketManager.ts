const connectedUsers = new Map<string, string>();

export const connectUser = (userId: string, socketId: string) => {
    connectedUsers.set(userId, socketId);
};

export const disconnectUser = (userId: string) => {
    connectedUsers.delete(userId);
};

export const getSocketId = (userId: string) => {
    return connectedUsers.get(userId);
};

export const isUserConnected = (userId: string) => {
    return connectedUsers.has(userId);
};