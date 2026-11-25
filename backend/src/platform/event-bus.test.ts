import { expect, test, vi } from "vitest";
import { InMemoryEventBus } from "./event-bus.js";

test("subscribers receive published payloads by type", () => {
  const bus = new InMemoryEventBus();
  const handler = vi.fn();
  bus.subscribe("SessionBooked", handler);
  bus.publish("SessionBooked", { sessionId: "s1" });
  bus.publish("SessionCancelled", { sessionId: "s2" });
  expect(handler).toHaveBeenCalledTimes(1);
  expect(handler).toHaveBeenCalledWith({ sessionId: "s1" });
});
