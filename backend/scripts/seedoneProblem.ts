import { PrismaClient, Difficulty, Language, CheckerType } from "../src/generated/prisma/client";
import { db } from "../src/config/db";

async function main() {
  const problem = await db.problem.create({
    data: {
      problemNumber: 1,
      title: "Two Sum",
      slug: "two-sum",
      difficulty: Difficulty.EASY,

      description: `Given an integer array \`nums\` and an integer \`target\`, return the indices of the two numbers such that they add up to \`target\`.

You may assume that each input has exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,

      constraints: [
        "2 <= nums.length <= 10^4",
        "-10^9 <= nums[i] <= 10^9",
        "-10^9 <= target <= 10^9",
        "Exactly one valid answer exists."
      ],

      timeLimitMs: 1000,
      memoryLimitMb: 256,
      isActive: true,

      judge: {
        create: {
          checker: CheckerType.NORMAL,
          customChecker: null,
          parser: null,
          validator: null
        }
      },

      topics: {
        connectOrCreate: [
          {
            where: { name: "Array" },
            create: { name: "Array" }
          },
          {
            where: { name: "Hash Table" },
            create: { name: "Hash Table" }
          }
        ]
      },

      examples: {
        create: [
          {
            order: 1,
            input: "nums = [2,7,11,15], target = 9",
            output: "[0,1]",
            explanation: "Because nums[0] + nums[1] == 9."
          },
          {
            order: 2,
            input: "nums = [3,2,4], target = 6",
            output: "[1,2]",
            explanation: "Because nums[1] + nums[2] == 6."
          },
          {
            order: 3,
            input: "nums = [3,3], target = 6",
            output: "[0,1]",
            explanation: "The two elements sum to 6."
          }
        ]
      },

      signatures: {
        create: [
          {
            functionName: "twoSum",
            returnType: "vector<int>",
            parameters: [
              { name: "nums", type: "vector<int>" },
              { name: "target", type: "int" }
            ]
          },
          {
            functionName: "twoSum",
            returnType: "int[]",
            parameters: [
              { name: "nums", type: "int[]" },
              { name: "target", type: "int" }
            ]
          },
          {
            functionName: "twoSum",
            returnType: "list[int]",
            parameters: [
              { name: "nums", type: "list[int]" },
              { name: "target", type: "int" }
            ]
          },
          {
            functionName: "twoSum",
            returnType: "number[]",
            parameters: [
              { name: "nums", type: "number[]" },
              { name: "target", type: "number" }
            ]
          },
          {
            functionName: "twoSum",
            returnType: "number[]",
            parameters: [
              { name: "nums", type: "number[]" },
              { name: "target", type: "number" }
            ]
          },
          {
            functionName: "twoSum",
            returnType: "[]int",
            parameters: [
              { name: "nums", type: "[]int" },
              { name: "target", type: "int" }
            ]
          }
        ]
      },

      starterCodes: {
        create: [
          {
            language: Language.CPP,
            starterCode: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {

    }
};`,
            solutionClass: "Solution",
            imports: `#include <bits/stdc++.h>
using namespace std;`
          },
          {
            language: Language.JAVA,
            starterCode: `class Solution {
    public int[] twoSum(int[] nums, int target) {

    }
}`,
            solutionClass: "Solution",
            imports: "import java.util.*;"
          },
          {
            language: Language.PYTHON,
            starterCode: `class Solution:
    def twoSum(self, nums, target):
        pass`,
            solutionClass: "Solution",
            imports: ""
          }
        ]
      },

      testCases: {
        create: [
          {
            input: {
              nums: [2, 7, 11, 15],
              target: 9
            },
            expectedOutput: [0, 1],
            isSample: true,
            isHidden: false,
            order: 1,
            weight: 1
          },
          {
            input: {
              nums: [3, 2, 4],
              target: 6
            },
            expectedOutput: [1, 2],
            isSample: true,
            isHidden: false,
            order: 2,
            weight: 1
          },
          {
            input: {
              nums: [3, 3],
              target: 6
            },
            expectedOutput: [0, 1],
            isSample: true,
            isHidden: false,
            order: 3,
            weight: 1
          },
          {
            input: {
              nums: [1, 5, 8, 10],
              target: 18
            },
            expectedOutput: [2, 3],
            isSample: false,
            isHidden: true,
            order: 4,
            weight: 1
          },
          {
            input: {
              nums: [-5, 4, 10, -2],
              target: 5
            },
            expectedOutput: [0, 2],
            isSample: false,
            isHidden: true,
            order: 5,
            weight: 2
          }
        ]
      }
    }
  });

  console.log(`✅ Seeded problem: ${problem.title}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await db.$disconnect();
  });