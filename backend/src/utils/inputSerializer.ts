export interface ParamSignature {
  name: string;
  type: string;
}

/**
 * Converts a single parameter value into a flat array of STDIN string tokens
 * adhering to the expectations of generated C++, Java, and Python drivers.
 */
export function serializeParamToTokens(val: any, type: string): string[] {
  const tokens: string[] = [];

  switch (type) {
    case "int":
    case "double":
      tokens.push(String(val ?? 0));
      break;

    case "string":
      tokens.push(String(val ?? ""));
      break;

    case "boolean":
      tokens.push(val ? "true" : "false");
      break;

    case "int[]":
    case "double[]":
    case "string[]":
      if (!Array.isArray(val)) {
        tokens.push("0");
      } else {
        tokens.push(String(val.length));
        for (const item of val) {
          tokens.push(String(item));
        }
      }
      break;

    case "boolean[]":
      if (!Array.isArray(val)) {
        tokens.push("0");
      } else {
        tokens.push(String(val.length));
        for (const item of val) {
          tokens.push(item ? "true" : "false");
        }
      }
      break;

    case "int[][]":
      if (!Array.isArray(val) || val.length === 0) {
        tokens.push("0", "0");
      } else {
        const rows = val.length;
        const cols = Array.isArray(val[0]) ? val[0].length : 0;
        tokens.push(String(rows), String(cols));
        for (let i = 0; i < rows; i++) {
          for (let j = 0; j < cols; j++) {
            tokens.push(String(val[i][j]));
          }
        }
      }
      break;

    default:
      tokens.push(String(val ?? ""));
      break;
  }

  return tokens;
}

/**
 * Normalizes output strings by stripping carriage returns and trimming trailing whitespace/newlines.
 */
export function normalizeOutput(str: string): string {
  if (!str) return "";
  return str
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

/**
 * Formats expected JSON return values into the exact string output
 * produced by driver serialization functions.
 */
export function formatExpectedOutput(expected: any, returnType: string): string {
  if (expected === null || expected === undefined) return "";

  switch (returnType) {
    case "int":
      return String(expected);

    case "double": {
      const num = Number(expected);
      return isNaN(num) ? String(expected) : num.toFixed(6);
    }

    case "string":
      return typeof expected === "string" ? expected : JSON.stringify(expected);

    case "boolean":
      return expected ? "true" : "false";

    case "int[]":
      if (Array.isArray(expected)) return expected.join(" ");
      return String(expected);

    case "double[]":
      if (Array.isArray(expected)) {
        return expected.map((x) => Number(x).toFixed(6)).join(" ");
      }
      return String(expected);

    case "boolean[]":
      if (Array.isArray(expected)) {
        return expected.map((x) => (x ? "true" : "false")).join(" ");
      }
      return String(expected);

    case "string[]":
      if (Array.isArray(expected)) return expected.join("\n");
      return String(expected);

    case "int[][]":
      if (Array.isArray(expected)) {
        return expected
          .map((row) => (Array.isArray(row) ? row.join(" ") : String(row)))
          .join("\n");
      }
      return String(expected);

    default:
      if (typeof expected === "object") return JSON.stringify(expected);
      return String(expected);
  }
}

/**
 * Converts a JSON positional arguments array (e.g. [[2,7,11,15], 9])
 * matching a problem signature into line-separated STDIN string for execution drivers.
 */
export function serializeInputToStdin(args: any[], params: ParamSignature[]): string {
  if (!Array.isArray(args)) {
    return "";
  }

  const allTokens: string[] = [];

  for (let i = 0; i < params.length; i++) {
    const param = params[i];
    const argVal = args[i];
    const paramTokens = serializeParamToTokens(argVal, param.type);
    allTokens.push(...paramTokens);
  }

  return allTokens.join("\n") + "\n";
}

/**
 * Converts multiple test cases into a single STDIN string starting with the number of test cases (T),
 * allowing batch execution of all test cases in a single process compile & run call.
 */
export function serializeBatchInputToStdin(
  testCases: Array<{ input: any }>,
  params: ParamSignature[]
): string {
  if (!Array.isArray(testCases)) {
    return "0\n";
  }

  const allTokens: string[] = [String(testCases.length)];

  for (const tc of testCases) {
    const args = Array.isArray(tc.input) ? tc.input : [tc.input];
    for (let i = 0; i < params.length; i++) {
      const param = params[i];
      const argVal = args[i];
      const paramTokens = serializeParamToTokens(argVal, param.type);
      allTokens.push(...paramTokens);
    }
  }

  return allTokens.join("\n") + "\n";
}

