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
${parseCalls}
    Solution sol;
${executionStmt}
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
        case "int": parserFn = "parse_int()"; break;
        case "double": parserFn = "parse_double()"; break;
        case "string": parserFn = "parse_string()"; break;
        case "boolean": parserFn = "parse_boolean()"; break;
        case "int[]": parserFn = "parse_int_array()"; break;
        case "double[]": parserFn = "parse_double_array()"; break;
        case "string[]": parserFn = "parse_string_array()"; break;
        case "boolean[]": parserFn = "parse_boolean_array()"; break;
        case "int[][]": parserFn = "parse_int_2d_array()"; break;
      }
      return `        ${getJavaType(p.type)} ${p.name} = ${parserFn};`;
    }).join("\n");

    const methodArgs = params.map(p => p.name).join(", ");
    let executionStmt = "";
    if (returnType === "void") {
      // FIX: guard against void functions with zero parameters
      if (params.length > 0) {
        const firstParam = params[0];
        executionStmt = `        sol.${functionName}(${methodArgs});\n        serialize_and_print(${firstParam.name});`;
      } else {
        executionStmt = `        sol.${functionName}(${methodArgs});`;
      }
    } else {
      executionStmt = `        ${getJavaType(returnType)} result = sol.${functionName}(${methodArgs});\n        serialize_and_print(result);`;
    }

    // FIX (critical): {{USER_CODE}} is now injected BEFORE the "public class Main"
    // declaration instead of after it. The starter code the user edits begins
    // with "import java.util.*;" — Java requires ALL import statements to
    // appear before ANY type declaration in the file. Placing {{USER_CODE}}
    // after "public class Main { ... }" (as in the original version) put an
    // import statement after a class declaration, which is a guaranteed
    // compile error for every single Java submission. Duplicate imports
    // (java.util.* appearing twice) are legal in Java, so this is safe.
    return `import java.util.*;
import java.io.*;

{{USER_CODE}}

public class Main {
    private static final Scanner sc = new Scanner(System.in);

    private static int parse_int() {
        return sc.nextInt();
    }

    private static double parse_double() {
        return sc.nextDouble();
    }

    private static String parse_string() {
        return sc.next();
    }

    private static boolean parse_boolean() {
        String val = sc.next();
        return val.equalsIgnoreCase("true") || val.equals("1");
    }

    private static int[] parse_int_array() {
        if (!sc.hasNextInt()) return new int[0];
        int n = sc.nextInt();
        int[] arr = new int[n];
        for (int i = 0; i < n; i++) {
            arr[i] = sc.nextInt();
        }
        return arr;
    }

    private static double[] parse_double_array() {
        if (!sc.hasNextInt()) return new double[0];
        int n = sc.nextInt();
        double[] arr = new double[n];
        for (int i = 0; i < n; i++) {
            arr[i] = sc.nextDouble();
        }
        return arr;
    }

    private static String[] parse_string_array() {
        if (!sc.hasNextInt()) return new String[0];
        int n = sc.nextInt();
        String[] arr = new String[n];
        for (int i = 0; i < n; i++) {
            arr[i] = sc.next();
        }
        return arr;
    }

    private static boolean[] parse_boolean_array() {
        if (!sc.hasNextInt()) return new boolean[0];
        int n = sc.nextInt();
        boolean[] arr = new boolean[n];
        for (int i = 0; i < n; i++) {
            String val = sc.next();
            arr[i] = val.equalsIgnoreCase("true") || val.equals("1");
        }
        return arr;
    }

    private static int[][] parse_int_2d_array() {
        if (!sc.hasNextInt()) return new int[0][0];
        int r = sc.nextInt();
        int c = sc.nextInt();
        int[][] grid = new int[r][c];
        for (int i = 0; i < r; i++) {
            for (int j = 0; j < c; j++) {
                grid[i][j] = sc.nextInt();
            }
        }
        return grid;
    }

    // FIX: consistent fixed-precision double formatting (matches C++/Python)
    private static String format_double(double val) {
        return String.format("%.6f", val);
    }

    private static void serialize_and_print(int val) {
        System.out.println(val);
    }

    private static void serialize_and_print(double val) {
        System.out.println(format_double(val));
    }

    private static void serialize_and_print(String val) {
        System.out.println(val);
    }

    private static void serialize_and_print(boolean val) {
        System.out.println(val);
    }

    private static void serialize_and_print(int[] arr) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < arr.length; i++) {
            sb.append(arr[i]).append(i + 1 == arr.length ? "" : " ");
        }
        System.out.println(sb.toString());
    }

    private static void serialize_and_print(double[] arr) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < arr.length; i++) {
            sb.append(format_double(arr[i])).append(i + 1 == arr.length ? "" : " ");
        }
        System.out.println(sb.toString());
    }

    private static void serialize_and_print(String[] arr) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < arr.length; i++) {
            sb.append(arr[i]).append(i + 1 == arr.length ? "" : "\\n");
        }
        System.out.println(sb.toString());
    }

    private static void serialize_and_print(boolean[] arr) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < arr.length; i++) {
            sb.append(arr[i]).append(i + 1 == arr.length ? "" : " ");
        }
        System.out.println(sb.toString());
    }

    private static void serialize_and_print(int[][] grid) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < grid.length; i++) {
            for (int j = 0; j < grid[i].length; j++) {
                sb.append(grid[i][j]).append(j + 1 == grid[i].length ? "" : " ");
            }
            if (i + 1 < grid.length) {
                sb.append("\\n");
            }
        }
        System.out.println(sb.toString());
    }

    public static void main(String[] args) {
${parseCalls}
        Solution sol = new Solution();
${executionStmt}
    }
}`;
  }

  // ---------------------------------------------------------------------
  // Python
  // ---------------------------------------------------------------------
  if (language === Language.PYTHON) {
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
      return `    ${p.name} = ${parserFn}`;
    }).join("\n");

    const methodArgs = params.map(p => p.name).join(", ");
    let executionStmt = "";
    if (returnType === "void") {
      // FIX: guard against void functions with zero parameters
      if (params.length > 0) {
        const firstParam = params[0];
        executionStmt = `        sol.${functionName}(${methodArgs})\n        print(serialize_value(${firstParam.name}, "${firstParam.type}"))`;
      } else {
        executionStmt = `        sol.${functionName}(${methodArgs})`;
      }
    } else {
      executionStmt = `        result = sol.${functionName}(${methodArgs})\n        print(serialize_value(result, "${returnType}"))`;
    }

    return `import sys
import math
import heapq
import bisect
import functools
from collections import defaultdict, deque, Counter, OrderedDict
from typing import List, Dict, Tuple, Optional

def parse_int():
    line = sys.stdin.readline()
    if not line:
        return 0
    return int(line.strip())

def parse_float():
    line = sys.stdin.readline()
    if not line:
        return 0.0
    return float(line.strip())

def parse_string():
    line = sys.stdin.readline()
    if not line:
        return ""
    return line.strip()

def parse_boolean():
    line = sys.stdin.readline()
    if not line:
        return False
    val = line.strip().lower()
    return val == 'true' or val == '1'

def parse_int_array():
    line = sys.stdin.readline()
    if not line:
        return []
    line = line.strip()
    if not line:
        return []
    n = int(line)
    if n == 0:
        return []
    elements_line = sys.stdin.readline()
    if not elements_line:
        return []
    return list(map(int, elements_line.strip().split()))

def parse_float_array():
    line = sys.stdin.readline()
    if not line:
        return []
    line = line.strip()
    if not line:
        return []
    n = int(line)
    if n == 0:
        return []
    elements_line = sys.stdin.readline()
    if not elements_line:
        return []
    return list(map(float, elements_line.strip().split()))

def parse_string_array():
    line = sys.stdin.readline()
    if not line:
        return []
    line = line.strip()
    if not line:
        return []
    n = int(line)
    arr = []
    for _ in range(n):
        arr.append(sys.stdin.readline().strip())
    return arr

def parse_boolean_array():
    line = sys.stdin.readline()
    if not line:
        return []
    line = line.strip()
    if not line:
        return []
    n = int(line)
    if n == 0:
        return []
    elements_line = sys.stdin.readline()
    if not elements_line:
        return []
    return [el.lower() == 'true' or el == '1' for el in elements_line.strip().split()]

def parse_int_2d_array():
    line = sys.stdin.readline()
    if not line:
        return []
    line = line.strip()
    if not line:
        return []
    parts = line.split()
    r = int(parts[0])
    c = int(parts[1])
    grid = []
    for _ in range(r):
        row_line = sys.stdin.readline()
        if not row_line:
            grid.append([])
        else:
            grid.append(list(map(int, row_line.strip().split())))
    return grid

# FIX: consistent fixed-precision double formatting (matches C++/Java)
def format_double(val):
    return f"{val:.6f}"

# FIX: booleans must serialize as lowercase "true"/"false" to match the
# C++ and Java drivers. Python's str(True) -> "True" previously caused
# every boolean test case to be graded as "wrong answer" when the judge
# compares raw stdout against a language-agnostic expected output string.
def format_boolean(val):
    return "true" if val else "false"

def serialize_value(val, val_type):
    if val is None:
        return ""
    if val_type == "void":
        return ""
    if val_type == "boolean":
        return format_boolean(val)
    if val_type == "double":
        return format_double(val)
    if val_type == "int[]":
        return " ".join(map(str, val))
    # FIX: was checking "float[]", but every other part of this system
    # (getPythonType, getCppType, getJavaType, ProblemSignature) uses the
    # type name "double[]". The mismatch meant double arrays always fell
    # through to str(val), printing "[1.0, 2.0]" instead of "1.0 2.0" and
    # breaking every problem whose return type is a double array.
    if val_type == "double[]":
        return " ".join(format_double(x) for x in val)
    if val_type == "boolean[]":
        return " ".join(format_boolean(x) for x in val)
    if val_type == "string[]":
        return "\\n".join(val)
    if val_type == "int[][]":
        return "\\n".join(" ".join(map(str, row)) for row in val)
    return str(val)

{{USER_CODE}}

if __name__ == '__main__':
${parseCalls}
    try:
        sol = Solution()
${executionStmt}
    except Exception as e:
        print(e, file=sys.stderr)
        sys.exit(1)`;
  }

  throw new Error(`Unsupported language: ${language}`);
}