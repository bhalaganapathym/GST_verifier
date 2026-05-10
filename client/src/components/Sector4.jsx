import { useState, useRef, useEffect } from 'react'
import { SectorHeader } from './Shared.jsx'

const SYSTEM = `You are GSTBot, an expert AI assistant specializing in Indian GST (Goods and Services Tax) law.
You have deep knowledge of:
- CGST Act 2017, IGST Act 2017, UGST Act 2017
- GST rates, HSN codes, SAC codes
- Input Tax Credit (ITC) rules and reversals
- e-Way Bill, e-Invoice, IRN, QR code requirements
- GSTR-1, GSTR-2A/2B, GSTR-3B, GSTR-9/9C filing
- GST registration, cancellation, revocation
- Penalties, interest, and prosecution provisions
- FSSAI, BIS, and other compliance frameworks

Answer concisely and accurately. If quoting sections, cite the exact act and section number.
For questions outside GST/tax law, politely redirect to your area of expertise.`

const QUICK = [
  'What is the GST rate on mobile phones?',
  'How do I claim Input Tax Credit on a purchase?',
  'What documents are required for GST registration?',
  'Explain the difference between CGST, SGST, and IGST',
  'What is an IRN and how is it generated?',
  'What are the penalties for not filing GSTR-3B?',
]

export default function Sector4() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I\'m GSTBot 🤖\n\nI\'m your AI expert on Indian GST law. I can help you with:\n• GST rates and HSN/SAC codes\n• Input Tax Credit rules\n• Filing GSTR returns\n• e-Invoice and e-Way Bill queries\n• Penalties and compliance issues\n\nWhat would you like to know?',
    },
  ])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text) => {
    const msg = (text || input).trim()
    if (!msg) return
    setInput('')
    setError('')

    const next = [...messages, { role: 'user', content: msg }]
    setMessages(next)
    setLoading(true)

    try {
      // Send full conversation history for context
      const res  = await fetch((import.meta.env.VITE_API_URL || '') + '/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: SYSTEM,
          messages: next.map(m => ({ role: m.role, content: m.content })),
          max_tokens: 1200,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.detail || 'Server error')
      const reply = json.content?.[0]?.text || '(No response)'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div>
      <SectorHeader
        num="04"
        title="GSTBot — AI Advisor"
        subtitle="Ask any question about Indian GST law, rates, compliance, and more"
        icon="ti-robot"
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Quick buttons */}
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Quick questions:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {QUICK.map((q, i) => (
              <button
                key={i}
                onClick={() => send(q)}
                disabled={loading}
                style={{
                  padding: '5px 12px', borderRadius: 'var(--radius-base)',
                  border: 'none', background: 'var(--bg-color)',
                  fontSize: 12, cursor: 'pointer', color: 'var(--text-secondary)',
                  transition: 'all 0.3s', boxShadow: 'var(--shadow-extruded-sm)'
                }}
                onMouseOver={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-extruded-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}}
                onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-extruded-sm)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`chat-bubble ${m.role}`}
              >
                {m.role === 'assistant' && (
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                    🤖 GSTBot
                  </div>
                )}
                {m.content}
              </div>
            ))}

            {loading && (
              <div className="chat-bubble assistant">
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>🤖 GSTBot</div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0, 1, 2].map(j => (
                    <div key={j} style={{
                      width: 7, height: 7, background: 'var(--text-muted)', borderRadius: '50%',
                      animation: `bounce 1.2s ${j * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div style={{
                background: 'var(--danger-100)', color: 'var(--danger-700)',
                padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: 13,
              }}>
                <i className="ti ti-alert-circle" /> {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '1rem', display: 'flex', gap: 10, alignItems: 'flex-end',
            background: 'var(--bg-color)', borderBottomLeftRadius: 'var(--radius-card)', borderBottomRightRadius: 'var(--radius-card)'
          }}>
            <textarea
              className="input-field"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask a GST question… (Enter to send, Shift+Enter for new line)"
              rows={1}
              style={{
                flex: 1, resize: 'none', padding: '0.75rem 1rem',
                lineHeight: 1.5, overflowY: 'hidden',
              }}
              onInput={e => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="btn btn-primary"
              style={{ flexShrink: 0, minHeight: 42 }}
            >
              {loading
                ? <i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }} />
                : <i className="ti ti-send" />
              }
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40%            { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
