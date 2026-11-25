export const SESSION_BOOKED = "SessionBooked";
export const SESSION_CANCELLED = "SessionCancelled";
export interface SessionEvent { sessionId: string; studentUserId: string; coachUserId: string; startsAtUtc: string; }
