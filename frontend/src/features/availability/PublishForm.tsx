import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TextInput, Select, Button, Group, Title, Stack, Paper, Text } from "@mantine/core";
import { DateTime } from "luxon";
import { wallTimeToUtcIso } from "@ccu/shared";
import { useMe } from "../auth/useMe.js";
import { publishBlock } from "./api.js";

// Default the picker to tomorrow 09:00 in the coach's own timezone.
function defaultLocal(tz: string): string {
  return DateTime.now().setZone(tz).plus({ days: 1 }).set({ hour: 9, minute: 0, second: 0, millisecond: 0 }).toFormat("yyyy-MM-dd'T'HH:mm");
}
// Earliest selectable time: now, in the coach's timezone (no past slots).
function nowLocal(tz: string): string {
  return DateTime.now().setZone(tz).toFormat("yyyy-MM-dd'T'HH:mm");
}

export function PublishForm() {
  const me = useMe()!;
  const qc = useQueryClient();
  const [local, setLocal] = useState(() => defaultLocal(me.timezone));
  const [dur, setDur] = useState<"30" | "60">("30");

  const m = useMutation({
    // Client converts the coach's local wall-time to a UTC instant before sending.
    mutationFn: () => publishBlock(wallTimeToUtcIso(local, me.timezone), Number(dur) as 30 | 60),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-blocks"] }),
    onError: (e: Error) => alert(e.message),
  });

  return (
    <Paper withBorder p="md">
      <Stack gap="sm">
        <Title order={4}>Publish availability</Title>
        <Text size="sm" c="dimmed">Times are in your timezone ({me.timezone}).</Text>
        <Group align="flex-end">
          <TextInput type="datetime-local" label="Start" min={nowLocal(me.timezone)} value={local} onChange={(e) => setLocal(e.currentTarget.value)} />
          <Select
            label="Duration"
            data={[{ value: "30", label: "30 min" }, { value: "60", label: "60 min" }]}
            value={dur}
            onChange={(v) => setDur((v as "30" | "60") ?? "30")}
            allowDeselect={false}
            w={120}
          />
          <Button loading={m.isPending} onClick={() => m.mutate()}>Publish</Button>
        </Group>
      </Stack>
    </Paper>
  );
}
