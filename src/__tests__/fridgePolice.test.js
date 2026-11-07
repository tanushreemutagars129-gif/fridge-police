import { describe, it, expect } from 'vitest';
import {
  getAvailablePortion,
  createFoodItem,
  requestPortion,
  approveRequest,
  consumePortion,
  expireStaleApprovals,
  markSpoiledAndDiscard,
  reconcilePhysicalReality,
  calculateFinancialLedger,
} from '../domain/fridgePolice.js';

describe('FridgePolice Disaster Scenarios Test Suite', () => {
  // ---------------------------------------------------------------------------
  // SCENARIO 1: The Concurrency Collision
  // ---------------------------------------------------------------------------
  describe('Scenario 1 — Concurrency Collision (25% Pizza Race Condition)', () => {
    it('prevents double allocation when two roommates both request the last 25% slice', () => {
      // Setup: Pizza has exactly 25% left
      const pizza = createFoodItem({
        name: 'Pepperoni Pizza',
        owner: 'Alex',
        totalQuantity: 100,
        cost: 16.00,
      });
      // 75% consumed already
      pizza.consumedQuantity = 75;

      let state = {
        items: [pizza],
        requests: [],
        auditLog: [],
      };

      expect(getAvailablePortion(state.items[0])).toBe(25);

      // Roommate B (Jordan) requests 25%
      const resJordan = requestPortion(state, {
        itemId: pizza.id,
        requestedBy: 'Jordan',
        portion: 25,
      });

      expect(resJordan.success).toBe(true);
      state = resJordan.state;
      expect(getAvailablePortion(state.items[0])).toBe(0); // Available drops to 0%
      expect(state.items[0].reservedQuantity).toBe(25);

      // Roommate C (Casey) tries to request 25% at the same time
      const resCasey = requestPortion(state, {
        itemId: pizza.id,
        requestedBy: 'Casey',
        portion: 25,
      });

      // MUST be rejected!
      expect(resCasey.success).toBe(false);
      expect(resCasey.error).toContain('Concurrency Conflict');
      expect(resCasey.error).toContain('0% remains available');

      // Verify state was not corrupted: only 1 request exists, exactly 25% reserved
      expect(resCasey.state.requests.length).toBe(1);
      expect(resCasey.state.items[0].reservedQuantity).toBe(25);
      expect(resCasey.state.items[0].consumedQuantity).toBe(75);
      // Conservation of matter holds:
      expect(
        resCasey.state.items[0].consumedQuantity +
        resCasey.state.items[0].reservedQuantity +
        getAvailablePortion(resCasey.state.items[0])
      ).toBe(100);
    });
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 2: The Spoilage Ghost
  // ---------------------------------------------------------------------------
  describe('Scenario 2 — The Spoilage Ghost (Stale Approvals & Expired Food)', () => {
    it('expires stale approved requests after TTL, releases held portions, and avoids charging distracted roommate', () => {
      const pasta = createFoodItem({
        name: 'Leftover Pasta',
        owner: 'Alex',
        totalQuantity: 100,
        cost: 12.00,
      });

      let state = {
        items: [pasta],
        requests: [],
        auditLog: [],
      };

      // Jordan requests 50%
      const reqRes = requestPortion(state, {
        itemId: pasta.id,
        requestedBy: 'Jordan',
        portion: 50,
      });
      state = reqRes.state;

      // Alex approves it with a 24h TTL
      const approveRes = approveRequest(state, {
        requestId: reqRes.requestId,
        approver: 'Alex',
        ttlHours: 24,
      });
      state = approveRes.state;

      expect(state.requests[0].status).toBe('APPROVED');
      expect(state.items[0].reservedQuantity).toBe(50);

      // 3 days later: system sweeps for expired approvals
      const threeDaysLater = new Date(Date.now() + 72 * 60 * 60 * 1000);
      const sweepRes = expireStaleApprovals(state, { now: threeDaysLater });
      state = sweepRes.state;

      expect(sweepRes.expiredCount).toBe(1);
      expect(state.requests[0].status).toBe('EXPIRED');
      // Reserved quantity is freed back to item!
      expect(state.items[0].reservedQuantity).toBe(0);

      // The pasta turns green and Alex discards it
      const discardRes = markSpoiledAndDiscard(state, {
        itemId: pasta.id,
        reportedBy: 'Alex',
        reason: 'Turned green after 3 days',
        now: threeDaysLater,
      });
      state = discardRes.state;

      expect(state.items[0].status).toBe('SPOILED');
      expect(state.items[0].spoiledQuantity).toBe(100);

      // Check financial ledger: Jordan must NOT be charged anything!
      const ledger = calculateFinancialLedger(state);
      expect(ledger.roommates.Jordan.consumedTotal).toBe(0);
      expect(ledger.totalSpoilageLoss).toBe(12.00);
    });
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 3: The Identical Item Bug
  // ---------------------------------------------------------------------------
  describe('Scenario 3 — Identical Item Bug (Two Heinz Ketchup Bottles)', () => {
    it('correctly distinguishes two identical items using unique physical tags and tracks separate inventories', () => {
      // Alex buys Heinz Ketchup
      const ketchupAlex = createFoodItem({
        name: 'Heinz Tomato Ketchup',
        owner: 'Alex',
        totalQuantity: 100,
        cost: 4.50,
        physicalTag: '#TAG-KCH-RED',
        tagColor: 'red',
        shelfLocation: 'Fridge Door - Top Shelf',
      });

      // Casey buys identical Heinz Ketchup
      const ketchupCasey = createFoodItem({
        name: 'Heinz Tomato Ketchup',
        owner: 'Casey',
        totalQuantity: 100,
        cost: 4.50,
        physicalTag: '#TAG-KCH-BLU',
        tagColor: 'blue',
        shelfLocation: 'Fridge Door - Middle Shelf',
      });

      let state = {
        items: [ketchupAlex, ketchupCasey],
        requests: [],
        auditLog: [],
      };

      // Both have identical name
      expect(ketchupAlex.name).toBe(ketchupCasey.name);
      // But distinct physical tags & owners
      expect(ketchupAlex.physicalTag).not.toBe(ketchupCasey.physicalTag);
      expect(ketchupAlex.owner).not.toBe(ketchupCasey.owner);

      // Taylor consumes 20% from Alex's bottle (identified by #TAG-KCH-RED)
      const reqRes = requestPortion(state, {
        itemId: ketchupAlex.id,
        requestedBy: 'Taylor',
        portion: 20,
      });
      state = reqRes.state;

      const appRes = approveRequest(state, {
        requestId: reqRes.requestId,
        approver: 'Alex',
      });
      state = appRes.state;

      const consumeRes = consumePortion(state, {
        requestId: reqRes.requestId,
        consumer: 'Taylor',
      });
      state = consumeRes.state;

      // Alex's bottle level must be 80% available
      const updatedAlexBottle = state.items.find(i => i.id === ketchupAlex.id);
      expect(getAvailablePortion(updatedAlexBottle)).toBe(80);
      expect(updatedAlexBottle.consumedQuantity).toBe(20);

      // Casey's bottle must remain completely untouched at 100% available!
      const updatedCaseyBottle = state.items.find(i => i.id === ketchupCasey.id);
      expect(getAvailablePortion(updatedCaseyBottle)).toBe(100);
      expect(updatedCaseyBottle.consumedQuantity).toBe(0);

      // Financials: Alex's ketchup was consumed by Taylor ($0.90), Casey owes/is owed nothing for Taylor's usage
      const ledger = calculateFinancialLedger(state);
      expect(ledger.roommates.Taylor.consumedTotal).toBe(0.90);
    });
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 4: The Phantom Eater
  // ---------------------------------------------------------------------------
  describe('Scenario 4 — The Phantom Eater (Reality Desync Reconciliation)', () => {
    it('reconciles physical reality when someone drank food offline, records phantom loss, and cancels impossible requests', () => {
      const orangeJuice = createFoodItem({
        name: 'Tropicana Orange Juice',
        owner: 'Taylor',
        totalQuantity: 100,
        cost: 4.00,
        physicalTag: '#TAG-OJ-404',
      });

      let state = {
        items: [orangeJuice],
        requests: [],
        auditLog: [],
      };

      // Jordan places a pending request for 25% of OJ
      const reqRes = requestPortion(state, {
        itemId: orangeJuice.id,
        requestedBy: 'Jordan',
        portion: 25,
      });
      state = reqRes.state;

      // Casey opens fridge and finds OJ completely empty (0% physical remaining)
      const reconcileRes = reconcilePhysicalReality(state, {
        itemId: orangeJuice.id,
        actualRemainingPortion: 0,
        reportedBy: 'Casey',
        reason: 'Carton was empty in fridge, someone drank it at 2am',
      });

      expect(reconcileRes.success).toBe(true);
      expect(reconcileRes.missingAmount).toBe(100); // Entire 100% carton is physically gone
      state = reconcileRes.state;

      const updatedOJ = state.items.find(i => i.id === orangeJuice.id);
      expect(getAvailablePortion(updatedOJ)).toBe(0);
      expect(updatedOJ.status).toBe('EMPTY');

      // The pending request that Jordan had must be automatically CANCELLED because the physical juice is gone!
      expect(state.requests[0].status).toBe('CANCELLED');

      // Financial ledger records phantom loss
      const ledger = calculateFinancialLedger(state);
      expect(ledger.totalPhantomLoss).toBeGreaterThan(0);
      expect(ledger.phantomIncidents.length).toBe(1);
      expect(ledger.phantomIncidents[0].tag).toBe('#TAG-OJ-404');
    });
  });
});
