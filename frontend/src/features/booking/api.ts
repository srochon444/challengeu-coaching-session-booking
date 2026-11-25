import type { AvailabilityBlockDTO, SessionDTO, UserDTO } from "@ccu/shared";
import { api } from "../../shared/api.js";

export const listCoaches = () => api<UserDTO[]>("/coaches");

export const openBlocks = (coachId: string, fromUtc: string, toUtc: string) =>
  api<AvailabilityBlockDTO[]>(`/coaches/${coachId}/open-blocks?fromUtc=${encodeURIComponent(fromUtc)}&toUtc=${encodeURIComponent(toUtc)}`);

export const bookBlock = (availabilityBlockId: string) =>
  api<SessionDTO>("/sessions", { method: "POST", body: JSON.stringify({ availabilityBlockId }) });
