# FridgePolice — System Changes & Engineering Decisions

## Executive Overview
**FridgePolice** is a roommate food inventory and fair cost-splitting application designed to survive the messy reality of shared apartment living. Naive food tracking systems assume an idyllic "happy path": users log food in advance, request portions sequentially, consume items on time, and accurately mark everything in software.

In the real world, human behavior breaks this model:
- Roommates request food simultaneously at 11:00 PM (**Concurrency Collision**).
- Roommates forget about approved food until it spoils (**Stale State / Spoilage Ghost**).
- Identical store-bought products sit side-by-side with no digital distinction (**Identity Ambiguity**).
- Roommates drink beverages offline at 2:00 AM without opening the app (**Reality Desync / Phantom Eater**).

This document details the architectural principles, domain modeling, state transition rules, and implementation decisions that ensure FridgePolice remains mathematically sound, fair, and resilient against real-world chaos.

---

## 1. Core Architecture & Mathematical Guarantees

### Conservation of Matter
To prevent phantom food creation or accidental inventory evaporation, FridgePolice enforces the **Conservation of Matter Law** on every food item at all times:

$$\text{Total Portions} = \text{Consumed} + \text{Reserved (Locked)} + \text{Spoiled} + \text{Phantom (Missing)} + \text{Available}$$

- **Available**: Portion currently unencumbered and safe to request:
  $$\text{Available} = \max(0, \text{Total} - (\text{Consumed} + \text{Reserved} + \text{Spoiled} + \text{Phantom}))$$
- **Reserved**: Portion locked by pending or approved requests that have not yet been consumed.
- **Consumed**: Portion physically eaten and billed to the specific consumer.
- **Spoiled**: Portion discarded due to rot or expiration, written off as waste.
- **Phantom**: Portion missing from the physical fridge due to unrecorded consumption.

At no point can the sum of active claims and historical losses exceed 100% of the physical item.

---

## 2. Handling the Four Roommate Disaster Scenarios

### Scenario 1: The Concurrency Collision
* **The Chaos**: Exactly 25% of a pizza remains. At 11:00 PM, Jordan and Casey simultaneously open the app and both tap "Request last slice" (25%). A naive system processes both, resulting in 50% promised out of 25% physical pizza.
* **Engineering Concept**: *Concurrency Conflict & Race Conditions*.
* **Our Solution**:
  1. **Atomic Capacity Reservation**: When a roommate submits a portion request, the system checks $\text{Requested} \le \text{Available}$.
  2. If sufficient portion exists, the request places an atomic reservation lock on that portion (`reservedQuantity += portion`).
  3. The moment Jordan's request completes, available capacity immediately drops from $25\% \to 0\%$.
  4. When Casey's concurrent request executes against the state, the check fails:
     $$\text{Available } (0\%) < \text{Requested } (25\%)$$
  5. The request is rejected immediately with an explicit `CONCURRENCY_BLOCKED` event:
     `"[Concurrency Conflict] Only 0% remains available for Pepperoni Pizza, but Casey requested 25%. Request blocked to prevent double-allocation!"`
  6. The rejection is logged to the immutable safety audit log, and an error banner alerts the user.

---

### Scenario 2: The Spoilage Ghost
* **The Chaos**: Jordan requests 50% of Alex's leftover pasta. Alex approves it. Jordan gets distracted and never eats it. Three days later, the pasta turns green in the tupperware and is thrown out. In a naive app, 50% remains "approved and pending consumption" indefinitely, corrupting the food log and financial calculations.
* **Engineering Concept**: *Stale State & Zombie Locks*.
* **Our Solution**:
  1. **Time-To-Live (TTL) on Approvals**: Every approval is issued with an expiration deadline (`expiresAt`, default 24 hours).
  2. **Automated Stale Sweep (`expireStaleApprovals`)**: If the current timestamp exceeds `expiresAt` and the food has not been consumed, the approval transitions from `APPROVED` to `EXPIRED`.
  3. **Release of Held Inventory**: The reservation is released (`reservedQuantity -= portion`), restoring the digital record to reflect true status.
  4. **Fair Financial Ledger Protection**: Jordan is **not billed** for food they never consumed. The unconsumed food is never converted to a debt on Jordan's balance.
  5. **Disposal & Waste Logging (`markSpoiledAndDiscard`)**: When spoiled food is physically discarded, roommates flag it as `SPOILED`. Any remaining portion is logged under `spoiledQuantity`, and the cost is attributed to a transparent Waste Ledger rather than an innocent roommate.

---

### Scenario 3: The Identical Item Bug
* **The Chaos**: Alex and Casey both buy Heinz Tomato Ketchup on the same day. Two identical bottles sit side-by-side in the fridge door with identical labels. A roommate uses ketchup and logs it. Without identity tracking, the system cannot determine which bottle was used, corrupting both roommates' inventory and expenses.
* **Engineering Concept**: *Identity Ambiguity & Entity Disambiguation*.
* **Our Solution**:
  1. **Mandatory Physical Identifiers**: Every item registered in FridgePolice requires a distinct physical identifier:
     - Unique System ID: `item-ketchup-alex` vs `item-ketchup-casey`
     - Physical Sticker Tag: `🔴 #TAG-KCH-RED` vs `🔵 #TAG-KCH-BLU`
     - Physical Shelf Location: `Fridge Door - Top Rack` vs `Fridge Door - Middle Rack`
  2. **Explicit User Binding**: When requesting or logging consumption, the user must select the specific physical bottle (matching the colored sticker they touched in the fridge).
  3. **Isolated State Mutation**: When Taylor consumes 20% from Alex's bottle (`#TAG-KCH-RED`), Alex's bottle decreases to 80%, while Casey's bottle (`#TAG-KCH-BLU`) remains strictly at 100% untouched.

---

### Scenario 4: The Phantom Eater
* **The Chaos**: The app reports a carton of orange juice is 100% full. Casey opens the fridge at 2:00 AM and finds an empty carton. Someone drank it offline without logging it. The digital state has drifted completely away from physical reality.
* **Engineering Concept**: *Reality Desync & Inventory Drift*.
* **Our Solution**:
  1. **Reality Audit & Reconciliation (`reconcilePhysicalReality`)**: Any roommate who observes a physical discrepancy can initiate an audit.
  2. **Ground Truth Override**: The user inputs the actual physical percentage observed (e.g., $0\%$).
  3. **Discrepancy Calculation & Ledgering**:
     $$\text{Missing Portion} = \text{Expected Digital Physical} - \text{Observed Physical}$$
     The missing portion is recorded under `phantomQuantity` and attributed to a dedicated **Phantom Eater Loss Ledger** with reporter timestamp and reason.
  4. **Automatic Cascade Cancellation**: Any existing pending or approved requests that can no longer be physically satisfied by the missing food are automatically `CANCELLED` with a clear explanation note.
  5. **State Convergence**: The digital record immediately reflects physical reality, eliminating phantom allocations.

---

## 3. Engineering Decisions & Assumptions

| Decision | Rationale |
| :--- | :--- |
| **Pure Functional Domain Logic** | Domain rules in `src/domain/fridgePolice.js` are separated from React UI, enabling 100% automated test coverage via Vitest without DOM dependencies. |
| **Immediate Request-Level Reservation** | Reserving portions at the moment of request rather than waiting for owner approval prevents race conditions between competing requestors during off-hours. |
| **Physical Sticker / Tag IDs** | Digital barcodes or QR codes are cumbersome for late-night roommate snacks; color-coded physical tags (`#TAG-XXX-NNN`) bridge the gap between physical fridge door racks and software UI. |
| **Transparent Phantom Ledger** | Rather than silently guessing who drank the orange juice, unallocated losses are pooled into a transparent flat audit log so roommates can address recurring phantom eating at apartment meetings. |
| **Local Storage Persistence + Demo Reset** | State persists across browser reloads for realistic evaluation, with a one-click "Reset Demo" button to restore canonical scenario test conditions. |

---

## 4. Verification & Testing

The system includes automated unit and integration tests located in `src/__tests__/fridgePolice.test.js`:
- `Scenario 1`: Proves simultaneous requests for the last 25% slice atomically permit the first and reject the second.
- `Scenario 2`: Verifies TTL expiration cleans up stale approvals and prevents billing distracted roommates.
- `Scenario 3`: Verifies separate physical tags isolate identical ketchup bottles from cross-contamination.
- `Scenario 4`: Confirms reality desync reconciliation updates available inventory to 0% and cancels impossible requests.

All test suites execute and pass cleanly via `npm test`.
