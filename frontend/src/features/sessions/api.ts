import type { SessionDTO } from "@ccu/shared";
import { api } from "../../shared/api.js";

export const mySessions = () => api<SessionDTO[]>("/sessions");
