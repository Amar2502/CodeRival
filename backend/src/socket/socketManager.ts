import { Socket } from "socket.io";

const connectedUsers = new Map<string, Socket>();
const userActiveMatches = new Map<string, string>();
const disconnectGraceTimers = new Map<string, NodeJS.Timeout>();

export const connectUser = (userId: string, socket: Socket) => {
  connectedUsers.set(userId, socket);
};

export const disconnectUser = (userId: string) => {
  connectedUsers.delete(userId);
};

export const getSocket = (userId: string): Socket | undefined => {
  return connectedUsers.get(userId);
};

export const isUserConnected = (userId: string): boolean => {
  return connectedUsers.has(userId);
};

export const setUserActiveMatch = (userId: string, matchId: string) => {
  userActiveMatches.set(userId, matchId);
};

export const getUserActiveMatch = (userId: string): string | undefined => {
  return userActiveMatches.get(userId);
};

export const clearUserActiveMatch = (userId: string) => {
  userActiveMatches.delete(userId);
};

export const setDisconnectTimer = (userId: string, timer: NodeJS.Timeout) => {
  clearDisconnectTimer(userId);
  disconnectGraceTimers.set(userId, timer);
};

export const getDisconnectTimer = (userId: string): NodeJS.Timeout | undefined => {
  return disconnectGraceTimers.get(userId);
};

export const clearDisconnectTimer = (userId: string) => {
  const existingTimer = disconnectGraceTimers.get(userId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    disconnectGraceTimers.delete(userId);
  }
};