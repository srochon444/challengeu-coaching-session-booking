import { AppShell, Container, Title, Group, Badge, Button, Text, Stack } from "@mantine/core";
import { useAuth } from "./auth-context.js";
import { LoginPicker } from "../features/auth/LoginPicker.js";
import { RoleGate } from "./routes.js";
import { PublishForm } from "../features/availability/PublishForm.js";
import { MyBlocks } from "../features/availability/MyBlocks.js";
import { CoachList } from "../features/booking/CoachList.js";
import { UpcomingList } from "../features/sessions/UpcomingList.js";

const roleColor: Record<string, string> = { coach: "indigo", student: "teal", enrollment_admin: "grape" };

export function App() {
  const { user, logout } = useAuth();
  return (
    <AppShell header={{ height: 64 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Title order={3}>Coaching Session Booking</Title>
          {user && (
            <Group gap="sm" wrap="nowrap">
              <Text fw={600}>{user.displayName}</Text>
              <Badge variant="light" color={roleColor[user.role]}>{user.role}</Badge>
              <Text size="sm" c="dimmed" visibleFrom="xs">{user.timezone}</Text>
              <Button size="xs" variant="default" onClick={logout}>Switch user</Button>
            </Group>
          )}
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <Container size="sm">
          {user ? (
            <Stack>
              {/* Feature panels are added in later slices and dropped into the gates below. */}
              <RoleGate role="coach"><PublishForm /><MyBlocks /></RoleGate>
              <RoleGate role="student"><CoachList /><UpcomingList /></RoleGate>
              <RoleGate role="enrollment_admin"><section id="admin-area" /></RoleGate>
            </Stack>
          ) : (
            <LoginPicker />
          )}
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
