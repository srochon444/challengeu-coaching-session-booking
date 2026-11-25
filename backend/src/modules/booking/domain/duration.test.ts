import { expect, test } from "vitest";
import { Duration } from "./duration.js";

test("accepts 30 and 60", () => { expect(Duration.of(30)).toBe(30); expect(Duration.of(60)).toBe(60); });
test("rejects anything else", () => { expect(() => Duration.of(45)).toThrow(); expect(() => Duration.of(0)).toThrow(); });
