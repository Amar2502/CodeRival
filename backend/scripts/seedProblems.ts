import { db } from "../src/config/db";
import fs from "fs";
import { Difficulty, Language} from "../src/generated/prisma/client";

type Example = {
  input: string;
  output: string;
};

type ProblemSeed = {
  title: string;
  slug: string;
  difficulty: string;
  description: string;
  topics: string[];
  examples: Example[];
  starter_code: {
    python?: string;
    java?: string;
    cpp?: string;
  };
};

const data: ProblemSeed[] = JSON.parse(
  fs.readFileSync("problems.json", "utf-8")
);

// -----------------------------
// HELPERS
// -----------------------------
function mapDifficulty(d: string): Difficulty {
  const val = d.toLowerCase();
  if (val === "easy") return Difficulty.EASY;
  if (val === "medium") return Difficulty.MEDIUM;
  return Difficulty.HARD;
}

async function main() {
  for (const p of data) {

    await db.$transaction(async (tx) => {

      // -----------------------------
      // 1. UPSERT PROBLEM
      // -----------------------------
      const problem = await tx.problem.upsert({
        where: { slug: p.slug },
        update: {
          description: p.description,
        },
        create: {
          title: p.title,
          slug: p.slug,
          description: p.description,
          difficulty: mapDifficulty(p.difficulty),
          constraints: [],
          timeLimitMs: 1000,
          memoryLimitMb: 256,
          isActive: true,
        },
      });

      // -----------------------------
      // 2. TOPICS (DEDUPED)
      // -----------------------------
      const topicIds: string[] = [];

      for (const t of p.topics || []) {
        const topic = await tx.topic.upsert({
          where: { name: t },
          update: {},
          create: { name: t },
        });

        topicIds.push(topic.id);
      }

      // connect topics in one go (avoids duplicates)
      await tx.problem.update({
        where: { id: problem.id },
        data: {
          topics: {
            set: topicIds.map(id => ({ id })),
          },
        },
      });

      // -----------------------------
      // 3. STARTER CODE (CPP / JAVA / PYTHON)
      // -----------------------------
      const starter = p.starter_code || {};

      const starterData = [
        { lang: Language.CPP, code: starter.cpp },
        { lang: Language.JAVA, code: starter.java },
        { lang: Language.PYTHON, code: starter.python },
      ];

      for (const s of starterData) {
        if (!s.code) continue;

        await tx.problemStarterCode.upsert({
          where: {
            problemId_language: {
              problemId: problem.id,
              language: s.lang,
            },
          },
          update: {
            starterCode: s.code,
          },
          create: {
            problemId: problem.id,
            language: s.lang,
            starterCode: s.code,
          },
        });
      }

      // -----------------------------
      // 4. TEST CASES (BULK INSERT)
      // -----------------------------
      if (p.examples?.length) {

        await tx.problemTestCase.deleteMany({
          where: { problemId: problem.id },
        });

        await tx.problemTestCase.createMany({
          data: p.examples.map((ex, i) => ({
            problemId: problem.id,
            input: ex.input,
            output: ex.output,
            isSample: i < 2,
            isHidden: i >= 2,
          })),
        });
      }

    });

    console.log(`Seeded: ${p.slug}`);
  }

  console.log("🔥 All problems seeded successfully");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await db.$disconnect();
  });