import { Table, Button, Text, Badge } from "@mantine/core";
import { formatInZone } from "@ccu/shared";
import type { AvailabilityBlockDTO } from "@ccu/shared";

export function WeekGrid({
  blocks, viewerTz, onBook, bookingId,
}: {
  blocks: AvailabilityBlockDTO[]; viewerTz: string; onBook: (id: string) => void; bookingId?: string;
}) {
  if (blocks.length === 0) return <Text c="dimmed">No open times this week.</Text>;
  return (
    <Table>
      <Table.Thead>
        <Table.Tr><Table.Th>When ({viewerTz})</Table.Th><Table.Th>Duration</Table.Th><Table.Th /></Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {blocks.map((b) => (
          <Table.Tr key={b.id}>
            <Table.Td>{formatInZone(b.startsAtUtc, viewerTz)}</Table.Td>
            <Table.Td><Badge variant="light">{b.durationMin} min</Badge></Table.Td>
            <Table.Td style={{ textAlign: "right" }}>
              <Button size="xs" loading={bookingId === b.id} onClick={() => onBook(b.id)}>Book</Button>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
