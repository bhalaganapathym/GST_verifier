import { useState } from 'react'
import { SectorHeader, PrimaryBtn, GhostBtn, FieldLabel } from './Shared.jsx'

const SYSTEM = `You are a senior GST legal expert and consumer rights advocate in India.
Your task is to draft a formal, legally precise complaint letter in English when given a description of a GST violation or fraud.
The letter should:
- Be addressed to the appropriate authority (CGST/SGST Commissioner, Anti-Evasion wing, or Consumer Forum as appropriate)
- Include all relevant GST Act sections and penalties that apply
- Be structured with: Subject, Date, To/From, Narration of facts, Legal provisions violated, Relief sought
- Use formal legal language
- End with "Yours faithfully" and placeholders for signature
Keep it concise but complete. Return only the complaint letter text.`

const EXAMPLES = [
  'Shopkeeper charging GST but not giving invoice',
  'Product MRP is ₹500 but GST charged on ₹650',
  'Seller registered on GST portal but filing NIL returns',
  'Input tax credit fraudulently claimed on fake invoices',
]

export default function Sector3() {
  const [complaint, setComplaint] = useState('')
  const [result,    setResult]    = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [copied,    setCopied]    = useState(false)

  const generate = async () => {
    if (!complaint.trim()) return
    setLoading(true); setResult(''); setError('')
    try {
      const res  = await fetch((import.meta.env.VITE_API_URL || '') + '/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: SYSTEM,
          messages: [{ role: 'user', content: `Draft a GST complaint letter for the following issue:\n\n${complaint}` }],
          max_tokens: 1500,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.detail || 'Server error')
      setResult(json.content?.[0]?.text || '')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <SectorHeader
        num="03"
        title="GST Complaint Assistant"
        subtitle="Describe any GST violation and get a formal complaint letter instantly"
        icon="ti-message-report"
      />

      <div className="grid-2">
        {/* Input */}
        <div className="card">
          <FieldLabel>Describe the GST Issue</FieldLabel>
          <textarea
            className="input-field"
            value={complaint}
            onChange={e => setComplaint(e.target.value)}
            placeholder="e.g. A local shopkeeper is charging 18% GST on grocery items but refusing to provide a proper tax invoice with their GSTIN. When asked, they showed a fake GST number."
            rows={7}
            style={{ resize: 'vertical', lineHeight: 1.6, marginBottom: '1rem' }}
          />

          <div style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Common examples:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setComplaint(ex)}
                  style={{
                    padding: '5px 12px', borderRadius: 'var(--radius-base)', border: 'none',
                    background: 'var(--bg-color)', fontSize: 12, cursor: 'pointer',
                    color: 'var(--text-secondary)', transition: 'all 0.3s',
                    boxShadow: 'var(--shadow-extruded-sm)'
                  }}
                  onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-extruded-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                  onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-extruded-sm)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <PrimaryBtn onClick={generate} disabled={loading || !complaint.trim()}>
            {loading
              ? <><i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
              : <><i className="ti ti-file-text" /> Generate Complaint Letter</>
            }
          </PrimaryBtn>

          {error && (
            <div className="info-box" style={{ marginTop: '1rem', background: 'var(--danger-100)', color: 'var(--danger-700)' }}>
              <i className="ti ti-alert-triangle" style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          <div className="info-box info" style={{ marginTop: '1rem' }}>
            <i className="ti ti-info-circle" style={{ flexShrink: 0 }} />
            The AI will draft a legally formatted letter citing the relevant sections of the CGST Act 2017.
          </div>
        </div>

        {/* Output */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <FieldLabel>Generated Complaint Letter</FieldLabel>
            {result && (
              <button className="btn btn-ghost" onClick={copy} style={{ fontSize: 12, padding: '4px 12px', minHeight: 32 }}>
                {copied ? <><i className="ti ti-check" /> Copied!</> : <><i className="ti ti-copy" /> Copy</>}
              </button>
            )}
          </div>

          {!result && !loading && (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem',
            }}>
              <i className="ti ti-file-description" style={{ fontSize: 48, marginBottom: '1rem' }} />
              <div style={{ fontSize: 14, fontWeight: 500 }}>Your complaint letter will appear here</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Fill in the issue and click Generate</div>
            </div>
          )}

          {loading && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div>
                <div className="scan-ring" style={{ margin: '0 auto 1rem' }} />
                <div style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: 13 }}>
                  Drafting your complaint letter…
                </div>
              </div>
            </div>
          )}

          {result && (
            <pre style={{
              flex: 1, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-body)',
              fontSize: 14, lineHeight: 1.75, color: 'var(--text-primary)',
              background: 'var(--bg-color)', padding: '1.5rem',
              borderRadius: 'var(--radius-card)', border: 'none',
              boxShadow: 'var(--shadow-inset)',
              overflowY: 'auto', maxHeight: 500,
            }}>
              {result}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
