import { Language } from "../generated/prisma/client";

export interface ParamSignature {
  name: string;
  type: string;
}

export interface ProblemSignature {
  functionName: string;
  returnType: string;
  params: ParamSignature[];
}

function getCppType(type: string): string {
  switch (type) {
    case "int": return "int";
    case "double": return "double";
    case "string": return "string";
    case "boolean": return "bool";
    case "int[]": return "vector<int>";
    case "double[]": return "vector<double>";
    case "string[]": return "vector<string>";
    case "boolean[]": return "vector<bool>";
    case "int[][]": return "vector<vector<int>>";
    case "void": return "void";
    default: return type;
  }
}

function getJavaType(type: string): string {
  switch (type) {
    case "int": return "int";
    case "double": return "double";
    case "string": return "String";
    case "boolean": return "boolean";
    case "int[]": return "int[]";
    case "double[]": return "double[]";
    case "string[]": return "String[]";
    case "boolean[]": return "boolean[]";
    case "int[][]": return "int[][]";
    case "void": return "void";
    default: return type;
  }
}

function getPythonType(type: string): string {
  switch (type) {
    case "int": return "int";
    case "double": return "float";
    case "string": return "str";
    case "boolean": return "bool";
    case "int[]": return "List[int]";
    case "double[]": return "List[float]";
    case "string[]": return "List[str]";
    case "boolean[]": return "List[bool]";
    case "int[][]": return "List[List[int]]";
    case "void": return "None";
    default: return type;
  }
}

export function generateStarterCode(language: Language, signature: ProblemSignature): string {
  const { functionName, returnType, params } = signature;

  if (language === Language.CPP) {
    const cppParams = params.map(p => {
      const isArray = p.type.includes("[]");
      const baseType = getCppType(p.type);
      return isArray ? `${baseType}& ${p.name}` : `${baseType} ${p.name}`;
    }).join(", ");

    return `class Solution {
public:
    ${getCppType(returnType)} ${functionName}(${cppParams}) {
        // Write your code here
    }
};`;
  }

  if (language === Language.JAVA) {
    const javaParams = params.map(p => {
      return `${getJavaType(p.type)} ${p.name}`;
    }).join(", ");

    return `class Solution {
    public ${getJavaType(returnType)} ${functionName}(${javaParams}) {
        // Write your code here
    }
}`;
  }

  if (language === Language.PYTHON) {
    const pyParams = params.map(p => {
      return `${p.name}: ${getPythonType(p.type)}`;
    }).join(", ");

    return `class Solution:
    def ${functionName}(self, ${pyParams}) -> ${getPythonType(returnType)}:
        # Write your code here
        pass`;
  }

  throw new Error(`Unsupported language: ${language}`);
}

export function generateDriver(language: Language, signature: ProblemSignature): string {
  const { functionName, returnType, params } = signature;

  // ---------------------------------------------------------------------
  // C++
  // ---------------------------------------------------------------------
  if (language === Language.CPP) {
    const parseCalls = params.map(p => {
      let parserFn = "";
      switch (p.type) {
        case "int": parserFn = "parse_int()"; break;
        case "double": parserFn = "parse_float()"; break;
        case "string": parserFn = "parse_string()"; break;
        case "boolean": parserFn = "parse_boolean()"; break;
        case "int[]": parserFn = "parse_int_array()"; break;
        case "double[]": parserFn = "parse_float_array()"; break;
        case "string[]": parserFn = "parse_string_array()"; break;
        case "boolean[]": parserFn = "parse_boolean_array()"; break;
        case "int[][]": parserFn = "parse_int_2d_array()"; break;
      }
      return `    auto ${p.name} = ${parserFn};`;
    }).join("\n");

    const methodArgs = params.map(p => p.name).join(", ");
    let executionStmt = "";
    if (returnType === "void") {
      // FIX: guard against void functions with zero parameters (nothing to serialize)
      if (params.length > 0) {
        const firstParam = params[0];
        executionStmt = `    sol.${functionName}(${methodArgs});\n    serialize_and_print(${firstParam.name});`;
      } else {
        executionStmt = `    sol.${functionName}(${methodArgs});`;
      }
    } else {
      executionStmt = `    auto result = sol.${functionName}(${methodArgs});\n    serialize_and_print(result);`;
    }

    return `#include <bits/stdc++.h>
#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <iomanip>
#include <algorithm>

using namespace std;

// FIX: doubles are now printed with a fixed, deterministic precision so that
// output is comparable across languages (C++/Java/Python previously used
// different default float formatting, which caused false "wrong answer"
// verdicts even when the underlying value was correct).
string format_double(double val) {
    ostringstream oss;
    oss << fixed << setprecision(6) << val;
    return oss.str();
}

int parse_int() {
    int val;
    if (!(cin >> val)) return 0;
    return val;
}

double parse_float() {
    double val;
    if (!(cin >> val)) return 0.0;
    return val;
}

string parse_string() {
    string val;
    if (!(cin >> val)) return "";
    return val;
}

bool parse_boolean() {
    string val;
    if (!(cin >> val)) return false;
    return (val == "true" || val == "1");
}

vector<int> parse_int_array() {
    int n;
    if (!(cin >> n)) return {};
    vector<int> arr(n);
    for (int i = 0; i < n; ++i) {
        cin >> arr[i];
    }
    return arr;
}

vector<double> parse_float_array() {
    int n;
    if (!(cin >> n)) return {};
    vector<double> arr(n);
    for (int i = 0; i < n; ++i) {
        cin >> arr[i];
    }
    return arr;
}

vector<string> parse_string_array() {
    int n;
    if (!(cin >> n)) return {};
    vector<string> arr(n);
    for (int i = 0; i < n; ++i) {
        cin >> arr[i];
    }
    return arr;
}

vector<bool> parse_boolean_array() {
    int n;
    if (!(cin >> n)) return {};
    vector<bool> arr(n);
    for (int i = 0; i < n; ++i) {
        string val;
        cin >> val;
        arr[i] = (val == "true" || val == "1");
    }
    return arr;
}

vector<vector<int>> parse_int_2d_array() {
    int r, c;
    if (!(cin >> r >> c)) return {};
    vector<vector<int>> grid(r, vector<int>(c));
    for (int i = 0; i < r; ++i) {
        for (int j = 0; j < c; ++j) {
            cin >> grid[i][j];
        }
    }
    return grid;
}

void serialize_and_print(int val) {
    cout << val << endl;
}

void serialize_and_print(double val) {
    cout << format_double(val) << endl;
}

void serialize_and_print(const string& val) {
    cout << val << endl;
}

void serialize_and_print(bool val) {
    cout << (val ? "true" : "false") << endl;
}

void serialize_and_print(const vector<int>& arr) {
    for (size_t i = 0; i < arr.size(); ++i) {
        cout << arr[i] << (i + 1 == arr.size() ? "" : " ");
    }
    cout << endl;
}

void serialize_and_print(const vector<double>& arr) {
    for (size_t i = 0; i < arr.size(); ++i) {
        cout << format_double(arr[i]) << (i + 1 == arr.size() ? "" : " ");
    }
    cout << endl;
}

void serialize_and_print(const vector<string>& arr) {
    for (size_t i = 0; i < arr.size(); ++i) {
        cout << arr[i] << (i + 1 == arr.size() ? "" : "\\n");
    }
    cout << endl;
}

void serialize_and_print(const vector<bool>& arr) {
    for (size_t i = 0; i < arr.size(); ++i) {
        cout << (arr[i] ? "true" : "false") << (i + 1 == arr.size() ? "" : " ");
    }
    cout << endl;
}

void serialize_and_print(const vector<vector<int>>& grid) {
    for (size_t i = 0; i < grid.size(); ++i) {
        for (size_t j = 0; j < grid[i].size(); ++j) {
            cout << grid[i][j] << (j + 1 == grid[i].size() ? "" : " ");
        }
        cout << (i + 1 == grid.size() ? "" : "\\n");
    }
    cout << endl;
}

{{USER_CODE}}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int num_test_cases = 0;
    if (!(cin >> num_test_cases)) return 0;
    Solution sol;
    for (int tc = 0; tc < num_test_cases; ++tc) {
${parseCalls}
${executionStmt}
        cout << "===END_CASE===" << endl;
    }
    return 0;
}`;
  }

  // ---------------------------------------------------------------------
  // Java
  // ---------------------------------------------------------------------
  if (language === Language.JAVA) {
    const parseCalls = params.map(p => {
      let parserFn = "";
      switch (p.type) {
        case "int": parserFn = "nextInt()"; break;
        case "double": parserFn = "nextDouble()"; break;
        case "string": parserFn = "nextString()"; break;
        case "boolean": parserFn = "nextBool()"; break;
        case "int[]": parserFn = "nextIntArray()"; break;
        case "double[]": parserFn = "nextDoubleArray()"; break;
        case "string[]": parserFn = "nextStringArray()"; break;
        case "boolean[]": parserFn = "nextBoolArray()"; break;
        case "int[][]": parserFn = "nextInt2DArray()"; break;
      }
      return `        ${getJavaType(p.type)} ${p.name} = ${parserFn};`;
    }).join("\n");

    const methodArgs = params.map(p => p.name).join(", ");
    let executionStmt = "";
    if (returnType === "void") {
      if (params.length > 0) {
        const firstParam = params[0];
        executionStmt = `        sol.${functionName}(${methodArgs});\n        printResult(${firstParam.name});`;
      } else {
        executionStmt = `        sol.${functionName}(${methodArgs});`;
      }
    } else {
      executionStmt = `        ${getJavaType(returnType)} result = sol.${functionName}(${methodArgs});\n        printResult(result);`;
    }

    return `import java.util.*;
import java.io.*;

public class Main {
    private static StreamTokenizer st;
    private static BufferedWriter bw;

    private static void initIO() throws IOException {
        st = new StreamTokenizer(new BufferedReader(new InputStreamReader(System.in)));
        st.ordinaryChars(0, 255);
        st.wordChars(33, 255);
        st.whitespaceChars(0, 32);
        bw = new BufferedWriter(new OutputStreamWriter(System.out));
    }

    private static String nextString() throws IOException {
        st.nextToken();
        return st.sval;
    }

    private static int nextInt() throws IOException {
        st.nextToken();
        return Integer.parseInt(st.sval);
    }

    private static double nextDouble() throws IOException {
        st.nextToken();
        return Double.parseDouble(st.sval);
    }

    private static boolean nextBool() throws IOException {
        st.nextToken();
        return st.sval.equalsIgnoreCase("true") || st.sval.equals("1");
    }

    private static int[] nextIntArray() throws IOException {
        int n = nextInt();
        int[] arr = new int[n];
        for (int i = 0; i < n; i++) arr[i] = nextInt();
        return arr;
    }

    private static double[] nextDoubleArray() throws IOException {
        int n = nextInt();
        double[] arr = new double[n];
        for (int i = 0; i < n; i++) arr[i] = nextDouble();
        return arr;
    }

    private static String[] nextStringArray() throws IOException {
        int n = nextInt();
        String[] arr = new String[n];
        for (int i = 0; i < n; i++) arr[i] = nextString();
        return arr;
    }

    private static boolean[] nextBoolArray() throws IOException {
        int n = nextInt();
        boolean[] arr = new boolean[n];
        for (int i = 0; i < n; i++) arr[i] = nextBool();
        return arr;
    }

    private static int[][] nextInt2DArray() throws IOException {
        int r = nextInt();
        int c = nextInt();
        int[][] grid = new int[r][c];
        for (int i = 0; i < r; i++)
            for (int j = 0; j < c; j++)
                grid[i][j] = nextInt();
        return grid;
    }

    private static String fmtDouble(double val) {
        return String.format("%.6f", val);
    }

    private static void printResult(int val) throws IOException {
        bw.write(String.valueOf(val));
        bw.newLine();
    }

    private static void printResult(double val) throws IOException {
        bw.write(fmtDouble(val));
        bw.newLine();
    }

    private static void printResult(String val) throws IOException {
        bw.write(val);
        bw.newLine();
    }

    private static void printResult(boolean val) throws IOException {
        bw.write(val ? "true" : "false");
        bw.newLine();
    }

    private static void printResult(int[] arr) throws IOException {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < arr.length; i++) {
            if (i > 0) sb.append(' ');
            sb.append(arr[i]);
        }
        bw.write(sb.toString());
        bw.newLine();
    }

    private static void printResult(double[] arr) throws IOException {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < arr.length; i++) {
            if (i > 0) sb.append(' ');
            sb.append(fmtDouble(arr[i]));
        }
        bw.write(sb.toString());
        bw.newLine();
    }

    private static void printResult(String[] arr) throws IOException {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < arr.length; i++) {
            if (i > 0) sb.append("\\n");
            sb.append(arr[i]);
        }
        bw.write(sb.toString());
        bw.newLine();
    }

    private static void printResult(boolean[] arr) throws IOException {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < arr.length; i++) {
            if (i > 0) sb.append(' ');
            sb.append(arr[i] ? "true" : "false");
        }
        bw.write(sb.toString());
        bw.newLine();
    }

    private static void printResult(int[][] grid) throws IOException {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < grid.length; i++) {
            if (i > 0) sb.append("\\n");
            for (int j = 0; j < grid[i].length; j++) {
                if (j > 0) sb.append(' ');
                sb.append(grid[i][j]);
            }
        }
        bw.write(sb.toString());
        bw.newLine();
    }

    public static void main(String[] args) throws IOException {
        initIO();
        int numTestCases = nextInt();
        Solution sol = new Solution();
        for (int tc = 0; tc < numTestCases; tc++) {
${parseCalls}
${executionStmt}
            bw.write("===END_CASE===");
            bw.newLine();
        }
        bw.flush();
    }
}

{{USER_CODE}}`;

  }


  // ---------------------------------------------------------------------
  // Python
  // ---------------------------------------------------------------------
  if (language === Language.PYTHON) {
    const parseCalls = params.map(p => {
      let parserFn = "";
      switch (p.type) {
        case "int": parserFn = "_next_int()"; break;
        case "double": parserFn = "_next_float()"; break;
        case "string": parserFn = "_next_token()"; break;
        case "boolean": parserFn = "_next_bool()"; break;
        case "int[]": parserFn = "_next_int_array()"; break;
        case "double[]": parserFn = "_next_float_array()"; break;
        case "string[]": parserFn = "_next_string_array()"; break;
        case "boolean[]": parserFn = "_next_bool_array()"; break;
        case "int[][]": parserFn = "_next_int_2d_array()"; break;
      }
      return `        ${p.name} = ${parserFn}`;
    }).join("\n");

    const methodArgs = params.map(p => p.name).join(", ");
    let executionStmt = "";
    if (returnType === "void") {
      if (params.length > 0) {
        const firstParam = params[0];
        executionStmt = `            sol.${functionName}(${methodArgs})\n            print(_serialize(${firstParam.name}, "${firstParam.type}"))`;
      } else {
        executionStmt = `            sol.${functionName}(${methodArgs})`;
      }
    } else {
      executionStmt = `            result = sol.${functionName}(${methodArgs})\n            print(_serialize(result, "${returnType}"))`;
    }

    return `import sys
import math
import heapq
import bisect
import functools
from collections import defaultdict, deque, Counter, OrderedDict
from typing import List, Dict, Tuple, Optional

# ── Token-based stdin reader (mirrors C++ cin >> behaviour) ──
_tokens = iter(sys.stdin.read().split())

def _next_token():
    return next(_tokens, "")

def _next_int():
    t = _next_token()
    return int(t) if t else 0

def _next_float():
    t = _next_token()
    return float(t) if t else 0.0

def _next_bool():
    t = _next_token().lower()
    return t == "true" or t == "1"

def _next_int_array():
    n = _next_int()
    return [_next_int() for _ in range(n)]

def _next_float_array():
    n = _next_int()
    return [_next_float() for _ in range(n)]

def _next_string_array():
    n = _next_int()
    return [_next_token() for _ in range(n)]

def _next_bool_array():
    n = _next_int()
    return [_next_bool() for _ in range(n)]

def _next_int_2d_array():
    r = _next_int()
    c = _next_int()
    return [[_next_int() for _ in range(c)] for _ in range(r)]

# ── Output serialization (matches C++/Java output format) ──
def _fmt_double(v):
    return f"{v:.6f}"

def _fmt_bool(v):
    return "true" if v else "false"

def _serialize(val, val_type):
    if val is None or val_type == "void":
        return ""
    if val_type == "boolean":
        return _fmt_bool(val)
    if val_type == "double":
        return _fmt_double(val)
    if val_type == "int[]":
        return " ".join(map(str, val))
    if val_type == "double[]":
        return " ".join(_fmt_double(x) for x in val)
    if val_type == "boolean[]":
        return " ".join(_fmt_bool(x) for x in val)
    if val_type == "string[]":
        return "\\n".join(val)
    if val_type == "int[][]":
        return "\\n".join(" ".join(map(str, row)) for row in val)
    return str(val)

{{USER_CODE}}

if __name__ == "__main__":
    t_str = _next_token()
    num_test_cases = int(t_str) if t_str else 0
    sol = Solution()
    for _ in range(num_test_cases):
${parseCalls}
        try:
${executionStmt}
            print("===END_CASE===")
        except Exception as e:
            print(e, file=sys.stderr)
            print("===END_CASE===")
            sys.exit(1)`;
  }

  throw new Error(`Unsupported language: ${language}`);
}