import React from 'react';
import { ShieldAlert, RotateCcw, User } from 'lucide-react';
import { ROOMMATES } from '../domain/fridgePolice.js';

export function Header({ currentRoommate, setCurrentRoommate, onResetData }) {
  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-icon">
          🛡️
        </div>
        <div>
          <h1 className="brand-title">FridgePolice</h1>
          <p className="brand-tagline">Four Roommates. One Fridge. Zero Trust.</p>
        </div>
      </div>

      <div className="header-controls">
        <div className="roommate-switcher">
          <label>
            <User size={13} style={{ display: 'inline', marginRight: 4 }} />
            Active User:
          </label>
          <div className="roommate-pills">
            {ROOMMATES.map(roommate => (
              <button
                key={roommate}
                className={`roommate-btn ${currentRoommate === roommate ? 'active' : ''}`}
                onClick={() => setCurrentRoommate(roommate)}
              >
                {roommate}
              </button>
            ))}
          </div>
        </div>

        <button className="reset-btn" onClick={onResetData} title="Reset demo state back to default challenge setup">
          <RotateCcw size={14} style={{ display: 'inline', marginRight: 4 }} />
          Reset Demo
        </button>
      </div>
    </header>
  );
}
