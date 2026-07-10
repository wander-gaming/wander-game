import { DiceRollResult, ParseError } from "@/types";

export type DiceExpr =
  | { kind: "roll";  count: number; sides: number }
  | { kind: "const"; value: number }
  | { kind: "add";   left: DiceExpr; right: DiceExpr }
  | { kind: "sub";   left: DiceExpr; right: DiceExpr };

type TokenType = "number" | "d" | "op";

export interface Token {
  type: TokenType;
  value: string;
}

const VALID_SIDES = new Set([4, 6, 8, 10, 12, 20, 100]);

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (ch === " ") {
      i++;
      continue;
    }

    if (ch >= "0" && ch <= "9") {
      let num = "";
      while (i < input.length && input[i] >= "0" && input[i] <= "9") {
        num += input[i++];
      }
      tokens.push({ type: "number", value: num });
      continue;
    }

    if (ch === "d") {
      tokens.push({ type: "d", value: "d" });
      i++;
      continue;
    }

    if (ch === "+" || ch === "-") {
      tokens.push({ type: "op", value: ch });
      i++;
      continue;
    }

    throw new ParseError(`unexpected character: ${ch}`);
  }

  return tokens;
}

export function parseDice(input: string): DiceExpr {
  const tokens = tokenize(input.trim());
  let pos = 0;

  function peek() { return tokens[pos]; }
  function consume() { return tokens[pos++]; }

  function parseTerm(): DiceExpr {
    const t = peek();
    if (!t) throw new ParseError("unexpected end of input");

    let count = 1;
    if (t.type === "number") {
      const next = tokens[pos + 1];
      if (next?.type === "d") {
        count = parseInt(consume().value, 10);
      }
    }

    if (peek()?.type === "d") {
      consume();
      const sidesToken = consume();
      if (!sidesToken || sidesToken.type !== "number") {
        throw new ParseError("expected die size after 'd'");
      }
      const sides = parseInt(sidesToken.value, 10);
      if (!VALID_SIDES.has(sides)) {
        throw new ParseError(`unsupported die: d${sides}`);
      }
      return { kind: "roll", count, sides };
    }

    if (t.type === "number") {
      consume();
      return { kind: "const", value: parseInt(t.value, 10) };
    }

    throw new ParseError(`unexpected token: ${t.value}`);
  }

  function parseExpr(): DiceExpr {
    let left = parseTerm();
    while (peek()?.type === "op") {
      const op = consume().value as "+" | "-";
      const right = parseTerm();
      left = { kind: op === "+" ? "add" : "sub", left, right };
    }
    return left;
  }

  const expr = parseExpr();
  if (pos !== tokens.length) throw new ParseError("unexpected trailing input");
  return expr;
}

export function exprToString(expr: DiceExpr): string {
  if (expr.kind === "const") return String(expr.value);
  if (expr.kind === "roll") {
    return expr.count === 1 ? `d${expr.sides}` : `${expr.count}d${expr.sides}`;
  }
  const op = expr.kind === "add" ? "+" : "-";
  return `${exprToString(expr.left)}${op}${exprToString(expr.right)}`;
}

export function evalDice(expr: DiceExpr, rand = Math.random): DiceRollResult {
  const rolls: DiceRollResult["rolls"] = [];

  function evalNode(node: DiceExpr): number {
    if (node.kind === "const") return node.value;
    if (node.kind === "roll") {
      let sum = 0;
      for (let i = 0; i < node.count; i++) {
        const v = Math.floor(rand() * node.sides) + 1;
        rolls.push({ sides: node.sides, value: v });
        sum += v;
      }
      return sum;
    }
    const l = evalNode(node.left);
    const r = evalNode(node.right);
    return node.kind === "add" ? l + r : l - r;
  }

  const total = evalNode(expr);
  return { expr: exprToString(expr), rolls, total };
}
