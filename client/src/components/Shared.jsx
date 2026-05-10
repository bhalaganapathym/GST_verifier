// ──────────────────────────────────────────────────────────
//  Shared UI primitives for GST Shield India
// ──────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'

/* SectorHeader ───────────────────────────────────────────── */
export function SectorHeader({ num, title, subtitle, icon }) {
  return (
    <div className="sector-header">
      <div className="sector-icon">
        <div className="sector-icon-inner">
          <i className={`ti ${icon}`} />
        </div>
      </div>
      <div>
        <div className="sector-num">Sector {num}</div>
        <h1 className="sector-title">{title}</h1>
        <p className="sector-subtitle">{subtitle}</p>
      </div>
    </div>
  )
}

/* FieldLabel ─────────────────────────────────────────────── */
export function FieldLabel({ children }) {
  return <div className="field-label">{children}</div>
}

/* DetailRow ──────────────────────────────────────────────── */
export function DetailRow({ label, value, mono }) {
  if (value == null) return null
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className={`detail-value ${mono ? 'mono' : ''}`}>{String(value)}</span>
    </div>
  )
}

/* StatusBanner ───────────────────────────────────────────── */
export function StatusBanner({ type = 'success', icon, title, subtitle, badge }) {
  return (
    <div className={`status-banner ${type}`}>
      <i className={`ti ${icon} banner-icon`} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{subtitle}</div>}
      </div>
      {badge && <span className="banner-badge">{badge}</span>}
    </div>
  )
}

/* PrimaryBtn / GhostBtn ─────────────────────────────────────── */
export function PrimaryBtn({ onClick, children, disabled }) {
  return (
    <button className="btn btn-primary" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}
export function GhostBtn({ onClick, children, disabled }) {
  return (
    <button className="btn btn-ghost" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}
export function GoldBtn({ onClick, children, disabled }) {
  return (
    <button className="btn btn-gold" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

/* ScanAnimation ─────────────────────────────────────────── */
export function ScanAnimation({ title, subtitle, steps = [] }) {
  const [doneIdx, setDoneIdx] = useState(-1)

  useEffect(() => {
    setDoneIdx(-1)
    let idx = 0
    const interval = setInterval(() => {
      setDoneIdx(idx)
      idx++
      if (idx >= steps.length) clearInterval(interval)
    }, 600)
    return () => clearInterval(interval)
  }, [steps.length])

  return (
    <div className="scan-animation-wrap">
      <div className="scan-ring" />
      <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--navy-900)' }}>{title}</div>
      {subtitle && <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>{subtitle}</div>}
      <ul className="scan-steps">
        {steps.map((step, i) => (
          <li
            key={i}
            className={`scan-step ${i < doneIdx ? 'done' : i === doneIdx ? 'active' : ''}`}
          >
            {i < doneIdx
              ? <i className="ti ti-check" style={{ color: 'var(--success-600)', flexShrink: 0 }} />
              : i === doneIdx
                ? <i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                : <i className="ti ti-clock" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            }
            {step}
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ErrorState ─────────────────────────────────────────────── */
export function ErrorState({ message, onRetry }) {
  return (
    <div className="card error-state">
      <i className="ti ti-alert-triangle error-icon" />
      <h2>Verification Failed</h2>
      <p>{message}</p>
      {onRetry && <PrimaryBtn onClick={onRetry}>Try Again</PrimaryBtn>}
    </div>
  )
}
