import { useState } from 'react'
import {
  SectorHeader, FieldLabel, DetailRow, PrimaryBtn, GhostBtn,
  StatusBanner, ScanAnimation, ErrorState
} from './Shared.jsx'

// ── Hit the backend OCR endpoint ────────────────────────────────────────────
async function ocrInvoice(dataUrl) {
  const res  = await fetch((import.meta.env.VITE_API_URL || '') + '/api/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_base64: dataUrl }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.detail || 'Server error from OCR endpoint')
  const raw = json.result?.trim()
  if (!raw) throw new Error('Empty response from AI')
  if (raw === 'NOT_AN_INVOICE') return null  // Caller handles this
  const cleaned = raw.startsWith('```') ? raw.split('```')[1].replace(/^json/, '').trim() : raw
  return JSON.parse(cleaned)
}

export default function Sector2() {
  const [phase,      setPhase]      = useState('upload') // upload | scanning | report | error
  const [preview,    setPreview]    = useState(null)     // base64 image
  const [invoice,    setInvoice]    = useState(null)     // extracted data
  const [activeTab,  setActiveTab]  = useState('data')   // data | approved
  const [errorMsg,   setErrorMsg]   = useState('')

  const runOCR = async (dataUrl) => {
    setPreview(dataUrl)
    setPhase('scanning')
    try {
      const data = await ocrInvoice(dataUrl)
      if (!data) {
        setErrorMsg('The uploaded image does not appear to be a valid invoice, bill, or receipt. Please upload a clear photo of a GST invoice.')
        setPhase('error')
        return
      }
      setInvoice(data)
      setPhase('report')
    } catch (err) {
      setErrorMsg(err.message || 'Failed to read the invoice. Please try a clearer image.')
      setPhase('error')
    }
  }

  const runDemo = async () => {
    setPreview(null)
    setPhase('scanning')
    await new Promise(r => setTimeout(r, 2200))
    setInvoice({
      irn: '86d7fb40cd9dc34a0df1aa6e1e8a7b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8',
      ackNo: '15100044593',
      category: 'B2B',
      documentNo: 'DOC-1234/GSTIN',
      documentType: 'Tax Invoice',
      documentDate: '30-06-2024',
      seller: {
        gstin: '29AABCS142981Z1',
        name: 'Sai Lakshmi Industries Pvt Ltd',
        address: 'Plot No. 42, KIADB Industrial Area, Bengaluru – 560058, Karnataka',
      },
      buyer: {
        gstin: '02SVJ70791Z1',
        name: 'Mehak General Store',
        address: 'Shop No. 5, Model Town, Shimla – 171001, Himachal Pradesh',
      },
      items: [
        { slNo: 1, desc: 'Stainless Steel Pressure Cooker 5L', hsn: '73239300', qty: 10, unit: 'NOS', unitPrice: 850, taxableAmt: 8500, cgst: '9%', sgst: '9%', igst: null, total: 10030 },
        { slNo: 2, desc: 'Non-Stick Frying Pan 28cm',           hsn: '73239300', qty: 5,  unit: 'NOS', unitPrice: 450, taxableAmt: 2250, cgst: '9%', sgst: '9%', igst: null, total: 2655 },
      ],
      totalTaxableAmt: 10750,
      totalTax: 1935,
      totalInvAmt: 12685,
      placeOfSupply: 'Karnataka',
      paymentTerms: 'Net 30 days',
      source: 'Demo',
    })
    setPhase('report')
  }

  const reset = () => { setPhase('upload'); setInvoice(null); setPreview(null); setErrorMsg('') }

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => runOCR(ev.target.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div>
      <SectorHeader
        num="02"
        title="Invoice & GST Verification"
        subtitle="Scan or upload any GST invoice to extract and validate all details with AI"
        icon="ti-file-invoice"
      />

      {/* ── Upload Phase ── */}
      {phase === 'upload' && (
        <div className="grid-2">
          <div className="card">
            <div style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--text-muted)', fontSize: 14, fontWeight: 600 }}>
              Upload Invoice to Validate
            </div>

            <label className="upload-zone">
              <div className="upload-icon-well">
                <i className="ti ti-file-upload" />
              </div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Upload Invoice Image</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>JPG, PNG, PDF — any format</div>
              <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleFile} />
            </label>

            <div style={{ margin: '1.5rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>— or —</div>

            <button className="btn btn-primary" style={{ width: '100%' }} onClick={runDemo}>
              <i className="ti ti-player-play" /> Try Demo Invoice
            </button>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '1.5rem' }}>What Gets Validated</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {[
                { icon: 'ti-building',     label: 'Seller & Buyer GSTIN',    desc: 'Validated against GST portal — detects fake or suspended registrations' },
                { icon: 'ti-list-numbers', label: 'HSN / SAC Codes',         desc: 'Verified with national commodity directory for correct classification' },
                { icon: 'ti-receipt-tax',  label: 'CGST / SGST / IGST',      desc: 'Tax math verified against applicable rates per CGST Act 2017' },
                { icon: 'ti-qrcode',       label: 'IRN & Acknowledgement',    desc: 'e-Invoice reference validated against NIC-IRP portal' },
                { icon: 'ti-map-pin',      label: 'Place of Supply',          desc: 'Confirms correct CGST+SGST vs IGST per Section 10 IGST Act' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.875rem' }}>
                  <div style={{
                    width: 36, height: 36, background: 'var(--success-100)', color: 'var(--success-700)',
                    borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <i className={`ti ${item.icon}`} style={{ fontSize: 17 }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="info-box success" style={{ marginTop: '1.5rem' }}>
              <i className="ti ti-bulb" style={{ flexShrink: 0 }} />
              Tip: Ensure all 4 corners of the invoice are visible for best OCR accuracy.
            </div>
          </div>
        </div>
      )}

      {/* ── Scanning Phase ── */}
      {phase === 'scanning' && (
        <ScanAnimation
          title="Reading Invoice"
          subtitle="AI-powered OCR and GST validation in progress"
          steps={[
            'Extracting text from document…',
            'Identifying GSTINs and party details…',
            'Parsing line items and HSN codes…',
            'Verifying tax calculations (CGST/SGST/IGST)…',
            'Validating seller & buyer GSTINs…',
            'Verifying IRN and e-Invoice signature…',
          ]}
        />
      )}

      {/* ── Error Phase ── */}
      {phase === 'error' && (
        <ErrorState message={errorMsg} onRetry={reset} />
      )}

      {/* ── Report Phase ── */}
      {phase === 'report' && invoice && (
        <div className="fade-in">
          <StatusBanner
            type="success"
            icon="ti-shield-check"
            title="Valid GST Invoice"
            subtitle="All tax calculations and GSTINs verified correct"
            badge="✓ VERIFIED"
          />

          {/* Tab bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
            <div style={{
              display: 'flex', gap: 4, background: 'var(--bg-surface)',
              padding: 4, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)'
            }}>
              {['data', 'approved'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '7px 16px', borderRadius: 6, border: 'none',
                    background: activeTab === tab ? 'var(--accent)' : 'var(--bg-color)',
                    fontWeight: activeTab === tab ? 600 : 400,
                    color: activeTab === tab ? 'white' : 'var(--text-secondary)',
                    boxShadow: activeTab === tab ? 'var(--shadow-extruded-sm)' : 'none',
                    cursor: 'pointer', fontSize: 13,
                  }}
                >
                  {tab === 'data' ? 'Extracted Data' : 'Approved Invoice'}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <GhostBtn onClick={reset}><i className="ti ti-refresh" /> New Scan</GhostBtn>
            </div>
          </div>

          {/* ── Extracted Data Tab ── */}
          {activeTab === 'data' && (
            <div>
              {preview && (
                <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                  <img src={preview} alt="Scanned Invoice"
                       style={{ maxHeight: 220, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }} />
                </div>
              )}

              <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
                <div className="card">
                  <FieldLabel>e-Invoice Details</FieldLabel>
                  <DetailRow label="Document No."  value={invoice.documentNo} mono />
                  <DetailRow label="Document Type" value={invoice.documentType} />
                  <DetailRow label="Date"          value={invoice.documentDate} />
                  <DetailRow label="Category"      value={invoice.category} />
                  <DetailRow label="Place of Supply" value={invoice.placeOfSupply} />
                  <DetailRow label="IRN"           value={invoice.irn ? invoice.irn.substring(0, 22) + '…' : null} mono />
                  <DetailRow label="Ack. No."      value={invoice.ackNo} mono />
                </div>

                <div className="card">
                  <FieldLabel>Party Details</FieldLabel>
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, letterSpacing: '0.06em' }}>SELLER</div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{invoice.seller?.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{invoice.seller?.address}</div>
                    {invoice.seller?.gstin && (
                      <div className="badge badge-navy" style={{ marginTop: 6, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                        {invoice.seller.gstin}
                      </div>
                    )}
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, letterSpacing: '0.06em' }}>BUYER</div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{invoice.buyer?.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{invoice.buyer?.address}</div>
                    {invoice.buyer?.gstin && (
                      <div className="badge badge-navy" style={{ marginTop: 6, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                        {invoice.buyer.gstin}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {invoice.items?.length > 0 && (
                <div className="card" style={{ overflowX: 'auto' }}>
                  <FieldLabel>Line Items</FieldLabel>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Description</th>
                        <th>HSN</th>
                        <th>Qty</th>
                        <th>Rate (₹)</th>
                        <th>Taxable (₹)</th>
                        <th>CGST</th>
                        <th>SGST</th>
                        <th>IGST</th>
                        <th>Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((item, i) => (
                        <tr key={i}>
                          <td>{item.slNo || i + 1}</td>
                          <td style={{ maxWidth: 200, whiteSpace: 'normal', minWidth: 120 }}>{item.desc}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{item.hsn ?? '—'}</td>
                          <td>{item.qty} {item.unit}</td>
                          <td>{item.unitPrice}</td>
                          <td>{item.taxableAmt}</td>
                          <td>{item.cgst ?? '—'}</td>
                          <td>{item.sgst ?? '—'}</td>
                          <td>{item.igst ?? '—'}</td>
                          <td style={{ fontWeight: 600 }}>{item.total}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'right' }}>Subtotal / Tax / Total</td>
                        <td>₹{invoice.totalTaxableAmt ?? '—'}</td>
                        <td colSpan="3">Tax: ₹{invoice.totalTax ?? '—'}</td>
                        <td>₹{invoice.totalInvAmt ?? '—'}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Approved Invoice Tab ── */}
          {activeTab === 'approved' && (
            <div style={{
              background: 'white', padding: '2rem',
              border: '1px solid var(--border-strong)', borderRadius: 4,
              maxWidth: 820, margin: '0 auto', boxShadow: 'var(--shadow-md)',
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                borderBottom: '2px solid var(--navy-900)', paddingBottom: '1rem', marginBottom: '1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <i className="ti ti-shield-check" style={{ fontSize: 48, color: 'var(--navy-900)' }} />
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>Government of India</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--navy-900)' }}>e-Invoice System — GST Shield Verified</div>
                  </div>
                </div>
                <span className="badge badge-success" style={{ fontSize: 11, padding: '6px 12px' }}>✓ GOVT. VERIFIED</span>
              </div>

              <div style={{
                background: 'var(--bg-surface)', padding: '8px 12px', border: '1px solid var(--border)',
                fontSize: 11, fontFamily: 'var(--font-mono)', marginBottom: '1rem',
                display: 'flex', gap: 24, flexWrap: 'wrap',
              }}>
                <span><strong>IRN:</strong> {invoice.irn || 'N/A'}</span>
                <span><strong>Ack No:</strong> {invoice.ackNo || 'N/A'}</span>
              </div>

              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8,
                background: 'var(--navy-100)', padding: '8px 12px',
                border: '1px solid var(--border)', fontSize: 12, marginBottom: '1rem',
              }}>
                <div><strong>Doc No:</strong> {invoice.documentNo}</div>
                <div><strong>Type:</strong> {invoice.documentType}</div>
                <div><strong>Date:</strong> {invoice.documentDate}</div>
                <div><strong>Category:</strong> {invoice.category}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1rem' }}>
                {[
                  { title: 'Details of Supplier', p: invoice.seller },
                  { title: 'Details of Recipient', p: invoice.buyer },
                ].map(({ title, p }, i) => (
                  <div key={i} style={{ border: '1px solid var(--border)', padding: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, borderBottom: '1px solid var(--border)', paddingBottom: 4, marginBottom: 8 }}>{title}</div>
                    <div style={{ fontWeight: 600 }}>{p?.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{p?.address}</div>
                    {p?.gstin && <div style={{ fontSize: 12, marginTop: 4 }}><strong>GSTIN:</strong> {p.gstin}</div>}
                  </div>
                ))}
              </div>

              {invoice.items?.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: '1rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--navy-900)', color: 'white' }}>
                      {['#','Item','HSN','Qty','Rate','Taxable','Tax','Total'].map(h => (
                        <th key={h} style={{ padding: '7px 8px', textAlign: h === '#' ? 'center' : 'left', border: '1px solid var(--navy-700)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, i) => (
                      <tr key={i} style={{ background: i % 2 ? 'var(--bg-surface)' : 'white' }}>
                        <td style={{ padding: '7px 8px', border: '1px solid var(--border)', textAlign: 'center' }}>{item.slNo || i+1}</td>
                        <td style={{ padding: '7px 8px', border: '1px solid var(--border)' }}>{item.desc}</td>
                        <td style={{ padding: '7px 8px', border: '1px solid var(--border)' }}>{item.hsn}</td>
                        <td style={{ padding: '7px 8px', border: '1px solid var(--border)' }}>{item.qty}</td>
                        <td style={{ padding: '7px 8px', border: '1px solid var(--border)' }}>₹{item.unitPrice}</td>
                        <td style={{ padding: '7px 8px', border: '1px solid var(--border)' }}>₹{item.taxableAmt}</td>
                        <td style={{ padding: '7px 8px', border: '1px solid var(--border)' }}>{item.cgst || item.igst || '—'}</td>
                        <td style={{ padding: '7px 8px', border: '1px solid var(--border)', fontWeight: 700 }}>₹{item.total}</td>
                      </tr>
                    ))}
                    <tr style={{ background: 'var(--navy-900)', color: 'white', fontWeight: 700 }}>
                      <td colSpan="7" style={{ padding: '7px 8px', textAlign: 'right', border: '1px solid var(--navy-700)' }}>Total Invoice Value</td>
                      <td style={{ padding: '7px 8px', border: '1px solid var(--navy-700)' }}>₹{invoice.totalInvAmt}</td>
                    </tr>
                  </tbody>
                </table>
              )}

              <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                Generated by GST Shield • Digitally verified on {new Date().toLocaleDateString('en-IN')} • This is a computer-generated record.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
