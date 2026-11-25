import { useQuery } from "@tanstack/react-query";
import { Card, Stack, Group, Text, Badge, Button, Title, Loader } from "@mantine/core";
import type { UserDTO } from "@ccu/shared";
import { api } from "../../shared/api.js";
import { useAuth } from "../../app/auth-context.js";

const roleColor: Record<string, string> = { coach: "indigo", student: "teal", enrollment_admin: "grape" };

// App renders this only when no one is signed in, so it is purely the picker.
export function LoginPicker() {
  const { login } = useAuth();
  const { data: users = [], isLoading } = useQuery({ queryKey: ["users"], queryFn: () => api<UserDTO[]>("/users") });
  return (
    <Stack>
      <Title order={4}>Pick a user to sign in</Title>
      {isLoading && <Loader />}
      {users.map((u) => (
        <Card key={u.id} withBorder padding="sm">
          <Group justify="space-between" wrap="nowrap">
            <Group gap="sm" wrap="nowrap">
              <Text fw={500}>{u.displayName}</Text>
              <Badge variant="light" color={roleColor[u.role]}>{u.role}</Badge>
              <Text size="sm" c="dimmed">{u.timezone}</Text>
            </Group>
            <Button size="xs" onClick={() => login(u.id)}>Sign in</Button>
          </Group>
        </Card>
      ))}
    </Stack>
  );
}
