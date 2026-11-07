import React from 'react';
import { Check, Utensils, Clock, AlertTriangle, ShieldAlert } from 'lucide-react';

export function RequestsView({
  requests,
  currentRoommate,
  onApprove,
  onConsume,
  onSweepExpired,
}) {
  const pendingOrApproved = requests.filter(r => r.status === 'PENDING_APPROVAL' || r.status === 'APPROVED');
  const pastRequests = requests.filter(r => r.status !== 'PENDING_APPROVAL' && r.status !== 'APPROVED');

  return (
    <section>
      <div className="inventory-section-header">
        <div>
          <h2 className="section-title">📋 Requests & Approval Queue</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Track who requested what, pending owner approvals, and active TTL expiration windows.
          </p>
        </div>
        <button className="reset-btn" onClick={onSweepExpired}>
          <Clock size={14} style={{ display: 'inline', marginRight: 4 }} />
          Sweep Expired Approvals
        </button>
      </div>

      <div className="queue-container">
        {requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 12 }}>
            No portion requests currently recorded.
          </div>
        ) : (
          requests.map(req => {
            const isOwner = req.owner === currentRoommate;
            const isRequester = req.requestedBy === currentRoommate;
            const isExpired = req.expiresAt && new Date(req.expiresAt) < new Date();

            return (
              <div
                key={req.id}
                className={`request-card status-${req.status.toLowerCase()}`}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span className={`status-pill status-${req.status.toLowerCase()}`}>
                      {req.status.replace('_', ' ')}
                    </span>
                    <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{req.itemName}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      ({req.physicalTag})
                    </span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Requested by <strong>{req.requestedBy}</strong> • Portion: <strong style={{ color: '#38bdf8' }}>{req.portion}%</strong> • Owner: <strong>{req.owner}</strong>
                  </div>

                  {req.expiresAt && req.status === 'APPROVED' && (
                    <div style={{ fontSize: '0.78rem', marginTop: '0.25rem', color: isExpired ? '#f87171' : '#fbbf24' }}>
                      <Clock size={12} style={{ display: 'inline', marginRight: 3 }} />
                      {isExpired ? 'TTL Expired (stale ghost!)' : `TTL Window: Expires at ${new Date(req.expiresAt).toLocaleTimeString()}`}
                    </div>
                  )}

                  {req.cancellationReason && (
                    <div style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.2rem' }}>
                      {req.cancellationReason}
                    </div>
                  )}
                </div>

                <div className="request-actions">
                  {req.status === 'PENDING_APPROVAL' && (
                    <button
                      className="btn-approve"
                      onClick={() => onApprove(req.id)}
                      title={isOwner ? 'Approve this request' : 'Tip: In a shared flat, owner Alex should approve, but any roommate can test approval'}
                    >
                      <Check size={14} style={{ display: 'inline', marginRight: 4 }} />
                      Approve ({req.portion}%)
                    </button>
                  )}

                  {req.status === 'APPROVED' && (
                    <button
                      className="btn-consume"
                      onClick={() => onConsume(req.id)}
                    >
                      <Utensils size={14} style={{ display: 'inline', marginRight: 4 }} />
                      Mark Consumed
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
