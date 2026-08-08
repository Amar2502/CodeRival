# 🐘 CodeRival — Step 1: PostgreSQL & Problem Seeding Guide (Neon)

This document covers **Step 1** of deploying CodeRival: Provisioning, configuring, migrating, and **seeding problem bank data** into **Neon Serverless PostgreSQL**.

---

## 📌 Why Neon Serverless PostgreSQL?
- **100% Free Forever Tier**: 0.5 GiB storage, serverless auto-scaling, zero monthly cost.
- **Built-in Connection Pooling**: Handles high concurrent connections from Node.js & Prisma without running out of connections.
- **SSL Enforced**: Secure HTTPS/TLS database encryption out of the box.
- **Prisma Native Support**: Fully compatible with Prisma ORM v7+.

---

## 🚀 Part 1: Step-by-Step PostgreSQL Setup

### Step 1: Provision Database on Neon
1. Go to **[Neon Tech](https://neon.tech)** and click **Sign Up** (or Sign in with GitHub).
2. Click **Create Project**:
   - **Project Name**: `coderival-production`
   - **Database Name**: `coderival`
   - **Region**: Select region closest to your server (e.g., `AWS US East (N. Virginia)` or `AWS Frankfurt`).
3. Click **Create Project**.

---

### Step 2: Obtain Connection String
Once created, Neon will present your Connection Details in the dashboard:

1. Select **Pooled connection** (Recommended for Prisma in serverless/Node environments).
2. Copy the Connection String:
   ```env
   postgresql://coderival_owner:AbCd1234xYz@ep-cool-snowflake-123456.us-east-2.aws.neon.tech/coderival?sslmode=require
   ```

---

### Step 3: Configure Environment Variables
Update `backend/.env` with your `DATABASE_URL`:

```env
# backend/.env

# Production PostgreSQL Connection String from Neon
DATABASE_URL="postgresql://coderival_owner:AbCd1234xYz@ep-cool-snowflake-123456.us-east-2.aws.neon.tech/coderival?sslmode=require"

# Server Configuration
PORT=5000
NODE_ENV=production
JWT_SECRET=your_32_character_production_jwt_secret_key
FRONTEND_URL=https://coderival.vercel.app
```

> [!IMPORTANT]
> Ensure `?sslmode=require` is appended to enforce encrypted TLS connections.

---

### Step 4: Run Prisma Schema Migration

Navigate to your `backend` directory and push the database schema to Neon:

```bash
cd backend

# 1. Generate Prisma Client
npx prisma generate

# 2. Push Prisma Schema to Neon PostgreSQL Database
npx prisma db push
```

---

##  🌱 Part 2: Seeding Problems into Neon

After pushing the schema, your Neon database tables are created, but the problem bank is empty. You can seed problem data (signatures, starter codes, drivers, examples, test cases) into Neon using Prisma CLI.

### Step 1: Add Seed Script to `backend/prisma/seed.ts`

Create a seed script `backend/prisma/seed.ts` containing your problem suite (e.g. *Two Sum*, *Valid Palindrome*, *Reverse String*):

```typescript
import { PrismaClient, Difficulty, Language } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database problem seeding on Neon...');

  // 1. Create Problem 1: Two Sum
  const twoSum = await prisma.problem.upsert({
    where: { problemNumber: 1 },
    update: {},
    create: {
      problemNumber: 1,
      title: 'Two Sum',
      slug: 'two-sum',
      difficulty: Difficulty.EASY,
      description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.',
      constraints: '- 2 <= nums.length <= 10^4\n- -10^9 <= nums[i] <= 10^9\n- -10^9 <= target <= 10^9',
      timeLimitMs: 2000,
      memoryLimitMb: 256,
      topics: {
        connectOrCreate: [
          { where: { name: 'Array' }, create: { name: 'Array' } },
          { where: { name: 'Hash Table' }, create: { name: 'Hash Table' } },
        ],
      },
      signature: {
        create: {
          functionName: 'twoSum',
          returnType: 'int[]',
          params: [
            { name: 'nums', type: 'int[]' },
            { name: 'target', type: 'int' },
          ],
        },
      },
      examples: {
        create: [
          {
            input: 'nums = [2,7,11,15], target = 9',
            output: '[0,1]',
            explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
            order: 1,
          },
        ],
      },
      starterCodes: {
        create: [
          {
            language: Language.CPP,
            code: `class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        \n    }\n};`,
          },
          {
            language: Language.PYTHON,
            code: `class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        pass`,
          },
        ],
      },
      drivers: {
        create: [
          {
            language: Language.CPP,
            code: `#include <iostream>\n#include <vector>\nusing namespace std;\n\n{{USER_CODE}}\n\nint main() {\n    int n, target;\n    if (!(cin >> n)) return 0;\n    vector<int> nums(n);\n    for(int i=0; i<n; i++) cin >> nums[i];\n    cin >> target;\n    Solution sol;\n    vector<int> res = sol.twoSum(nums, target);\n    cout << "[" << res[0] << "," << res[1] << "]" << endl;\n    return 0;\n}`,
          },
          {
            language: Language.PYTHON,
            code: `import sys\nimport json\n\n{{USER_CODE}}\n\ndef main():\n    lines = sys.stdin.read().split()\n    if not lines: return\n    n = int(lines[0])\n    nums = [int(x) for x in lines[1:n+1]]\n    target = int(lines[n+1])\n    sol = Solution()\n    res = sol.twoSum(nums, target)\n    print(json.dumps(res))\n\nif __name__ == '__main__':\n    main()`,
          },
        ],
      },
      testCases: {
        create: [
          {
            input: [[2, 7, 11, 15], 9],
            expected: [0, 1],
            order: 1,
            isSample: true,
          },
          {
            input: [[3, 2, 4], 6],
            expected: [1, 2],
            order: 2,
            isSample: false,
          },
        ],
      },
    },
  });

  console.log(`✅ Seeded Problem 1: ${twoSum.title}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

### Step 2: Configure `backend/package.json` Seed Command

Add the Prisma seed configuration to your `backend/package.json`:

```json
"prisma": {
  "seed": "npx tsx prisma/seed.ts"
}
```

---

### Step 3: Run Database Seed Command

Run the seed command in your terminal:

```bash
cd backend
npx prisma db seed
```

#### Expected Output:
```text
🌱 Starting database problem seeding on Neon...
✅ Seeded Problem 1: Two Sum
🌱 Database seeding completed successfully!
```

---

## 🔍 Verification Checklist

1. **Verify Tables**: Open Neon Dashboard $\rightarrow$ Tables $\rightarrow$ `Problem`. Check that `Two Sum` and associated drivers, starter codes, signatures, and test cases exist.
2. **Verify API Endpoint**:
   ```bash
   curl https://api.coderival.tech/api/problem/two-sum
   ```
   *(Returns problem details, starter codes, and sample test cases ready for code editor rendering)*.

---

### ✅ Step 1 Complete!
Your Neon PostgreSQL database schema and initial problem bank are live and fully configured.
