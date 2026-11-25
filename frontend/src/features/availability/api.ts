import type { AvailabilityBlockDTO, DurationMinutes } from "@ccu/shared";
import { api } from "../../shared/api.js";

export const publishBlock = (startsAtUtc: string, durationMin: DurationMinutes) =>
  api<AvailabilityBlockDTO>("/availability-blocks", { method: "POST", body: JSON.stringify({ startsAtUtc, durationMin }) });

export const myBlocks = (coachId: string, fromUtc: string, toUtc: string) =>
  api<AvailabilityBlockDTO[]>(
    `/availability-blocks?coachId=${coachId}&fromUtc=${encodeURIComponent(fromUtc)}&toUtc=${encodeURIComponent(toUtc)}`,
  );

export const removeBlock = (id: string) => api<void>(`/availability-blocks/${id}`, { method: "DELETE" });
