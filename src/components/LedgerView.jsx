import React from 'react';
import { DollarSign, AlertOctagon, Trash2, Ghost } from 'lucide-react';
import { calculateFinancialLedger, ROOMMATES } from '../domain/fridgePolice.js';

export function LedgerView({ state }) {
  const ledger = calculateFinancialLedger(state);

  return (
    <section>
      <div className="inventory-section-header">
        <div>
          <h2 className="section-title">💸 Fair Cost Split & Loss Ledger</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Financial audit ensuring roommates pay strictly for what they eat — protecting against stale ghosts and tracking phantom losses.
          </p>
        </div>
      </div>

      <div className="ledger-grid">
        {ROOMMATES.map(roommate => {
          const acc = ledger.roommates[roommate] || { purchasedTotal: 0, consumedTotal: 0, balance: 0, consumedItems: [] };
          const isPositive = acc.balance > 0.01;
          const isNegative = acc.balance < -0.01;

          return (
            <div key={roommate} className="roommate-ledger-card">
              <div className="roommate-name-header">
                <span>{roommate}</span>
                <span className={`balance-stat ${isPositive ? 'balance-positive' : isNegative ? 'balance-negative' : 'balance-zero'}`}>
                  {isPositive ? `+$${acc.balance.toFixed(2)}` : isNegative ? `-$${Math.abs(acc.balance).toFixed(2)}` : '$0.00'}
                </span>
              </div>

              <div className="ledger-detail-row">
                <span>Groceries Purchased:</span>
                <strong style={{ color: 'var(--text-main)' }}>${acc.purchasedTotal.toFixed(2)}</strong>
              </div>

              <div className="ledger-detail-row">
                <span>Portions Consumed:</span>
                <strong style={{ color: '#38bdf8' }}>${acc.consumedTotal.toFixed(2)}</strong>
              </div>

              <div className="ledger-detail-row" style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem' }}>Status:</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                  {isPositive ? 'Gets reimbursed' : isNegative ? 'Owes to flat pool' : 'Settled up'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Waste & Phantom Discrepancy Tracking */}
      <div className="waste-summary-container">
        <div className="waste-card">
          <div className="waste-header" style={{ color: '#c084fc' }}>
            <Ghost size={16} />
            <span>Phantom Eater Losses (Scenario 4)</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Food consumed offline without recording in app. Reconciled during audits.
          </p>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#c084fc', marginBottom: '0.5rem' }}>
            ${ledger.totalPhantomLoss.toFixed(2)} Total Missing
          </div>
          {ledger.phantomIncidents.length === 0 ? (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No phantom losses recorded yet.</div>
          ) : (
            ledger.phantomIncidents.map((p, idx) => (
              <div key={idx} className="ledger-detail-row">
                <span>{p.name} ({p.tag}):</span>
                <strong style={{ color: '#c084fc' }}>{p.quantity}% (${p.cost.toFixed(2)})</strong>
              </div>
            ))
          )}
        </div>

        <div className="waste-card">
          <div className="waste-header" style={{ color: '#f87171' }}>
            <Trash2 size={16} />
            <span>Spoilage & Rot Write-offs (Scenario 2)</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Unclaimed portions discarded after TTL expiration. Not billed to innocent roommates.
          </p>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f87171', marginBottom: '0.5rem' }}>
            ${ledger.totalSpoilageLoss.toFixed(2)} Wasted Food
          </div>
          {ledger.spoilageIncidents.length === 0 ? (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No spoilage incidents recorded yet.</div>
          ) : (
            ledger.spoilageIncidents.map((s, idx) => (
              <div key={idx} className="ledger-detail-row">
                <span>{s.name} ({s.tag}):</span>
                <strong style={{ color: '#f87171' }}>{s.quantity}% (${s.cost.toFixed(2)})</strong>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
