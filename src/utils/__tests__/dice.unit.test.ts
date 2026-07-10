import { describe, it, expect } from "vitest";
import { evalDice, exprToString, parseDice, type DiceExpr } from "../dice";

// deterministic rand sequences
const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe("exprToString", () => {
  it("renders a const", () => {
    expect(exprToString({ kind: "const", value: 5 })).toBe("5");
  });

  it("renders d20 without count prefix when count is 1", () => {
    expect(exprToString({ kind: "roll", count: 1, sides: 20 })).toBe("d20");
  });

  it("renders 2d6 with count prefix", () => {
    expect(exprToString({ kind: "roll", count: 2, sides: 6 })).toBe("2d6");
  });

  it("renders add expression", () => {
    const expr: DiceExpr = {
      kind: "add",
      left: { kind: "roll", count: 1, sides: 6 },
      right: { kind: "const", value: 3 },
    };
    expect(exprToString(expr)).toBe("d6+3");
  });

  it("renders sub expression", () => {
    const expr: DiceExpr = {
      kind: "sub",
      left: { kind: "roll", count: 2, sides: 8 },
      right: { kind: "const", value: 1 },
    };
    expect(exprToString(expr)).toBe("2d8-1");
  });

  it("round-trips through parseDice", () => {
    const inputs = ["2d6", "d20", "d6+3", "2d8-1", "d4+d6"];
    for (const s of inputs) {
      expect(exprToString(parseDice(s))).toBe(s);
    }
  });
});

describe("evalDice", () => {
  it("evaluates a const expression", () => {
    const result = evalDice({ kind: "const", value: 7 });
    expect(result.total).toBe(7);
    expect(result.rolls).toHaveLength(0);
    expect(result.expr).toBe("7");
  });

  it("rolls the correct number of dice", () => {
    const result = evalDice({ kind: "roll", count: 3, sides: 6 }, seq(0.5, 0.5, 0.5));
    expect(result.rolls).toHaveLength(3);
    expect(result.rolls.every(r => r.sides === 6)).toBe(true);
  });

  it("produces values in [1, sides] range", () => {
    // rand=0 -> floor(0*6)+1 = 1 (min), rand approaches 1 -> max
    const minResult = evalDice({ kind: "roll", count: 1, sides: 6 }, seq(0));
    expect(minResult.rolls[0].value).toBe(1);

    const maxResult = evalDice({ kind: "roll", count: 1, sides: 6 }, seq(0.9999));
    expect(maxResult.rolls[0].value).toBe(6);
  });

  it("sums rolls for a multi-die roll", () => {
    // rand=0 gives value 1 each time
    const result = evalDice({ kind: "roll", count: 3, sides: 6 }, seq(0));
    expect(result.total).toBe(3);
  });

  it("adds left and right sub-expressions", () => {
    const expr: DiceExpr = {
      kind: "add",
      left: { kind: "roll", count: 1, sides: 6 },
      right: { kind: "const", value: 3 },
    };
    // rand=0 -> roll value 1, total = 1+3 = 4
    const result = evalDice(expr, seq(0));
    expect(result.total).toBe(4);
    expect(result.rolls).toHaveLength(1);
  });

  it("subtracts right from left sub-expression", () => {
    const expr: DiceExpr = {
      kind: "sub",
      left: { kind: "roll", count: 1, sides: 8 },
      right: { kind: "const", value: 2 },
    };
    // rand=0.5 -> floor(0.5*8)+1 = 5, total = 5-2 = 3
    const result = evalDice(expr, seq(0.5));
    expect(result.total).toBe(3);
  });

  it("returns expr string matching exprToString", () => {
    const node: DiceExpr = { kind: "roll", count: 2, sides: 6 };
    const result = evalDice(node, seq(0.5));
    expect(result.expr).toBe("2d6");
  });

  it("accumulates all rolls across nested add expressions", () => {
    const expr: DiceExpr = {
      kind: "add",
      left: { kind: "roll", count: 2, sides: 6 },
      right: { kind: "roll", count: 1, sides: 4 },
    };
    const result = evalDice(expr, seq(0.5));
    expect(result.rolls).toHaveLength(3);
    expect(result.rolls.slice(0, 2).every(r => r.sides === 6)).toBe(true);
    expect(result.rolls[2].sides).toBe(4);
  });
});
