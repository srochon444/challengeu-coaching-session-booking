import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Paper, Stack, Title, Text, Table, Button } from "@mantine/core";
import { formatInZone } from "@ccu/shared";
import { useMe } from "../auth/useMe.js";
import { mySessions, cancelSession } from "./api.js";

// Cancellation is allowed only up to 24h before the session starts.
const canCancelNow = (startsAtUtc: string) => new Date(startsAtUtc).getTime() - Date.now() >= 24 * 3600_000;

export function UpcomingList() {
  const me = useMe()!;
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["my-sessions"], queryFn: mySessions });
  const cancel = useMutation({
    mutationFn: cancelSession,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-sessions"] });
      qc.invalidateQueries({ queryKey: ["open-blocks"] });
    },
    onError: (e: Error) => alert(e.message),
  });

  return (
    <Paper withBorder p="md">
      <Stack gap="sm">
        <Title order={4}>Upcoming sessions</Title>
        {data.length === 0 ? (
          <Text c="dimmed">No upcoming sessions.</Text>
        ) : (
          <Table>
            <Table.Thead><Table.Tr><Table.Th>When ({me.timezone})</Table.Th><Table.Th /></Table.Tr></Table.Thead>
            <Table.Tbody>
              {data.map((s) => {
                const allowed = canCancelNow(s.startsAtUtc);
                return (
                  <Table.Tr key={s.id}>
                    <Table.Td>{formatInZone(s.startsAtUtc, me.timezone)}</Table.Td>
                    <Table.Td style={{ textAlign: "right" }}>
                      {me.role === "student" && (
                        allowed ? (
                          <Button size="xs" variant="subtle" color="red" loading={cancel.isPending && cancel.variables === s.id} onClick={() => cancel.mutate(s.id)}>
                            Cancel
                          </Button>
                        ) : (
                          <Text size="xs" c="dimmed">Within 24h — can't cancel</Text>
                        )
                      )}
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Paper>
  );
}
