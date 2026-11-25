import { randomUUID } from "node:crypto";
import type { Clock } from "../../platform/clock.js";
import { NotFound } from "../../platform/errors.js";
import type { IdentityApi } from "../identity/ports.js";
import type { EnrollmentPort, EnrollmentRepo } from "./ports.js";

export function enrollmentService(repo: EnrollmentRepo, identity: IdentityApi, clock: Clock) {
  const register = (displayName: string, timezone: string) => {
    const user = identity.createAccount({ displayName, role: "student", timezone });
    const now = clock.now().toISOString();
    repo.insert({ id: randomUUID(), studentUserId: user.id, status: "active", createdAt: now, updatedAt: now });
    return { studentUserId: user.id, displayName: user.displayName, timezone: user.timezone, status: "active" as const };
  };
  const setStatus = (studentUserId: string, status: "active" | "suspended") => {
    if (!repo.byStudent(studentUserId)) throw new NotFound("Enrollment");
    repo.setStatus(studentUserId, status, clock.now().toISOString());
  };
  const port: EnrollmentPort = {
    async canBook(studentUserId) { return repo.byStudent(studentUserId)?.status === "active"; },
  };
  const list = () => repo.all();
  return { register, setStatus, port, list };
}
