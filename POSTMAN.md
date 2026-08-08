# CodeRival Backend API Documentation & Postman Guide

**Base URL:** `http://localhost:5000` (or your configured `PORT`)  
**Authentication:** HTTP-Only Cookie (`token=<jwt>`) set automatically upon signin/register.

---

## Table of Contents
1. [Auth Endpoints](#1-auth-endpoints)
2. [User Endpoints](#2-user-endpoints)
3. [Problem & Execution Endpoints](#3-problem--execution-endpoints)
4. [Sample Code Submissions for Two Sum](#4-sample-code-submissions-for-two-sum)

---

## 1. Auth Endpoints (`/api/auth`)

### 1.1 Register User
- **Method:** `POST`
- **URL:** `http://localhost:5000/api/auth/register`
- **Headers:** `Content-Type: application/json`
- **Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "username": "janedoe",
  "password": "password123",
  "confirmPassword": "password123"
}
```

---

### 1.2 Sign In
- **Method:** `POST`
- **URL:** `http://localhost:5000/api/auth/signin`
- **Headers:** `Content-Type: application/json`
- **Body:**
```json
{
  "id": "janedoe",
  "password": "password123"
}
```
*(Note: `id` can be either username or email. Response sets `token` HTTP-only cookie).*

---

### 1.3 Request Email Verification OTP
- **Method:** `POST`
- **URL:** `http://localhost:5000/api/auth/verify-email`
- **Headers:** `Content-Type: application/json`
- **Body:**
```json
{
  "email": "jane@example.com"
}
```

---

### 1.4 Check Email Verification OTP
- **Method:** `POST`
- **URL:** `http://localhost:5000/api/auth/check-verify-email-otp`
- **Headers:** `Content-Type: application/json`
- **Body:**
```json
{
  "email": "jane@example.com",
  "otp": "123456"
}
```

---

### 1.5 Request Password Reset OTP
- **Method:** `POST`
- **URL:** `http://localhost:5000/api/auth/request-password-reset`
- **Headers:** `Content-Type: application/json`
- **Body:**
```json
{
  "email": "jane@example.com"
}
```

---

### 1.6 Verify Password Reset OTP
- **Method:** `POST`
- **URL:** `http://localhost:5000/api/auth/verify-password-reset-otp`
- **Headers:** `Content-Type: application/json`
- **Body:**
```json
{
  "email": "jane@example.com",
  "otp": "123456"
}
```

---

### 1.7 Reset Password
- **Method:** `POST`
- **URL:** `http://localhost:5000/api/auth/reset-password`
- **Headers:** `Content-Type: application/json`
- **Body:**
```json
{
  "email": "jane@example.com",
  "token": "reset-token-received-from-verify-otp",
  "newPassword": "newpassword123"
}
```

---

## 2. User Endpoints (`/api/user`)

### 2.1 Check Username Availability
- **Method:** `GET`
- **URL:** `http://localhost:5000/api/user/check_username?username=janedoe`

---

### 2.2 Get Current User (`/me`)
- **Method:** `GET`
- **URL:** `http://localhost:5000/api/user/me`
- **Requires Auth:** Yes (Cookie)

---

### 2.3 Get User Profile by ID
- **Method:** `GET`
- **URL:** `http://localhost:5000/api/user/profile/:userId`
- **Requires Auth:** Yes

---

### 2.4 Update Profile
- **Method:** `PATCH`
- **URL:** `http://localhost:5000/api/user/update_profile`
- **Headers:** `Content-Type: application/json`
- **Requires Auth:** Yes
- **Body:**
```json
{
  "name": "Jane Smith",
  "username": "janesmith"
}
```

---

## 3. Problem & Execution Endpoints (`/api/problem`)

### 3.1 Get Single Problem by Slug
- **Method:** `GET`
- **URL:** `http://localhost:5000/api/problem/get/two-sum`
- **Requires Auth:** Yes

---

### 3.2 Get Problems by Topic
- **Method:** `GET`
- **URL:** `http://localhost:5000/api/problem/get/by-topic/Arrays`
- **Requires Auth:** Yes

---

### 3.3 Get Problems by Difficulty
- **Method:** `GET`
- **URL:** `http://localhost:5000/api/problem/get/by-difficulty/easy`
- **Requires Auth:** Yes
- **Allowed options:** `easy`, `medium`, `hard`

---

### 3.4 Get All Problems (Paginated)
- **Method:** `GET`
- **URL:** `http://localhost:5000/api/problem/get/get-all/1/10`
- **Requires Auth:** Yes

---

### 3.5 Run Code (Sample Test Cases)
- **Method:** `POST`
- **URL:** `http://localhost:5000/api/problem/run`
- **Headers:** `Content-Type: application/json`
- **Requires Auth:** Yes
- **Body Example (C++):**
```json
{
  "problemId": "two-sum",
  "language": "CPP",
  "sourceCode": "#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        unordered_map<int, int> mp;\n        for (int i = 0; i < nums.size(); i++) {\n            int diff = target - nums[i];\n            if (mp.count(diff)) return {mp[diff], i};\n            mp[nums[i]] = i;\n        }\n        return {};\n    }\n};"
}
```

---

### 3.6 Submit Code (Official Submission)
- **Method:** `POST`
- **URL:** `http://localhost:5000/api/problem/submit`
- **Headers:** `Content-Type: application/json`
- **Requires Auth:** Yes
- **Body Example (Python):**
```json
{
  "problemId": "two-sum",
  "language": "PYTHON",
  "sourceCode": "from typing import List\n\nclass Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        seen = {}\n        for i, num in enumerate(nums):\n            diff = target - num\n            if diff in seen:\n                return [seen[diff], i]\n            seen[num] = i\n        return []"
}
```

---

## 4. Sample Code Submissions for Two Sum

### Python 3
```json
{
  "problemId": "two-sum",
  "language": "PYTHON",
  "sourceCode": "from typing import List\n\nclass Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        seen = {}\n        for i, num in enumerate(nums):\n            diff = target - num\n            if diff in seen:\n                return [seen[diff], i]\n            seen[num] = i\n        return []"
}
```

### C++
```json
{
  "problemId": "two-sum",
  "language": "CPP",
  "sourceCode": "#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        unordered_map<int, int> mp;\n        for (int i = 0; i < nums.size(); i++) {\n            int diff = target - nums[i];\n            if (mp.count(diff)) return {mp[diff], i};\n            mp[nums[i]] = i;\n        }\n        return {};\n    }\n};"
}
```

### Java
```json
{
  "problemId": "two-sum",
  "language": "JAVA",
  "sourceCode": "import java.util.*;\n\nclass Solution {\n    public int[] twoSum(int[] nums, int target) {\n        Map<Integer, Integer> map = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            int diff = target - nums[i];\n            if (map.containsKey(diff)) {\n                return new int[] { map.get(diff), i };\n            }\n            map.put(nums[i], i);\n        }\n        return new int[0];\n    }\n}"
}
```
