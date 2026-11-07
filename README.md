# 🧊 FridgePolice — Prototype

> **Four Roommates. One Fridge. Zero Trust.**  
> A disaster-proof food tracking prototype built to survive real roommate behavior.

[![Vitest Tests](https://img.shields.io/badge/tests-4%2F4%20passed-brightgreen.svg)]()
[![React 19](https://img.shields.io/badge/react-19-blue.svg)]()
[![Vite](https://img.shields.io/badge/vite-8.3-purple.svg)]()

---

## 🌟 Overview

FridgePolice brings order to shared living by logging food items, managing portion requests, requiring owner approval, and splitting costs fairly. 

Unlike naive prototypes that collapse the moment reality drifts, FridgePolice is specifically engineered to handle four notorious failure modes:
1. **The Concurrency Collision** (Race conditions over the last portion)
2. **The Spoilage Ghost** (Stale approvals and food rot)
3. **The Identical Item Bug** (Ambiguity between duplicate store-bought items)
4. **The Phantom Eater** (Reality desync when items are consumed offline)

---

## 🚀 Quickstart

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation & Run
```bash
# 1. Install dependencies
npm install

# 2. Run automated tests (100% pass)
npm test

# 3. Start local development server
npm run dev
```

Visit the app in your browser at `http://localhost:5173`.

---

## 🧪 Testing the 4 Disaster Scenarios

FridgePolice includes an interactive **Disaster Scenario Simulation Lab** right on top of the UI for quick review:

### 1. 🍕 Scenario 1: The Concurrency Collision
- **Problem**: Jordan & Casey both request the last 25% slice of pizza at 11:00 PM.
- **How to Test**:
  - In the Disaster Lab, click **"Simulate 11 PM Collision"**.
  - **Result**: Jordan's request reserves the remaining 25%. Casey's concurrent request is atomically blocked with an explicit `Concurrency Conflict` error. The pizza is never over-allocated.

### 2. 🍝 Scenario 2: The Spoilage Ghost
- **Problem**: Alex approved 50% pasta for Jordan 3 days ago. Jordan never ate it and it turned green.
- **How to Test**:
  - In the Disaster Lab, click **"Fast-Forward 3 Days (Expire TTL)"**.
  - **Result**: Jordan's stale approval transitions to `EXPIRED` and the held portion is freed.
  - Click **"Mark Rotten Food Spoiled & Discard"**.
  - Switch to the **Cost Split Ledger** tab: notice that Jordan was **charged $0.00**, while the wasted pasta is recorded in the Spoilage Loss ledger.

### 3. 🥫 Scenario 3: The Identical Item Bug
- **Problem**: Alex and Casey both bought identical Heinz Ketchup bottles sitting side-by-side in the fridge door.
- **How to Test**:
  - In the Disaster Lab, click **"Consume 20% from Alex's Bottle"**.
  - **Result**: Taylor consumes 20% from Alex's bottle (`🔴 #TAG-KCH-RED` on Door Top). Alex's bottle drops to 50% available. Casey's bottle (`🔵 #TAG-KCH-BLU` on Door Middle) stays untouched at 100%!

### 4. 🧃 Scenario 4: The Phantom Eater
- **Problem**: App says Orange Juice is 100% full, but Casey opens the fridge and finds an empty carton.
- **How to Test**:
  - In the Disaster Lab, click **"Reconcile Reality (Empty Carton)"**.
  - **Result**: System reconciles digital state down to 0% immediately, cancels any impossible pending requests, and records $4.00 under **Phantom Eater Losses** in the Cost Split Ledger.

---

## 📑 Architecture & Changes
Detailed explanations of engineering concepts, mathematical invariants (Conservation of Matter), and design trade-offs are documented in [`Changes.md`](./Changes.md).

---

## 📹 Video Demo Script (For Submission)
When recording the 3-5 minute demo video:
1. **Introduction (30s)**: Introduce yourself, explain what FridgePolice is and why naive apps fail when real humans interact with shared fridges.
2. **Scenario 1 (45s)**: Show the 25% pizza. Click the collision button. Explain how atomic reservation prevents double allocation.
3. **Scenario 2 (45s)**: Show the pasta with Jordan's 3-day-old approval. Click expire and discard. Show the ledger proving Jordan wasn't charged.
4. **Scenario 3 (45s)**: Show the two Heinz Ketchup cards with distinct physical tags (`#TAG-KCH-RED` vs `#TAG-KCH-BLU`). Consume from Alex's bottle and show Casey's bottle is unaffected.
5. **Scenario 4 (45s)**: Show the Orange Juice at 100%. Click reality reconciliation. Show digital state sync, cancellation of invalid requests, and phantom loss logging.
6. **Summary & Tests (30s)**: Run `npm test` in the terminal to show all unit tests passing.
