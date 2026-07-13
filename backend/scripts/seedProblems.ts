import { db } from "../src/config/db";
import fs from "fs";
import { Difficulty, Language } from "../src/generated/prisma/client";
import path from "path";

async function main() {

  const filePath = path.join(__dirname, "problems.json");

  const problems = JSON.parse(
    fs.readFileSync(filePath, "utf-8")
  );


  for (const problem of problems) {

    console.log(`Seeding: ${problem.title}`);


    const createdProblem = await db.problem.upsert({
      where: {
        slug: problem.slug,
      },
      update: {},
      create: {
        problemNumber: problem.problemNumber,
        title: problem.title,
        slug: problem.slug,
        difficulty: problem.difficulty as Difficulty,
        description: problem.description,
        constraints: problem.constraints,
        timeLimitMs: problem.timeLimitMs,
        memoryLimitMb: problem.memoryLimitMb,
      }
    });
    // -----------------------
    // Examples
    // -----------------------
    await db.problemExample.createMany({
      data: problem.examples.map((example: any) => ({
        problemId: createdProblem.id,
        input: example.input,
        output: example.output,
        explanation: example.explanation,
        order: example.order,
      })),
    });
    // -----------------------
    // Starter Codes
    // -----------------------

    await db.problemStarterCode.createMany({
      data: problem.starterCodes.map((starter: any) => ({
        problemId: createdProblem.id,
        language: starter.language as Language,
        code: starter.code,
      })),
    });
    // -----------------------
    // Test Cases
    // -----------------------

    await db.problemTestCase.createMany({
      data: problem.testCases.map((test: any) => ({
        problemId: createdProblem.id,
        input: test.input,
        expected: test.expected,
      }))
    });
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