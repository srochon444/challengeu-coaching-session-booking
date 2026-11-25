import type { ErrorCode } from "@ccu/shared";

export class DomainError extends Error {
  constructor(public code: ErrorCode, public httpStatus: number, message: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class SlotTaken extends DomainError { constructor() { super("SLOT_TAKEN", 409, "That time was just booked by someone else."); } }
export class StudentSuspended extends DomainError { constructor() { super("STUDENT_SUSPENDED", 403, "Your access is suspended; you cannot book new sessions."); } }
export class MaxUpcomingReached extends DomainError { constructor() { super("MAX_UPCOMING_REACHED", 422, "You already hold 3 upcoming sessions."); } }
export class CancelWindowPassed extends DomainError { constructor() { super("CANCEL_WINDOW_PASSED", 422, "Sessions can only be cancelled up to 24 hours before they start."); } }
export class BlockOverlap extends DomainError { constructor() { super("BLOCK_OVERLAP", 409, "This availability overlaps an existing block."); } }
export class InvalidDuration extends DomainError { constructor() { super("INVALID_DURATION", 422, "Availability blocks must be 30 or 60 minutes."); } }
export class NotFound extends DomainError { constructor(what = "Resource") { super("NOT_FOUND", 404, `${what} not found.`); } }
export class Forbidden extends DomainError { constructor() { super("FORBIDDEN", 403, "You are not allowed to do that."); } }
