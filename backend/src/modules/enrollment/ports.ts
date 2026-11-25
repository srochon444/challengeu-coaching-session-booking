export interface EnrollmentRow { id: string; studentUserId: string; status: "active" | "suspended"; createdAt: string; updatedAt: string; }
export interface EnrollmentRepo {
  insert(e: EnrollmentRow): void;
  byStudent(studentUserId: string): EnrollmentRow | undefined;
  setStatus(studentUserId: string, status: "active" | "suspended", at: string): void;
  all(): EnrollmentRow[];
}
// The interface Booking depends on (it never reads the enrollment table directly).
export interface EnrollmentPort { canBook(studentUserId: string): Promise<boolean>; }
