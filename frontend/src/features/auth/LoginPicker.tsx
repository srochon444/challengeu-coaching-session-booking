import { useQuery } from "@tanstack/react-query";
import type { UserDTO } from "@ccu/shared";
import { api } from "../../shared/api.js";
import { useAuth } from "../../app/auth-context.js";

export function LoginPicker() {
  const { user, login, logout } = useAuth();
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => api<UserDTO[]>("/users") });
  if (user) return <div>Signed in as <b>{user.displayName}</b> ({user.role}, {user.timezone}) <button onClick={logout}>Switch user</button></div>;
  return (
    <div>
      <h2>Pick a user to sign in</h2>
      <ul>{users.map((u) => <li key={u.id}><button onClick={() => login(u.id)}>{u.displayName} — {u.role} ({u.timezone})</button></li>)}</ul>
    </div>
  );
}
