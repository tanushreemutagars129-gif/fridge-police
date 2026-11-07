import React, { useState } from 'react';
import { Plus, Tag, MapPin, AlertCircle, Trash2, Sliders, Shield } from 'lucide-react';
import { getAvailablePortion } from '../domain/fridgePolice.js';

export function InventoryView({
  items,
  currentRoommate,
  onRequestPortion,
  onOpenReconcileModal,
  onMarkSpoiled,
  onOpenAddModal,
}) {
  return (
    <section>
      <div className="inventory-section-header">
        <div>
          <h2 className="section-title">🧊 Fridge Inventory</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Physical food items currently monitored by FridgePolice with strict conservation of matter.
          </p>
        </div>
        <button className="add-item-btn" onClick={onOpenAddModal}>
          <Plus size={16} />
          Log New Food Item
        </button>
      </div>

      <div className="items-grid">
        {items.map(item => {
          const available = getAvailablePortion(item);
          const isSpoiled = item.status === 'SPOILED';
          const isEmpty = available === 0;

          // Calculate bar percentages
          const availPct = (available / item.totalQuantity) * 100;
          const resPct = ((item.reservedQuantity || 0) / item.totalQuantity) * 100;
          const conPct = ((item.consumedQuantity || 0) / item.totalQuantity) * 100;
          const spoilPct = ((item.spoiledQuantity || 0) / item.totalQuantity) * 100;
          const phantomPct = ((item.phantomQuantity || 0) / item.totalQuantity) * 100;

          return (
            <div
              key={item.id}
              className={`item-card ${isSpoiled ? 'status-spoiled' : ''} ${isEmpty ? 'status-empty' : ''}`}
            >
              <div>
                <div className="item-top">
                  <div className="item-title-group">
                    <h3 className="item-name">{item.name}</h3>
                    <div className="item-meta">
                      <span className={`tag-badge tag-${item.tagColor || 'blue'}`}>
                        <Tag size={11} />
                        {item.physicalTag}
                      </span>
                      <span className="owner-pill">Owner: <strong>{item.owner}</strong></span>
                    </div>
                  </div>
                  <div className="item-cost">${item.cost.toFixed(2)}</div>
                </div>

                <div className="shelf-info" style={{ marginTop: '0.5rem' }}>
                  <MapPin size={12} />
                  <span>{item.shelfLocation || 'Fridge Shelf'}</span>
                  {item.status !== 'ACTIVE' && (
                    <span style={{
                      marginLeft: 'auto',
                      fontWeight: 700,
                      fontSize: '0.72rem',
                      color: isSpoiled ? '#f87171' : '#94a3b8',
                      textTransform: 'uppercase'
                    }}>
                      [{item.status}]
                    </span>
                  )}
                </div>
              </div>

              {/* Visual Portion Gauge */}
              <div className="gauge-container">
                <div className="gauge-labels">
                  <span>Available: <strong style={{ color: available > 0 ? '#4ade80' : '#94a3b8' }}>{available}%</strong></span>
                  <span style={{ color: 'var(--text-muted)' }}>Total: {item.totalQuantity}%</span>
                </div>

                <div className="gauge-bar">
                  <div className="bar-segment bar-available" style={{ width: `${availPct}%` }} title={`Available: ${available}%`} />
                  <div className="bar-segment bar-reserved" style={{ width: `${resPct}%` }} title={`Reserved: ${item.reservedQuantity}%`} />
                  <div className="bar-segment bar-consumed" style={{ width: `${conPct}%` }} title={`Consumed: ${item.consumedQuantity}%`} />
                  <div className="bar-segment bar-spoiled" style={{ width: `${spoilPct}%` }} title={`Spoiled: ${item.spoiledQuantity}%`} />
                  <div className="bar-segment bar-phantom" style={{ width: `${phantomPct}%` }} title={`Phantom Loss: ${item.phantomQuantity}%`} />
                </div>

                <div className="gauge-legend">
                  {availPct > 0 && <span><span className="legend-dot" style={{ background: '#22c55e' }} />Avail ({available}%)</span>}
                  {resPct > 0 && <span><span className="legend-dot" style={{ background: '#f59e0b' }} />Locked ({item.reservedQuantity}%)</span>}
                  {conPct > 0 && <span><span className="legend-dot" style={{ background: '#475569' }} />Eaten ({item.consumedQuantity}%)</span>}
                  {spoilPct > 0 && <span><span className="legend-dot" style={{ background: '#ef4444' }} />Spoiled ({item.spoiledQuantity}%)</span>}
                  {phantomPct > 0 && <span><span className="legend-dot" style={{ background: '#a855f7' }} />Phantom ({item.phantomQuantity}%)</span>}
                </div>
              </div>

              {/* Action buttons */}
              <div className="item-actions">
                <button
                  className="btn-item-request"
                  onClick={() => onRequestPortion(item)}
                  disabled={available === 0 || isSpoiled}
                >
                  Request Portion
                </button>
                <button
                  className="btn-item-secondary"
                  onClick={() => onOpenReconcileModal(item)}
                  title="Scenario 4: Reconcile physical observation with digital records"
                >
                  <Sliders size={13} style={{ display: 'inline', marginRight: 3 }} />
                  Audit Reality
                </button>
                {!isSpoiled && available > 0 && (
                  <button
                    className="btn-item-secondary"
                    onClick={() => onMarkSpoiled(item.id)}
                    title="Scenario 2: Discard spoiled rotten food"
                    style={{ color: '#f87171' }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
