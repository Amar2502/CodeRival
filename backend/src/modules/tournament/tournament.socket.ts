import { Server, Socket } from "socket.io";

export const initializeTournamentSocket = (io: Server, socket: Socket) => {
  socket.on("tournament:join_room", ({ tournamentId }: { tournamentId: string }) => {
    if (!tournamentId) return;
    const room = `tournament:${tournamentId}`;
    socket.join(room);
    console.log(`Socket ${socket.id} joined ${room}`);
  });

  socket.on("tournament:leave_room", ({ tournamentId }: { tournamentId: string }) => {
    if (!tournamentId) return;
    const room = `tournament:${tournamentId}`;
    socket.leave(room);
    console.log(`Socket ${socket.id} left ${room}`);
  });
};
