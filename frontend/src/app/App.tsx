import { LoginPicker } from "../features/auth/LoginPicker.js";
import { RoleGate } from "./routes.js";
// Feature panels are added in later slices and dropped into the gates below.
export function App() {
  return (
    <main style={{ fontFamily: "system-ui", maxWidth: 900, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Coaching Session Booking</h1>
      <LoginPicker />
      <RoleGate role="coach"><section id="coach-area" /></RoleGate>
      <RoleGate role="student"><section id="student-area" /></RoleGate>
      <RoleGate role="enrollment_admin"><section id="admin-area" /></RoleGate>
    </main>
  );
}
