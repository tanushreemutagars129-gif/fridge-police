// FridgePolice Core Domain Logic
// Handles concurrency, stale state expiration, physical item identity, and reality reconciliation.

export const ROOMMATES = ['Alex', 'Jordan', 'Casey', 'Taylor'];

export const DEFAULT_APPROVAL_TTL_HOURS = 24;

/**
 * Calculates current available portion for an item.
 * Guarantees Conservation of Matter:
 * total = consumed + reserved + spoiled + phantom + available
 */
export function getAvailablePortion(item) {
  const consumed = item.consumedQuantity || 0;
  const reserved = item.reservedQuantity || 0;
  const spoiled = item.spoiledQuantity || 0;
  const phantom = item.phantomQuantity || 0;
  const total = item.totalQuantity || 100;
  return Math.max(0, total - (consumed + reserved + spoiled + phantom));
}

/**
 * Helper to create a new Food Item with a mandatory Physical Identifier
 * (Scenario 3: Disambiguating identical items)
 */
export function createFoodItem({
  name,
  owner,
  totalQuantity = 100,
  cost = 0,
  tagColor = 'red',
  shelfLocation = 'Top Shelf',
  physicalTag = null,
}) {
  const generatedTag = physicalTag || `TAG-${name.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
  const id = `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

  return {
    id,
    name,
    owner,
    totalQuantity: Number(totalQuantity),
    consumedQuantity: 0,
    reservedQuantity: 0,
    spoiledQuantity: 0,
    phantomQuantity: 0,
    cost: Number(cost),
    physicalTag: generatedTag,
    tagColor,
    shelfLocation,
    status: 'ACTIVE', // 'ACTIVE' | 'SPOILED' | 'EMPTY'
    version: 1, // Optimistic concurrency version
    createdAt: new Date().toISOString(),
  };
}

/**
 * SCENARIO 1: Request a portion of an item.
 * Prevents over-allocation and concurrency collision.
 */
export function requestPortion(state, { itemId, requestedBy, portion, now = new Date() }) {
  const item = state.items.find(i => i.id === itemId);
  if (!item) {
    return {
      success: false,
      error: `Item with ID ${itemId} not found.`,
      state,
    };
  }

  if (item.status !== 'ACTIVE') {
    return {
      success: false,
      error: `Cannot request from this item: Status is ${item.status}.`,
      state,
    };
  }

  const requestedAmount = Number(portion);
  if (requestedAmount <= 0) {
    return {
      success: false,
      error: 'Requested portion must be greater than 0%.',
      state,
    };
  }

  const available = getAvailablePortion(item);

  // CONCURRENCY & CAPACITY CHECK:
  // If requested amount exceeds currently available, reject atomically!
  if (requestedAmount > available) {
    const errorMsg = `[Concurrency Conflict] Only ${available}% remains available for "${item.name}" (${item.physicalTag}), but ${requestedBy} requested ${requestedAmount}%. Request blocked to prevent double-allocation!`;
    const auditEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: now.toISOString(),
      type: 'CONCURRENCY_BLOCKED',
      message: errorMsg,
      actor: requestedBy,
      severity: 'error',
      metadata: { itemId, requestedAmount, available, physicalTag: item.physicalTag },
    };

    return {
      success: false,
      error: errorMsg,
      state: {
        ...state,
        auditLog: [auditEntry, ...state.auditLog],
      },
    };
  }

  // Atomically hold/reserve the portion
  const updatedItem = {
    ...item,
    reservedQuantity: item.reservedQuantity + requestedAmount,
    version: item.version + 1,
  };

  const newRequest = {
    id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    itemId: item.id,
    itemName: item.name,
    physicalTag: item.physicalTag,
    owner: item.owner,
    requestedBy,
    portion: requestedAmount,
    status: 'PENDING_APPROVAL', // 'PENDING_APPROVAL' | 'APPROVED' | 'CONSUMED' | 'EXPIRED' | 'REJECTED'
    requestedAt: now.toISOString(),
    approvedAt: null,
    expiresAt: null,
    consumedAt: null,
  };

  const auditEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    timestamp: now.toISOString(),
    type: 'PORTION_REQUESTED',
    message: `${requestedBy} requested ${requestedAmount}% of "${item.name}" (${item.physicalTag}). ${requestedAmount}% reserved. Remaining available: ${getAvailablePortion(updatedItem)}%.`,
    actor: requestedBy,
    severity: 'info',
    metadata: { itemId: item.id, requestId: newRequest.id, portion: requestedAmount },
  };

  return {
    success: true,
    requestId: newRequest.id,
    state: {
      ...state,
      items: state.items.map(i => (i.id === item.id ? updatedItem : i)),
      requests: [newRequest, ...state.requests],
      auditLog: [auditEntry, ...state.auditLog],
    },
  };
}

/**
 * Owner approves a portion request.
 * Sets the approval expiration TTL (Scenario 2: Spoilage Ghost prevention).
 */
export function approveRequest(state, { requestId, approver, ttlHours = DEFAULT_APPROVAL_TTL_HOURS, now = new Date() }) {
  const request = state.requests.find(r => r.id === requestId);
  if (!request) {
    return { success: false, error: 'Request not found.', state };
  }

  if (request.status !== 'PENDING_APPROVAL') {
    return { success: false, error: `Cannot approve: Request is already ${request.status}.`, state };
  }

  const item = state.items.find(i => i.id === request.itemId);
  if (!item) {
    return { success: false, error: 'Associated item not found.', state };
  }

  // Calculate TTL
  const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

  const updatedRequest = {
    ...request,
    status: 'APPROVED',
    approvedBy: approver,
    approvedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  const auditEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    timestamp: now.toISOString(),
    type: 'PORTION_APPROVED',
    message: `${approver} approved ${request.requestedBy}'s request for ${request.portion}% of "${item.name}" (${item.physicalTag}). Must be consumed before ${expiresAt.toLocaleTimeString()} (TTL: ${ttlHours}h).`,
    actor: approver,
    severity: 'success',
  };

  return {
    success: true,
    state: {
      ...state,
      requests: state.requests.map(r => (r.id === requestId ? updatedRequest : r)),
      auditLog: [auditEntry, ...state.auditLog],
    },
  };
}

/**
 * Roommate confirms consuming the approved portion.
 * Transitions reserved quantity to consumed quantity, locking in cost split.
 */
export function consumePortion(state, { requestId, consumer, now = new Date() }) {
  const request = state.requests.find(r => r.id === requestId);
  if (!request) {
    return { success: false, error: 'Request not found.', state };
  }

  if (request.status !== 'APPROVED') {
    return { success: false, error: `Cannot consume: Request status is ${request.status}. Must be APPROVED first.`, state };
  }

  const item = state.items.find(i => i.id === request.itemId);
  if (!item) {
    return { success: false, error: 'Item not found.', state };
  }

  // Check if expired
  if (request.expiresAt && new Date(request.expiresAt) < now) {
    return {
      success: false,
      error: `Approval has expired on ${new Date(request.expiresAt).toLocaleTimeString()}. Portion has been released.`,
      state,
    };
  }

  // Transfer reserved portion to consumed
  const updatedItem = {
    ...item,
    reservedQuantity: Math.max(0, item.reservedQuantity - request.portion),
    consumedQuantity: item.consumedQuantity + request.portion,
    version: item.version + 1,
    status: (item.consumedQuantity + request.portion >= item.totalQuantity) ? 'EMPTY' : item.status,
  };

  const updatedRequest = {
    ...request,
    status: 'CONSUMED',
    consumedBy: consumer,
    consumedAt: now.toISOString(),
  };

  const portionCost = ((request.portion / item.totalQuantity) * item.cost).toFixed(2);

  const auditEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    timestamp: now.toISOString(),
    type: 'PORTION_CONSUMED',
    message: `${consumer} consumed ${request.portion}% of "${item.name}" (${item.physicalTag}). Cost recorded: $${portionCost}.`,
    actor: consumer,
    severity: 'success',
  };

  return {
    success: true,
    state: {
      ...state,
      items: state.items.map(i => (i.id === item.id ? updatedItem : i)),
      requests: state.requests.map(r => (r.id === requestId ? updatedRequest : r)),
      auditLog: [auditEntry, ...state.auditLog],
    },
  };
}

/**
 * SCENARIO 2: Sweeps and expires stale approvals.
 * Frees held portions so they don't haunt the system indefinitely.
 * Roommate who never ate it is NOT billed.
 */
export function expireStaleApprovals(state, { now = new Date() }) {
  const staleRequests = state.requests.filter(
    r => r.status === 'APPROVED' && r.expiresAt && new Date(r.expiresAt) <= now
  );

  if (staleRequests.length === 0) {
    return { expiredCount: 0, state };
  }

  let updatedItems = [...state.items];
  const newAuditEntries = [];

  const updatedRequests = state.requests.map(req => {
    if (req.status === 'APPROVED' && req.expiresAt && new Date(req.expiresAt) <= now) {
      // Release reserved portion from the item
      updatedItems = updatedItems.map(item => {
        if (item.id === req.itemId) {
          return {
            ...item,
            reservedQuantity: Math.max(0, item.reservedQuantity - req.portion),
            version: item.version + 1,
          };
        }
        return item;
      });

      newAuditEntries.push({
        id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        timestamp: now.toISOString(),
        type: 'APPROVAL_EXPIRED',
        message: `[Stale State Prevented] Approval for ${req.requestedBy} (${req.portion}% of "${req.itemName}") expired after TTL. Portion reservation released. ${req.requestedBy} was NOT charged.`,
        actor: 'System',
        severity: 'warning',
        metadata: { requestId: req.id, itemId: req.itemId, portion: req.portion },
      });

      return {
        ...req,
        status: 'EXPIRED',
      };
    }
    return req;
  });

  return {
    expiredCount: staleRequests.length,
    state: {
      ...state,
      items: updatedItems,
      requests: updatedRequests,
      auditLog: [...newAuditEntries, ...state.auditLog],
    },
  };
}

/**
 * SCENARIO 2 (Disposal): Roommate marks spoiled food as discarded.
 * Moves all remaining unconsumed portions to spoiled waste, clears pending reservations.
 */
export function markSpoiledAndDiscard(state, { itemId, reportedBy, reason = 'Turned green / rotten', now = new Date() }) {
  const item = state.items.find(i => i.id === itemId);
  if (!item) {
    return { success: false, error: 'Item not found.', state };
  }

  // Calculate unconsumed portion remaining
  const remainingPortion = Math.max(0, item.totalQuantity - item.consumedQuantity - item.phantomQuantity);

  // Cancel any active/pending requests for this item
  const updatedRequests = state.requests.map(req => {
    if (req.itemId === itemId && (req.status === 'PENDING_APPROVAL' || req.status === 'APPROVED')) {
      return {
        ...req,
        status: 'CANCELLED',
      };
    }
    return req;
  });

  const updatedItem = {
    ...item,
    reservedQuantity: 0,
    spoiledQuantity: remainingPortion,
    status: 'SPOILED',
    version: item.version + 1,
  };

  const wastedCost = ((remainingPortion / item.totalQuantity) * item.cost).toFixed(2);

  const auditEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    timestamp: now.toISOString(),
    type: 'SPOILAGE_DISCARDED',
    message: `${reportedBy} marked "${item.name}" (${item.physicalTag}) as SPOILED & DISCARDED (${reason}). ${remainingPortion}% ($${wastedCost}) written off as waste.`,
    actor: reportedBy,
    severity: 'warning',
    metadata: { itemId, remainingPortion, wastedCost },
  };

  return {
    success: true,
    state: {
      ...state,
      items: state.items.map(i => (i.id === itemId ? updatedItem : i)),
      requests: updatedRequests,
      auditLog: [auditEntry, ...state.auditLog],
    },
  };
}

/**
 * SCENARIO 4: The Phantom Eater (Reality Desync Reconciler).
 * Corrects digital state to match physical truth observed in fridge.
 * Any missing portion is catalogued as unaccounted phantom loss.
 */
export function reconcilePhysicalReality(state, {
  itemId,
  actualRemainingPortion,
  reportedBy,
  reason = 'Discovered missing / empty in physical fridge',
  now = new Date(),
}) {
  const item = state.items.find(i => i.id === itemId);
  if (!item) {
    return { success: false, error: 'Item not found.', state };
  }

  const physicalActual = Math.max(0, Math.min(item.totalQuantity, Number(actualRemainingPortion)));
  
  // Total accounted portion that should physically exist according to digital state
  const digitalExpectedPhysical = Math.max(
    0,
    item.totalQuantity - (item.consumedQuantity || 0) - (item.spoiledQuantity || 0) - (item.phantomQuantity || 0)
  );

  if (physicalActual > digitalExpectedPhysical) {
    return {
      success: false,
      error: `Physical observation (${physicalActual}%) cannot exceed remaining physical capacity (${digitalExpectedPhysical}%).`,
      state,
    };
  }

  // The phantom gap: food that digital system thought existed, but is physically gone
  const missingAmount = digitalExpectedPhysical - physicalActual;

  if (missingAmount === 0) {
    return {
      success: true,
      missingAmount: 0,
      phantomCost: '0.00',
      message: 'Physical inventory matches digital record. No desync detected.',
      state,
    };
  }

  // Cancel any pending or approved requests that can no longer be satisfied
  let remainingPhysical = physicalActual;
  const updatedRequests = state.requests.map(req => {
    if (req.itemId === itemId && (req.status === 'PENDING_APPROVAL' || req.status === 'APPROVED')) {
      if (req.portion > remainingPhysical) {
        return {
          ...req,
          status: 'CANCELLED',
          cancellationReason: `Cancelled: Item was reported missing during reality reconciliation by ${reportedBy}.`,
        };
      } else {
        remainingPhysical -= req.portion;
      }
    }
    return req;
  });

  // Calculate new reserved total from still-valid requests
  const remainingReserved = updatedRequests
    .filter(r => r.itemId === itemId && (r.status === 'PENDING_APPROVAL' || r.status === 'APPROVED'))
    .reduce((sum, r) => sum + r.portion, 0);

  const updatedItem = {
    ...item,
    reservedQuantity: remainingReserved,
    phantomQuantity: (item.phantomQuantity || 0) + missingAmount,
    status: physicalActual === 0 ? 'EMPTY' : item.status,
    version: item.version + 1,
  };

  const phantomCost = ((missingAmount / item.totalQuantity) * item.cost).toFixed(2);

  const auditEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    timestamp: now.toISOString(),
    type: 'REALITY_RECONCILED',
    message: `[Reality Desync Fixed] ${reportedBy} audited "${item.name}" (${item.physicalTag}): Found ${physicalActual}% physically present (was recorded as ${digitalExpectedPhysical}%). ${missingAmount}% ($${phantomCost}) recorded as Phantom Eater loss. Reason: ${reason}.`,
    actor: reportedBy,
    severity: 'error',
    metadata: { itemId, missingAmount, phantomCost, reportedBy },
  };

  return {
    success: true,
    missingAmount,
    phantomCost,
    state: {
      ...state,
      items: state.items.map(i => (i.id === itemId ? updatedItem : i)),
      requests: updatedRequests,
      auditLog: [auditEntry, ...state.auditLog],
    },
  };
}

/**
 * Calculates fair cost split summary across all roommates.
 * Tracks:
 * - Direct consumed costs per roommate
 * - Items purchased/spent per owner
 * - Unallocated waste / phantom costs for house audit
 */
export function calculateFinancialLedger(state) {
  const ledger = {};
  ROOMMATES.forEach(r => {
    ledger[r] = {
      purchasedTotal: 0,
      consumedTotal: 0,
      consumedItems: [],
      balance: 0, // purchased - consumed (positive = owed money, negative = owes money)
    };
  });

  let totalPhantomLoss = 0;
  let totalSpoilageLoss = 0;
  const phantomIncidents = [];
  const spoilageIncidents = [];

  // 1. Calculate purchases made by owners
  state.items.forEach(item => {
    if (ledger[item.owner]) {
      ledger[item.owner].purchasedTotal += item.cost;
    }

    if (item.phantomQuantity > 0) {
      const pCost = (item.phantomQuantity / item.totalQuantity) * item.cost;
      totalPhantomLoss += pCost;
      phantomIncidents.push({
        name: item.name,
        tag: item.physicalTag,
        quantity: item.phantomQuantity,
        cost: pCost,
      });
    }

    if (item.spoiledQuantity > 0) {
      const sCost = (item.spoiledQuantity / item.totalQuantity) * item.cost;
      totalSpoilageLoss += sCost;
      spoilageIncidents.push({
        name: item.name,
        tag: item.physicalTag,
        quantity: item.spoiledQuantity,
        cost: sCost,
      });
    }
  });

  // 2. Calculate confirmed consumptions
  state.requests.forEach(req => {
    if (req.status === 'CONSUMED') {
      const item = state.items.find(i => i.id === req.itemId);
      if (item && ledger[req.consumedBy || req.requestedBy]) {
        const costShare = (req.portion / item.totalQuantity) * item.cost;
        const consumer = req.consumedBy || req.requestedBy;
        ledger[consumer].consumedTotal += costShare;
        ledger[consumer].consumedItems.push({
          item: item.name,
          tag: item.physicalTag,
          portion: req.portion,
          cost: costShare,
          date: req.consumedAt,
        });
      }
    }
  });

  // 3. Balances
  ROOMMATES.forEach(r => {
    ledger[r].balance = ledger[r].purchasedTotal - ledger[r].consumedTotal;
  });

  return {
    roommates: ledger,
    totalPhantomLoss: Number(totalPhantomLoss.toFixed(2)),
    totalSpoilageLoss: Number(totalSpoilageLoss.toFixed(2)),
    phantomIncidents,
    spoilageIncidents,
  };
}
