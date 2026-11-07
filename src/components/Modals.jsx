import React, { useState } from 'react';
import { ROOMMATES, getAvailablePortion } from '../domain/fridgePolice.js';

export function AddItemModal({ isOpen, onClose, onAdd, currentRoommate }) {
  const [name, setName] = useState('');
  const [owner, setOwner] = useState(currentRoommate);
  const [cost, setCost] = useState('5.00');
  const [totalQuantity, setTotalQuantity] = useState('100');
  const [shelfLocation, setShelfLocation] = useState('Top Shelf');
  const [tagColor, setTagColor] = useState('blue');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      owner,
      cost: parseFloat(cost) || 0,
      totalQuantity: parseInt(totalQuantity, 10) || 100,
      shelfLocation,
      tagColor,
    });
    setName('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Log New Food Item</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Every logged item receives a unique physical tag to eliminate identity ambiguity (Scenario 3).
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="form-group">
            <label>Food Item Name</label>
            <input
              type="text"
              placeholder="e.g., Heinz Tomato Ketchup, Milk, Pizza"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label>Owner / Purchaser</label>
              <select value={owner} onChange={e => setOwner(e.target.value)}>
                {ROOMMATES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Item Cost ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={cost}
                onChange={e => setCost(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label>Fridge Location</label>
              <select value={shelfLocation} onChange={e => setShelfLocation(e.target.value)}>
                <option value="Fridge Door - Top Rack">Fridge Door - Top Rack</option>
                <option value="Fridge Door - Middle Rack">Fridge Door - Middle Rack</option>
                <option value="Fridge Door - Bottom Rack">Fridge Door - Bottom Rack</option>
                <option value="Top Shelf">Top Shelf</option>
                <option value="Middle Shelf">Middle Shelf</option>
                <option value="Bottom Crisper Drawer">Bottom Crisper Drawer</option>
              </select>
            </div>

            <div className="form-group">
              <label>Physical Cap Sticker Tag</label>
              <select value={tagColor} onChange={e => setTagColor(e.target.value)}>
                <option value="red">🔴 Red Sticker</option>
                <option value="blue">🔵 Blue Sticker</option>
                <option value="emerald">🟢 Green Sticker</option>
                <option value="amber">🟡 Yellow Sticker</option>
              </select>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-submit">Add to Fridge</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function RequestPortionModal({ isOpen, onClose, item, currentRoommate, onSubmitRequest }) {
  const [portion, setPortion] = useState(25);

  if (!isOpen || !item) return null;

  const available = getAvailablePortion(item);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmitRequest({
      itemId: item.id,
      portion: Number(portion),
      requestedBy: currentRoommate,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Request Portion</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Requesting from <strong>{item.name}</strong> ({item.physicalTag}). Available: <strong style={{ color: '#4ade80' }}>{available}%</strong>.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Portion Percentage (%)</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              {[10, 25, 50, available].filter((v, i, a) => v > 0 && a.indexOf(v) === i && v <= available).map(val => (
                <button
                  key={val}
                  type="button"
                  className="reset-btn"
                  style={{
                    flex: 1,
                    backgroundColor: portion === val ? '#2563eb' : 'var(--bg-secondary)',
                    color: portion === val ? 'white' : 'var(--text-main)',
                  }}
                  onClick={() => setPortion(val)}
                >
                  {val}%
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              max={100}
              value={portion}
              onChange={e => setPortion(e.target.value)}
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-submit">Submit Request</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ReconcileModal({ isOpen, onClose, item, currentRoommate, onReconcile }) {
  const [actualRemaining, setActualRemaining] = useState(0);
  const [reason, setReason] = useState('Drank/eaten offline without app (Phantom Eater)');

  if (!isOpen || !item) return null;

  const digitalAvailable = getAvailablePortion(item);

  const handleSubmit = (e) => {
    e.preventDefault();
    onReconcile({
      itemId: item.id,
      actualRemainingPortion: Number(actualRemaining),
      reportedBy: currentRoommate,
      reason,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Audit Physical Reality (Scenario 4)</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          The app records <strong>{digitalAvailable}% available</strong> for <strong>{item.name}</strong> ({item.physicalTag}). Enter the actual physical quantity you observed in the fridge.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Actual Physical Level in Fridge (%)</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <button
                type="button"
                className="reset-btn"
                style={{ flex: 1, borderColor: actualRemaining === 0 ? '#ef4444' : 'var(--border-color)' }}
                onClick={() => setActualRemaining(0)}
              >
                0% (Completely Empty / Gone)
              </button>
              <button
                type="button"
                className="reset-btn"
                style={{ flex: 1 }}
                onClick={() => setActualRemaining(Math.floor(digitalAvailable / 2))}
              >
                Half ({Math.floor(digitalAvailable / 2)}%)
              </button>
            </div>
            <input
              type="number"
              min="0"
              max={100}
              value={actualRemaining}
              onChange={e => setActualRemaining(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Audit Notes / Reason</label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-submit" style={{ background: '#9333ea' }}>
              Reconcile Reality
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ToastBanner({ toast, onClose }) {
  if (!toast) return null;
  return (
    <div className={`toast-banner toast-${toast.type}`}>
      <div style={{ flex: 1, fontSize: '0.85rem', lineHeight: 1.4 }}>
        <strong>{toast.title}</strong>
        <div>{toast.message}</div>
      </div>
      <button
        onClick={onClose}
        style={{ background: 'transparent', border: 'none', color: 'inherit', fontWeight: 700, cursor: 'pointer' }}
      >
        ✕
      </button>
    </div>
  );
}
