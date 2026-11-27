import type { SessionDTO } from "@ccu/shared";
import { api } from "../../shared/api.js";

export const mySessions = () => api<SessionDTO[]>("/sessions");

export const cancelSession = (id: string) => api<{ ok: true }>(`/sessions/${id}/cancel`, { method: "POST" });
