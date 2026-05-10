import { useState } from 'react'
import Sector1 from './components/Sector1.jsx'
import Sector2 from './components/Sector2.jsx'
import Sector3 from './components/Sector3.jsx'
import Sector4 from './components/Sector4.jsx'

const NAV = [
  { id: 1, icon: 'ti-shield-check',   label: 'Product Verification',     sub: 'Scan barcode or QR' },
  { id: 2, icon: 'ti-file-invoice',   label: 'Invoice Verification',     sub: 'Validate GST invoices' },
  { id: 3, icon: 'ti-message-report', label: 'Complaint Assistant',      sub: 'File GST complaints' },
  { id: 4, icon: 'ti-robot',          label: 'GSTBot',                   sub: 'AI GST advisor' },
]

export default function App() {
  const [active, setActive] = useState(1)
  const [menuOpen, setMenuOpen] = useState(false)

  const renderSector = () => {
    switch (active) {
      case 1: return <Sector1 key={1} />
      case 2: return <Sector2 key={2} />
      case 3: return <Sector3 key={3} />
      case 4: return <Sector4 key={4} />
      default: return null
    }
  }

  return (
    <div className="app-shell">
      {/* Mobile Header */}
      <div className="mobile-header">
        <div className="sidebar-logo-mark" style={{ width: 36, height: 36 }}>
          <i className="ti ti-shield-check" style={{ fontSize: 18 }} />
        </div>
        <div className="sidebar-title" style={{ fontSize: 16 }}>GST Shield</div>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          <i className={`ti ${menuOpen ? 'ti-x' : 'ti-menu-2'}`} style={{ fontSize: 24, color: 'var(--accent)' }} />
        </button>
      </div>

      {/* Sidebar */}
      <nav className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-logo desktop-only">
          <div className="sidebar-logo-mark">
            <i className="ti ti-shield-check" style={{ fontSize: 22 }} />
          </div>
          <div>
            <div className="sidebar-title">GST Shield India</div>
            <div className="sidebar-subtitle">AI-Powered Verification</div>
          </div>
        </div>

        <div className="sidebar-nav">
          <div className="sidebar-subtitle" style={{ padding: '0 16px' }}>Modules</div>
          {NAV.map(n => (
            <button
              key={n.id}
              className={`nav-item ${active === n.id ? 'active' : ''}`}
              onClick={() => { setActive(n.id); setMenuOpen(false) }}
            >
              <div className="sector-icon-inner" style={{ width: 32, height: 32, fontSize: 16 }}>
                <i className={`ti ${n.icon}`} />
              </div>
              <span style={{ flex: 1, lineHeight: 1.3 }}>
                <span style={{ display: 'block' }}>{n.label}</span>
                <span style={{ display: 'block', fontSize: 11, fontWeight: 500, marginTop: 2 }}>{n.sub}</span>
              </span>
              <span className="nav-num">0{n.id}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <div style={{ marginBottom: 4, fontWeight: 700 }}>🇮🇳 Government of India</div>
          <div>CBIC · GST Portal · GS1 India</div>
        </div>
      </nav>

      {/* Main */}
      <main className="main-content">
        <div className="fade-in" key={active}>
          {renderSector()}
        </div>
      </main>
    </div>
  )
}
