import React from 'react';
import { Shield, AlertTriangle, Clock, CheckCircle, Ghost, Trash2, Info, Utensils } from 'lucide-react';

export function AuditView({ auditLog }) {
  const getIcon = (type) => {
    switch (type) {
      case 'CONCURRENCY_BLOCKED':
        return <AlertTriangle size={16} color="#ef4444" />;
      case 'APPROVAL_EXPIRED':
        return <Clock size={16} color="#f59e0b" />;
      case 'REALITY_RECONCILED':
        return <Ghost size={16} color="#a855f7" />;
      case 'SPOILAGE_DISCARDED':
        return <Trash2 size={16} color="#ef4444" />;
      case 'PORTION_CONSUMED':
        return <Utensils size={16} color="#22c55e" />;
      case 'PORTION_APPROVED':
        return <CheckCircle size={16} color="#22c55e" />;
      default:
        return <Info size={16} color="#38bdf8" />;
    }
  };

  return (
    <section>
      <div className="inventory-section-header">
        <div>
          <h2 className="section-title">📜 Immutable Audit & Safety Trail</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            System event log recording all concurrency interventions, TTL expirations, and reality audits.
          </p>
        </div>
      </div>

      <div className="audit-list">
        {auditLog.map(item => (
          <div key={item.id} className={`audit-item severity-${item.severity || 'info'}`}>
            <div style={{ marginTop: 2 }}>{getIcon(item.type)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <span style={{ fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {item.type.replace('_', ' ')}
                </span>
                <span className="audit-time">
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
                {item.message}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
