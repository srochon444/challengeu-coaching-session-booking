import { expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { WeekGrid } from "./WeekGrid.js";

function renderGrid(ui: React.ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

test("renders a block in the viewer's timezone with a Book button", () => {
  renderGrid(
    <WeekGrid
      viewerTz="America/Vancouver"
      onBook={vi.fn()}
      blocks={[{ id: "b1", coachUserId: "c1", startsAtUtc: "2026-02-10T18:00:00.000Z", endsAtUtc: "2026-02-10T18:30:00.000Z", durationMin: 30 }]}
    />,
  );
  // 18:00Z in Vancouver (PST, -08) = 10:00 AM
  expect(screen.getByText(/10:00/)).toBeTruthy();
  expect(screen.getByRole("button", { name: "Book" })).toBeTruthy();
});

test("shows an empty message when there are no blocks", () => {
  renderGrid(<WeekGrid viewerTz="Europe/Paris" onBook={vi.fn()} blocks={[]} />);
  expect(screen.getByText(/No open times/)).toBeTruthy();
});
