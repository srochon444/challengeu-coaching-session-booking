import type { Role, UserDTO } from "@ccu/shared";
export interface UserRow { id: string; displayName: string; role: Role; timezone: string; createdAt: string; }
export interface UserRepo {
  insert(u: UserRow): void;
  byId(id: string): UserRow | undefined;
  all(): UserRow[];
}
export interface IdentityApi {
  createAccount(input: { displayName: string; role: Role; timezone: string }): UserDTO;
  getUser(id: string): UserDTO;
}
export const toDTO = (u: UserRow): UserDTO => ({ id: u.id, displayName: u.displayName, role: u.role, timezone: u.timezone });
