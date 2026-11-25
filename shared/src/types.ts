export type Role = "coach" | "student" | "enrollment_admin";
export type SessionStatus = "confirmed" | "cancelled";
export type DurationMinutes = 30 | 60;

export interface UserDTO { id: string; displayName: string; role: Role; timezone: string; }
export interface AvailabilityBlockDTO {
  id: string; coachUserId: string; startsAtUtc: string; endsAtUtc: string; durationMin: DurationMinutes;
}
export interface SessionDTO {
  id: string; availabilityBlockId: string; studentUserId: string; coachUserId: string;
  startsAtUtc: string; endsAtUtc: string; status: SessionStatus;
}
export interface NotificationDTO {
  id: string; recipientUserId: string; type: "session_booked" | "session_cancelled";
  message: string; createdAt: string; readAt: string | null;
}
export interface EnrollmentDTO { studentUserId: string; status: "active" | "suspended"; }

export type ErrorCode =
  | "SLOT_TAKEN" | "STUDENT_SUSPENDED" | "MAX_UPCOMING_REACHED"
  | "CANCEL_WINDOW_PASSED" | "BLOCK_OVERLAP" | "INVALID_DURATION"
  | "NOT_FOUND" | "FORBIDDEN" | "UNAUTHENTICATED" | "VALIDATION";
export interface ApiError { code: ErrorCode; message: string; }
