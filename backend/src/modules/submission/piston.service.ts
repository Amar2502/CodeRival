import axios from "axios";
import { Language } from "../../generated/prisma/client";
import { AppError } from "../../utils/errors";

export interface PistonFile {
  name?: string;
  content: string;
}

export interface PistonExecuteOptions {
  language: string;
  version?: string;
  files: PistonFile[];
  stdin?: string;
  args?: string[];
  compileTimeout?: number;
  runTimeout?: number;
}

export interface PistonOutput {
  stdout: string;
  stderr: string;
  code: number;
  signal: string | null;
  output: string;
}

export interface PistonResponse {
  language: string;
  version: string;
  run: PistonOutput;
  compile?: PistonOutput;
}

export class PistonService {
  private static getPistonUrl(): string {
    return process.env.PISTON_URL || "http://localhost:2000";
  }

  public static getPistonLanguage(language: Language): string {
    switch (language) {
      case Language.CPP:
        return "c++";
      case Language.JAVA:
        return "java";
      case Language.PYTHON:
        return "python";
      default:
        return String(language).toLowerCase();
    }
  }

  public static getPistonFilename(language: Language): string {
    switch (language) {
      case Language.JAVA:
        return "Main.java";
      case Language.CPP:
        return "main.cpp";
      case Language.PYTHON:
        return "main.py";
      default:
        return "main";
    }
  }

  public static async execute(options: PistonExecuteOptions): Promise<PistonResponse> {
    try {
      const url = this.getPistonUrl();
      const response = await axios.post<PistonResponse>(
        `${url}/api/v2/execute`,
        {
          language: options.language,
          version: options.version || "*",
          files: options.files,
          stdin: options.stdin || "",
          args: options.args || [],
          compile_timeout: options.compileTimeout || 10000,
          run_timeout: options.runTimeout || 5000,
        },
        { timeout: 20000 }
      );
      return response.data;
    } catch (error: any) {
      console.error("Piston execution failed:", error.message);
      throw new AppError("Code execution engine unavailable", 503, error.message);
    }
  }
}
