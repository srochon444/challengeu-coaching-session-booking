import { InvalidDuration } from "../../../platform/errors.js";
export const Duration = {
  of(min: number): 30 | 60 {
    if (min === 30 || min === 60) return min;
    throw new InvalidDuration();
  },
};
