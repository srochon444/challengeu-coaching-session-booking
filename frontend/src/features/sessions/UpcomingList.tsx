import { useQuery } from "@tanstack/react-query";
import { Paper, Stack, Title, Text, Table } from "@mantine/core";
import { formatInZone } from "@ccu/shared";
import { useMe } from "../auth/useMe.js";
import { mySessions } from "./api.js";

export function UpcomingList() {
  const me = useMe()!;
  const { data = [] } = useQuery({ queryKey: ["my-sessions"], queryFn: mySessions });
  return (
    <Paper withBorder p="md">
      <Stack gap="sm">
        <Title order={4}>Upcoming sessions</Title>
        {data.length === 0 ? (
          <Text c="dimmed">No upcoming sessions.</Text>
        ) : (
          <Table>
            <Table.Thead><Table.Tr><Table.Th>When ({me.timezone})</Table.Th></Table.Tr></Table.Thead>
            <Table.Tbody>
              {data.map((s) => (
                <Table.Tr key={s.id}><Table.Td>{formatInZone(s.startsAtUtc, me.timezone)}</Table.Td></Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Paper>
  );
}
