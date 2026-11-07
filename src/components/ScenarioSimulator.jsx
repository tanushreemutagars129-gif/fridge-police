import React from 'react';
import { Zap, Clock, Tag, EyeOff, AlertTriangle, CheckCircle, ShieldCheck } from 'lucide-react';
import { getAvailablePortion } from '../domain/fridgePolice.js';

export function ScenarioSimulator({
  items,
  requests,
  onRunScenario1,
  onRunScenario2Expire,
  onRunScenario2Spoil,
  onRunScenario3,
  onRunScenario4,
}) {
  const pizza = items.find(i => i.id === 'item-pizza-1') || items.find(i => i.name.toLowerCase().includes('pizza'));
  const pasta = items.find(i => i.id === 'item-pasta-2') || items.find(i => i.name.toLowerCase().includes('pasta'));
  const ketchupAlex = items.find(i => i.id === 'item-ketchup-alex');
  const ketchupCasey = items.find(i => i.id === 'item-ketchup-casey');
  const oj = items.find(i => i.id === 'item-juice-4') || items.find(i => i.name.toLowerCase().includes('juice'));

  const pizzaAvailable = pizza ? getAvailablePortion(pizza) : 0;
  const pastaAvailable = pasta ? getAvailablePortion(pasta) : 0;
  const ojAvailable = oj ? getAvailablePortion(oj) : 0;

  const pastaStaleRequest = requests.find(r => r.itemId === (pasta ? pasta.id : null) && r.status === 'APPROVED');

  return (
    <section className="simulation-section">
      <div className="simulation-header">
        <div>
          <h2 className="simulation-title">
            <Zap size={20} />
            Disaster Scenario Simulation Lab
          </h2>
          <p className="simulation-subtitle">
            One-click triggers to stress-test the 4 required failure modes that break naive happy paths.
          </p>
        </div>
      </div>

      <div className="scenarios-grid">
        {/* Scenario 1 */}
        <div className="scenario-card">
          <div className="scenario-badge badge-s1">Scenario 1 • Concurrency</div>
          <h3 className="scenario-card-title">🍕 The Concurrency Collision</h3>
          <p className="scenario-desc">
            Pizza has <strong>{pizzaAvailable}% left</strong>. Jordan & Casey both tap "Request last 25%" at 11:00 PM simultaneously.
          </p>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            <strong>Defense:</strong> Atomic capacity check rejects the 2nd request to prevent 50% phantom allocation.
          </div>
          <button
            className="scenario-action-btn btn-trigger-s1"
            onClick={onRunScenario1}
          >
            <Zap size={14} />
            Simulate 11 PM Collision
          </button>
        </div>

        {/* Scenario 2 */}
        <div className="scenario-card">
          <div className="scenario-badge badge-s2">Scenario 2 • Stale State</div>
          <h3 className="scenario-card-title">🍝 The Spoilage Ghost</h3>
          <p className="scenario-desc">
            Alex approved 50% pasta for Jordan 3 days ago. Jordan forgot to eat it and it turned green in the tupperware.
          </p>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            <strong>Defense:</strong> Approval TTL expires stale reservation; discard writes off waste without charging Jordan.
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexDirection: 'column' }}>
            <button
              className="scenario-action-btn btn-trigger-s2"
              onClick={onRunScenario2Expire}
              disabled={!pastaStaleRequest}
            >
              <Clock size={14} />
              {pastaStaleRequest ? 'Fast-Forward 3 Days (Expire TTL)' : 'Approvals Swept (Clean)'}
            </button>
            {pasta && pasta.status !== 'SPOILED' && (
              <button
                className="scenario-action-btn btn-item-secondary"
                onClick={() => onRunScenario2Spoil(pasta.id)}
                style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}
              >
                Mark Rotten Food Spoiled & Discard
              </button>
            )}
          </div>
        </div>

        {/* Scenario 3 */}
        <div className="scenario-card">
          <div className="scenario-badge badge-s3">Scenario 3 • Identity</div>
          <h3 className="scenario-card-title">🥫 The Identical Item Bug</h3>
          <p className="scenario-desc">
            Alex & Casey both bought identical Heinz bottles. Both sit in the door racks with the same label.
          </p>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            <strong>Defense:</strong> Mandatory Physical Tagging (🔴 Red #TAG-KCH-RED vs 🔵 Blue #TAG-KCH-BLU).
          </div>
          <button
            className="scenario-action-btn btn-trigger-s3"
            onClick={onRunScenario3}
          >
            <Tag size={14} />
            Consume 20% from Alex's Bottle
          </button>
        </div>

        {/* Scenario 4 */}
        <div className="scenario-card">
          <div className="scenario-badge badge-s4">Scenario 4 • Reality Drift</div>
          <h3 className="scenario-card-title">🧃 The Phantom Eater</h3>
          <p className="scenario-desc">
            App confidently says Orange Juice has <strong>{ojAvailable}%</strong>. Casey opens the fridge and the carton is empty!
          </p>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            <strong>Defense:</strong> Reconcile reality down to 0%, cancel invalid requests, and ledger phantom loss.
          </div>
          <button
            className="scenario-action-btn btn-trigger-s4"
            onClick={onRunScenario4}
          >
            <EyeOff size={14} />
            Reconcile Reality (Empty Carton)
          </button>
        </div>
      </div>
    </section>
  );
}
