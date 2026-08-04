import { db } from "../src/config/db";
import fs from "fs";
import { Difficulty, Language } from "../src/generated/prisma/client";
import path from "path";
import { generateStarterCode } from "../src/utils/driverGenerator";

async function main() {
  const filePath = path.join(__dirname, "problems.json");
  const problems = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  for (const problem of problems) {
    console.log(`Seeding: ${problem.title}`);

    // Process topics if present
    const topicConnections: { id: string }[] = [];
    if (problem.topics && Array.isArray(problem.topics)) {
      for (const topicName of problem.topics) {
        const topic = await db.topic.upsert({
          where: { name: topicName },
          update: {},
          create: { name: topicName },
        });
        topicConnections.push({ id: topic.id });
      }
    }

    const constraints = Array.isArray(problem.constraints)
      ? problem.constraints.join("\n")
      : problem.constraints || "";

    const createdProblem = await db.problem.upsert({
      where: {
        slug: problem.slug,
      },
      update: {
        problemNumber: problem.problemNumber,
        title: problem.title,
        difficulty: problem.difficulty as Difficulty,
        description: problem.description,
        constraints: constraints,
        timeLimitMs: problem.timeLimitMs || 2000,
        memoryLimitMb: problem.memoryLimitMb || 256,
        topics: {
          set: topicConnections,
        },
      },
      create: {
        problemNumber: problem.problemNumber,
        title: problem.title,
        slug: problem.slug,
        difficulty: problem.difficulty as Difficulty,
        description: problem.description,
        constraints: constraints,
        timeLimitMs: problem.timeLimitMs || 2000,
        memoryLimitMb: problem.memoryLimitMb || 256,
        topics: {
          connect: topicConnections,
        },
      },
    });

    // Clean old related records to prevent unique constraint violations or duplicates
    await db.problemExample.deleteMany({ where: { problemId: createdProblem.id } });
    await db.problemStarterCode.deleteMany({ where: { problemId: createdProblem.id } });
    await db.problemTestCase.deleteMany({ where: { problemId: createdProblem.id } });

    // -----------------------
    // Examples
    // -----------------------
    if (problem.examples && Array.isArray(problem.examples)) {
      await db.problemExample.createMany({
        data: problem.examples.map((example: any, index: number) => ({
          problemId: createdProblem.id,
          input: String(example.input),
          output: String(example.output),
          explanation: example.explanation || null,
          order: example.order ?? index + 1,
        })),
      });
    }

    // -----------------------
    // Signature
    // -----------------------
    if (problem.signature) {
      await db.problemSignature.upsert({
        where: { problemId: createdProblem.id },
        update: {
          functionName: problem.signature.functionName,
          returnType: problem.signature.returnType,
          params: problem.signature.params,
        },
        create: {
          problemId: createdProblem.id,
          functionName: problem.signature.functionName,
          returnType: problem.signature.returnType,
          params: problem.signature.params,
        },
      });
    }

    // -----------------------
    // Starter Codes
    // -----------------------
    if (problem.signature) {
      const languages = [Language.CPP, Language.JAVA, Language.PYTHON];
      for (const lang of languages) {
        const starterCode = generateStarterCode(lang, problem.signature);

        await db.problemStarterCode.create({
          data: {
            problemId: createdProblem.id,
            language: lang,
            code: starterCode,
          },
        });
      }
    }

    // -----------------------
    // Test Cases
    // -----------------------
    if (problem.testCases && Array.isArray(problem.testCases)) {
      await db.problemTestCase.createMany({
        data: problem.testCases.map((test: any, index: number) => ({
          problemId: createdProblem.id,
          input: test.input,
          expected: test.expected,
          order: test.order ?? index + 1,
          isSample: test.isSample !== undefined ? test.isSample : index < 2,
        })),
      });
    }

    console.log(`✓ Completed: ${problem.title}`);
  }
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });