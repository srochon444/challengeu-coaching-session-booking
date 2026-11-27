import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Paper, Stack, Title, Group, Select, Button, Text } from "@mantine/core";
import { DateTime } from "luxon";
import { weekBoundsUtc, formatInZone } from "@ccu/shared";
import { useMe } from "../auth/useMe.js";
import { listCoaches, openBlocks, bookBlock } from "./api.js";
import { WeekGrid } from "./WeekGrid.js";

export function CoachList() {
  const me = useMe()!;
  const qc = useQueryClient();
  const [coachId, setCoachId] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const { data: coaches = [] } = useQuery({ queryKey: ["coaches"], queryFn: listCoaches });

  // The viewer's week, offset by the Prev/Next navigation, computed in their timezone.
  const weekRefIso = DateTime.now().setZone(me.timezone).plus({ weeks: weekOffset }).toUTC().toISO()!;
  const { fromUtc, toUtc } = weekBoundsUtc(weekRefIso, me.timezone);

  const { data: blocks = [] } = useQuery({
    enabled: !!coachId,
    queryKey: ["open-blocks", coachId, fromUtc],
    queryFn: () => openBlocks(coachId!, fromUtc, toUtc),
  });

  const book = useMutation({
    mutationFn: bookBlock,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["open-blocks"] });
      qc.invalidateQueries({ queryKey: ["my-sessions"] });
    },
    onError: (e: Error) => alert(e.message),
  });

  // Sessions starting within 24h can't be cancelled later — warn before booking one.
  const handleBook = (id: string) => {
    const block = blocks.find((b) => b.id === id);
    const within24h = block && new Date(block.startsAtUtc).getTime() - Date.now() < 24 * 3600_000;
    if (within24h && !window.confirm("This session starts within 24 hours, so you won't be able to cancel it afterward. Book it anyway?")) return;
    book.mutate(id);
  };

  return (
    <Paper withBorder p="md">
      <Stack gap="sm">
        <Title order={4}>Find a coach</Title>
        <Text size="sm" c="dimmed">Times are shown in your timezone ({me.timezone}).</Text>
        <Select
          placeholder="Choose a coach…"
          data={coaches.map((c) => ({ value: c.id, label: `${c.displayName} (${c.timezone})` }))}
          value={coachId}
          onChange={setCoachId}
          clearable
        />
        {coachId && (
          <>
            <Group justify="space-between">
              <Button size="xs" variant="default" onClick={() => setWeekOffset((w) => w - 1)} disabled={weekOffset <= 0}>‹ Previous</Button>
              <Text fw={500}>Week of {formatInZone(fromUtc, me.timezone, "MMM d, yyyy")}</Text>
              <Button size="xs" variant="default" onClick={() => setWeekOffset((w) => w + 1)}>Next ›</Button>
            </Group>
            <WeekGrid blocks={blocks} viewerTz={me.timezone} onBook={handleBook} bookingId={book.isPending ? (book.variables as string) : undefined} />
          </>
        )}
      </Stack>
    </Paper>
  );
}
