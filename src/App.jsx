import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.jsx';
import { ScenarioSimulator } from './components/ScenarioSimulator.jsx';
import { InventoryView } from './components/InventoryView.jsx';
import { RequestsView } from './components/RequestsView.jsx';
import { LedgerView } from './components/LedgerView.jsx';
import { AuditView } from './components/AuditView.jsx';
import { AddItemModal, RequestPortionModal, ReconcileModal, ToastBanner } from './components/Modals.jsx';
import { INITIAL_DATA } from './domain/initialData.js';
import {
  requestPortion,
  approveRequest,
  consumePortion,
  expireStaleApprovals,
  markSpoiledAndDiscard,
  reconcilePhysicalReality,
  createFoodItem,
} from './domain/fridgePolice.js';
import './App.css';

const STORAGE_KEY = 'fridge_police_state_v1';

export default function App() {
  const [state, setState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved state:', e);
      }
    }
    return INITIAL_DATA;
  });

  const [currentRoommate, setCurrentRoommate] = useState('Alex');
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'requests' | 'ledger' | 'audit'

  // Modals & Toast State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [requestItemModal, setRequestItemModal] = useState(null);
  const [reconcileItemModal, setReconcileItemModal] = useState(null);
  const [toast, setToast] = useState(null);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const showToast = (title, message, type = 'info') => {
    setToast({ title, message, type });
    setTimeout(() => {
      setToast(null);
    }, 6000);
  };

  const handleResetData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState(INITIAL_DATA);
    showToast('Reset Complete', 'Demo state has been restored to default scenario conditions.', 'info');
  };

  // ---------------------------------------------------------------------------
  // INTERACTIVE DISASTER SIMULATOR ACTIONS
  // ---------------------------------------------------------------------------

  // Scenario 1: The Concurrency Collision
  const handleRunScenario1 = () => {
    const pizza = state.items.find(i => i.id === 'item-pizza-1') || state.items.find(i => i.name.toLowerCase().includes('pizza'));
    if (!pizza) {
      showToast('Item Missing', 'Pizza item was not found. Please reset demo.', 'error');
      return;
    }

    // Step A: Jordan requests 25%
    const resJordan = requestPortion(state, {
      itemId: pizza.id,
      requestedBy: 'Jordan',
      portion: 25,
    });

    if (!resJordan.success) {
      showToast('Collision Simulation', resJordan.error, 'error');
      setState(resJordan.state);
      return;
    }

    // Step B: Casey simultaneously requests 25% from the resulting state
    const resCasey = requestPortion(resJordan.state, {
      itemId: pizza.id,
      requestedBy: 'Casey',
      portion: 25,
    });

    // Casey MUST be blocked
    setState(resCasey.state);

    if (!resCasey.success) {
      showToast(
        '🛡️ Concurrency Collision Prevented!',
        `Jordan claimed the last 25% slice. Casey's concurrent request was safely BLOCKED: ${resCasey.error}`,
        'error'
      );
    } else {
      showToast('Request Succeeded', 'Portion reserved.', 'success');
    }
  };

  // Scenario 2: The Spoilage Ghost (Expire)
  const handleRunScenario2Expire = () => {
    // Force sweep with simulated future timestamp
    const futureTime = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const res = expireStaleApprovals(state, { now: futureTime });
    setState(res.state);

    if (res.expiredCount > 0) {
      showToast(
        '👻 Stale Ghost Banished!',
        `Swept ${res.expiredCount} expired approval(s). Released held portions. Jordan is NOT billed for uneaten food!`,
        'success'
      );
    } else {
      showToast('Sweep Complete', 'No expired approvals found.', 'info');
    }
  };

  // Scenario 2: Spoil & Discard
  const handleRunScenario2Spoil = (itemId) => {
    const res = markSpoiledAndDiscard(state, {
      itemId,
      reportedBy: currentRoommate,
      reason: 'Turned green and fuzzy after 3 days',
    });
    setState(res.state);
    showToast('Food Discarded', 'Remaining portion written off as waste. House ledger updated.', 'error');
  };

  // Scenario 3: Identical Item Disambiguation
  const handleRunScenario3 = () => {
    const alexKetchup = state.items.find(i => i.id === 'item-ketchup-alex');
    if (!alexKetchup) {
      showToast('Error', 'Alex ketchup bottle not found.', 'error');
      return;
    }

    // Taylor requests & consumes 20% specifically from Alex's bottle (#TAG-KCH-RED)
    const reqRes = requestPortion(state, {
      itemId: alexKetchup.id,
      requestedBy: 'Taylor',
      portion: 20,
    });

    if (!reqRes.success) {
      showToast('Request Failed', reqRes.error, 'error');
      return;
    }

    const appRes = approveRequest(reqRes.state, {
      requestId: reqRes.requestId,
      approver: 'Alex',
    });

    const conRes = consumePortion(appRes.state, {
      requestId: reqRes.requestId,
      consumer: 'Taylor',
    });

    setState(conRes.state);
    showToast(
      '🏷️ Distinct Item Tag Used',
      'Taylor consumed 20% from Alex\'s #TAG-KCH-RED (Door Top). Casey\'s identical bottle #TAG-KCH-BLU remains 100% untouched!',
      'success'
    );
  };

  // Scenario 4: The Phantom Eater
  const handleRunScenario4 = () => {
    const oj = state.items.find(i => i.id === 'item-juice-4') || state.items.find(i => i.name.toLowerCase().includes('juice'));
    if (!oj) {
      showToast('Item Missing', 'Orange juice item not found. Please reset demo.', 'error');
      return;
    }

    const res = reconcilePhysicalReality(state, {
      itemId: oj.id,
      actualRemainingPortion: 0,
      reportedBy: 'Casey',
      reason: 'Casey found empty carton in the physical fridge (drank offline at 2am)',
    });

    setState(res.state);
    showToast(
      '🔍 Reality Desync Reconciled',
      `Synchronized OJ from 100% down to 0%. $${res.phantomCost} recorded as Phantom Eater loss in the flat ledger.`,
      'error'
    );
  };

  // ---------------------------------------------------------------------------
  // STANDARD INTERACTIVE HANDLERS
  // ---------------------------------------------------------------------------

  const handleAddItem = (itemData) => {
    const newItem = createFoodItem(itemData);
    setState(prev => ({
      ...prev,
      items: [newItem, ...prev.items],
      auditLog: [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'ITEM_CREATED',
          message: `${itemData.owner} added "${itemData.name}" (${newItem.physicalTag}) to ${itemData.shelfLocation}.`,
          actor: itemData.owner,
          severity: 'info',
        },
        ...prev.auditLog,
      ],
    }));
    showToast('Item Logged', `Logged ${newItem.name} with physical tag ${newItem.physicalTag}.`, 'success');
  };

  const handleSubmitRequest = ({ itemId, portion, requestedBy }) => {
    const res = requestPortion(state, { itemId, requestedBy, portion });
    setState(res.state);
    if (res.success) {
      showToast('Request Submitted', `Requested ${portion}% portion. Waiting for owner approval.`, 'success');
      setActiveTab('requests');
    } else {
      showToast('Request Blocked', res.error, 'error');
    }
  };

  const handleApproveRequest = (requestId) => {
    const res = approveRequest(state, { requestId, approver: currentRoommate });
    setState(res.state);
    if (res.success) {
      showToast('Approved', 'Portion approved with 24-hour TTL.', 'success');
    } else {
      showToast('Error', res.error, 'error');
    }
  };

  const handleConsumeRequest = (requestId) => {
    const res = consumePortion(state, { requestId, consumer: currentRoommate });
    setState(res.state);
    if (res.success) {
      showToast('Consumed', 'Portion marked as consumed. Financial ledger updated.', 'success');
    } else {
      showToast('Error', res.error, 'error');
    }
  };

  const handleReconcileSubmit = ({ itemId, actualRemainingPortion, reportedBy, reason }) => {
    const res = reconcilePhysicalReality(state, {
      itemId,
      actualRemainingPortion,
      reportedBy,
      reason,
    });
    setState(res.state);
    if (res.success) {
      showToast('Reality Reconciled', `State updated to reflect ${actualRemainingPortion}% physically present.`, 'success');
    } else {
      showToast('Reconciliation Error', res.error, 'error');
    }
  };

  return (
    <div className="app-container">
      <Header
        currentRoommate={currentRoommate}
        setCurrentRoommate={setCurrentRoommate}
        onResetData={handleResetData}
      />

      {/* DISASTER SCENARIOS LAB */}
      <ScenarioSimulator
        items={state.items}
        requests={state.requests}
        onRunScenario1={handleRunScenario1}
        onRunScenario2Expire={handleRunScenario2Expire}
        onRunScenario2Spoil={handleRunScenario2Spoil}
        onRunScenario3={handleRunScenario3}
        onRunScenario4={handleRunScenario4}
      />

      {/* TABS NAVIGATION */}
      <nav className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          🧊 Fridge Inventory
          <span className="tab-count">{state.items.length}</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          📋 Requests & Queue
          <span className="tab-count">{state.requests.filter(r => r.status === 'PENDING_APPROVAL' || r.status === 'APPROVED').length}</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'ledger' ? 'active' : ''}`}
          onClick={() => setActiveTab('ledger')}
        >
          💰 Cost Split Ledger
        </button>
        <button
          className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          📜 Audit & Safety Log
          <span className="tab-count">{state.auditLog.length}</span>
        </button>
      </nav>

      {/* TAB CONTENT */}
      {activeTab === 'inventory' && (
        <InventoryView
          items={state.items}
          currentRoommate={currentRoommate}
          onRequestPortion={item => setRequestItemModal(item)}
          onOpenReconcileModal={item => setReconcileItemModal(item)}
          onMarkSpoiled={handleRunScenario2Spoil}
          onOpenAddModal={() => setIsAddModalOpen(true)}
        />
      )}

      {activeTab === 'requests' && (
        <RequestsView
          requests={state.requests}
          currentRoommate={currentRoommate}
          onApprove={handleApproveRequest}
          onConsume={handleConsumeRequest}
          onSweepExpired={handleRunScenario2Expire}
        />
      )}

      {activeTab === 'ledger' && (
        <LedgerView state={state} />
      )}

      {activeTab === 'audit' && (
        <AuditView auditLog={state.auditLog} />
      )}

      {/* MODALS & TOAST */}
      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddItem}
        currentRoommate={currentRoommate}
      />

      <RequestPortionModal
        isOpen={Boolean(requestItemModal)}
        onClose={() => setRequestItemModal(null)}
        item={requestItemModal}
        currentRoommate={currentRoommate}
        onSubmitRequest={handleSubmitRequest}
      />

      <ReconcileModal
        isOpen={Boolean(reconcileItemModal)}
        onClose={() => setReconcileItemModal(null)}
        item={reconcileItemModal}
        currentRoommate={currentRoommate}
        onReconcile={handleReconcileSubmit}
      />

      <ToastBanner toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
