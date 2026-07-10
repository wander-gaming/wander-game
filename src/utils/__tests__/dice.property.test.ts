// Feature: wander-game, Property 22: Dice roll total correctness
// Feature: wander-game, Property 23: Dice parser rejects malformed input
import * as fc from "fast-check";
import { evalDice, parseDice, type DiceExpr } from "../dice";
import { ParseError } from "@/types";

const VALID_SIDES = [4, 6, 8, 10, 12, 20, 100] as const;

const rollArb: fc.Arbitrary<DiceExpr> = fc.record({
  kind: fc.constant("roll" as const),
  count: fc.integer({ min: 1, max: 6 }),
  sides: fc.constantFrom(...VALID_SIDES),
});

const constArb: fc.Arbitrary<DiceExpr> = fc.record({
  kind: fc.constant("const" as const),
  value: fc.integer({ min: -20, max: 20 }),
});

const leafArb: fc.Arbitrary<DiceExpr> = fc.oneof(rollArb, constArb);

const diceExprArb: fc.Arbitrary<DiceExpr> = fc.letrec<{ expr: DiceExpr }>((tie) => ({
  expr: fc.oneof(
    { maxDepth: 3 },
    leafArb,
    fc.record({
      kind: fc.constantFrom("add" as const, "sub" as const),
      left: tie("expr"),
      right: tie("expr"),
    })
  ),
})).expr;

function extractSignedConstantSum(expr: DiceExpr, sign = 1): number {
  if (expr.kind === "const") return sign * expr.value;
  if (expr.kind === "roll") return 0;
  if (expr.kind === "add") {
    return extractSignedConstantSum(expr.left, sign) + extractSignedConstantSum(expr.right, sign);
  }
  return extractSignedConstantSum(expr.left, sign) + extractSignedConstantSum(expr.right, -sign);
}

function extractSignedRollSum(expr: DiceExpr, rand: () => number, sign = 1): number {
  if (expr.kind === "const") return 0;
  if (expr.kind === "roll") {
    let sum = 0;
    for (let i = 0; i < expr.count; i++) {
      sum += Math.floor(rand() * expr.sides) + 1;
    }
    return sign * sum;
  }
  if (expr.kind === "add") {
    return extractSignedRollSum(expr.left, rand, sign) + extractSignedRollSum(expr.right, rand, sign);
  }
  return extractSignedRollSum(expr.left, rand, sign) + extractSignedRollSum(expr.right, rand, -sign);
}

describe("Property 22: Dice roll total correctness", () => {
  it("total equals sum of roll values plus constant modifiers", () => {
    // Validates: Requirements 11.2, 11.3
    fc.assert(
      fc.property(diceExprArb, fc.float({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }), (expr, seed) => {
        let callCount = 0;
        const values: number[] = [];

        const trackingRand = () => {
          const v = seed;
          values.push(v);
          return v;
        };

        const result = evalDice(expr, trackingRand);

        const rollSum = result.rolls.reduce((s, r) => s + r.value, 0);
        const constSum = extractSignedConstantSum(expr);

        let signedRollSum = 0;
        let idx = 0;
        function computeSignedRollSum(node: DiceExpr, sign: number): number {
          if (node.kind === "const") return 0;
          if (node.kind === "roll") {
            let s = 0;
            for (let i = 0; i < node.count; i++) {
              s += Math.floor(values[idx++] * node.sides) + 1;
            }
            return sign * s;
          }
          if (node.kind === "add") {
            return computeSignedRollSum(node.left, sign) + computeSignedRollSum(node.right, sign);
          }
          return computeSignedRollSum(node.left, sign) + computeSignedRollSum(node.right, -sign);
        }
        signedRollSum = computeSignedRollSum(expr, 1);

        expect(result.total).toBe(signedRollSum + constSum);
      }),
      { numRuns: 200 }
    );
  });
});

// Feature: wander-game, Property 23: Dice parser rejects malformed input
describe("Property 23: Dice parser rejects malformed input", () => {
  it("throws ParseError for strings with invalid characters", () => {
    // Validates: Requirements 11.4
    fc.assert(
      fc.property(
        fc.string().filter(s => /[^0-9d+\- ]/.test(s)),
        (s) => {
          expect(() => parseDice(s)).toThrow(ParseError);
        }
      )
    );
  });
});
