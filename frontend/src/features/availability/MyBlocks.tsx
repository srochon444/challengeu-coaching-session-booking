import { useQuery } from "@tanstack/react-query";
import { Paper, Stack, Title, Text, Table, Badge } from "@mantine/core";
import { formatInZone, weekBoundsUtc, addMinutesIso } from "@ccu/shared";
import { useMe } from "../auth/useMe.js";
import { myBlocks } from "./api.js";

export function MyBlocks() {
  const me = useMe()!;
  // Show a 4-week window starting at the beginning of the current week (coach tz).
  const { fromUtc } = weekBoundsUtc(new Date().toISOString(), me.timezone);
  const toUtc = addMinutesIso(fromUtc, 28 * 24 * 60);
  const { data = [] } = useQuery({ queryKey: ["my-blocks", me.id], queryFn: () => myBlocks(me.id, fromUtc, toUtc) });

  return (
    <Paper withBorder p="md">
      <Stack gap="sm">
        <Title order={4}>My upcoming availability</Title>
        {data.length === 0 ? (
          <Text c="dimmed">No availability published yet.</Text>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr><Table.Th>When ({me.timezone})</Table.Th><Table.Th>Duration</Table.Th></Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.map((b) => (
                <Table.Tr key={b.id}>
                  <Table.Td>{formatInZone(b.startsAtUtc, me.timezone)}</Table.Td>
                  <Table.Td><Badge variant="light">{b.durationMin} min</Badge></Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Paper>
  );
}
