import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { getIO } from "../../socket";
import {
  createTournamentService,
  getTournamentDetails,
  inviteFriendsToTournament,
  acceptTournamentInvite,
  declineTournamentInvite,
  getUserTournaments,
  getUserTournamentInvites,
  cancelTournamentService,
} from "./tournament.service";

export const createTournamentController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as any).user!.id;
    const { title, maxPlayers } = req.body;

    const parsedMaxPlayers = maxPlayers ? Number(maxPlayers) : 8;
    const tournament = await createTournamentService(userId, title, parsedMaxPlayers);
    res.status(201).json({ success: true, tournament });
  }
);

export const getTournamentDetailsController = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const tournament = await getTournamentDetails(id);

    if (!tournament) {
      res.status(404).json({ success: false, message: "Tournament not found" });
      return;
    }

    res.status(200).json({ success: true, tournament });
  }
);

export const inviteFriendsController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as any).user!.id;
    const id = req.params.id as string;
    const { friendUserIds } = req.body;

    const io = getIO();
    if (!io) {
      res.status(500).json({ success: false, message: "Socket server unavailable" });
      return;
    }

    const invites = await inviteFriendsToTournament(io, userId, id, friendUserIds || []);
    res.status(200).json({ success: true, invites });
  }
);

export const acceptInviteController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as any).user!.id;
    const id = req.params.id as string;

    const io = getIO();
    if (!io) {
      res.status(500).json({ success: false, message: "Socket server unavailable" });
      return;
    }

    const tournament = await acceptTournamentInvite(io, id, userId);
    res.status(200).json({ success: true, tournament });
  }
);

export const declineInviteController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as any).user!.id;
    const id = req.params.id as string;

    const io = getIO();
    if (!io) {
      res.status(500).json({ success: false, message: "Socket server unavailable" });
      return;
    }

    await declineTournamentInvite(io, id, userId);
    res.status(200).json({ success: true });
  }
);

export const getUserTournamentsController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as any).user!.id;
    const tournaments = await getUserTournaments(userId);
    res.status(200).json({ success: true, tournaments });
  }
);

export const getUserInvitesController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as any).user!.id;
    const invites = await getUserTournamentInvites(userId);
    res.status(200).json({ success: true, invites });
  }
);

export const cancelTournamentController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as any).user!.id;
    const id = req.params.id as string;

    const io = getIO();
    if (!io) {
      res.status(500).json({ success: false, message: "Socket server unavailable" });
      return;
    }

    const tournament = await cancelTournamentService(io, id, userId);
    res.status(200).json({ success: true, tournament });
  }
);
