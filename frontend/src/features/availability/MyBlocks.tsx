import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Paper, Stack, Title, Text, Table, Badge, Button } from "@mantine/core";
import { formatInZone, weekBoundsUtc, addMinutesIso } from "@ccu/shared";
import { useMe } from "../auth/useMe.js";
import { myBlocks, removeBlock } from "./api.js";

export function MyBlocks() {
  const me = useMe()!;
  const qc = useQueryClient();
  // Show a 4-week window starting at the beginning of the current week (coach tz).
  const { fromUtc } = weekBoundsUtc(new Date().toISOString(), me.timezone);
  const toUtc = addMinutesIso(fromUtc, 28 * 24 * 60);
  const { data = [] } = useQuery({ queryKey: ["my-blocks", me.id], queryFn: () => myBlocks(me.id, fromUtc, toUtc) });

  const remove = useMutation({
    mutationFn: removeBlock,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-blocks"] }),
    onError: (e: Error) => alert(e.message),
  });

  return (
    <Paper withBorder p="md">
      <Stack gap="sm">
        <Title order={4}>My upcoming availability</Title>
        {data.length === 0 ? (
          <Text c="dimmed">No availability published yet.</Text>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr><Table.Th>When ({me.timezone})</Table.Th><Table.Th>Duration</Table.Th><Table.Th /></Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.map((b) => (
                <Table.Tr key={b.id}>
                  <Table.Td>{formatInZone(b.startsAtUtc, me.timezone)}</Table.Td>
                  <Table.Td><Badge variant="light">{b.durationMin} min</Badge></Table.Td>
                  <Table.Td style={{ textAlign: "right" }}>
                    <Button
                      size="xs"
                      variant="subtle"
                      color="red"
                      loading={remove.isPending && remove.variables === b.id}
                      onClick={() => remove.mutate(b.id)}
                    >
                      Remove
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Paper>
  );
}
