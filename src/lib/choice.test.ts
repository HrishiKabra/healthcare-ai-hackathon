import { describe, expect, it } from "vitest";
import { toggleChoice } from "./choice";
import { requireQuestion } from "./questions";

const q = requireQuestion("conditions");
const c = (id: string) => q.choices.find((x) => x.id === id)!;

describe("toggleChoice", () => {
  it("adds and removes choices", () => {
    expect(toggleChoice([], c("diabetes"), q.choices)).toEqual(["diabetes"]);
    expect(toggleChoice(["diabetes"], c("diabetes"), q.choices)).toEqual([]);
  });
  it("'None' clears everything else, and picking something clears 'None'", () => {
    expect(toggleChoice(["diabetes", "asthma"], c("none"), q.choices)).toEqual(["none"]);
    expect(toggleChoice(["none"], c("asthma"), q.choices)).toEqual(["asthma"]);
  });
});
