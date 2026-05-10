# ============================================================
#  MASTER BUILD PROMPT — GST SHIELD INDIA
#  Feed this entire document to Antigravity as your prompt.
# ============================================================

## PROJECT NAME
GST Shield India — QR-Based GST Verification & Fraud Detection System

---

## PROJECT SUMMARY

Build a full-stack, production-ready web application called **GST Shield India** for the Indian government ecosystem. It is a consumer protection platform that allows users to:

1. Verify product authenticity via live camera QR/barcode scanning (Sector 1)
2. Scan and validate GST invoices and generate government-approved verified copies (Sector 2)
3. File formatted complaints to government authorities using AI (Sector 3)
4. Ask an AI chatbot questions about Indian GST law and consumer rights (Sector 4)

The app must work seamlessly on **desktop and mobile**. It uses **Google Gemini** as the primary AI provider and **Groq** as the secondary/fallback AI provider. Both are free-tier APIs.

---

## API KEYS (use exactly as given)

```
PRIMARY AI:   Google Gemini
GEMINI_API_KEY = AIzaSyBr6uqb1vTmTNenjbHcOPTQGcBaVH08OvA
GEMINI_MODEL   = gemini-1.5-flash

SECONDARY AI: Groq (fallback)
GROQ_API_KEY = (user will add their own Groq key from console.groq.com)
GROQ_MODEL   = llama-3.3-70b-versatile

DEFAULT PROVIDER = gemini
```

---

## TECH STACK

### Backend
- **Runtime**: Node.js v18+ with ES Modules (`"type": "module"`)
- **Server**: Express.js 4.x
- **AI SDKs**: `@google/generative-ai` for Gemini, `groq-sdk` for Groq
- **Other packages**: `dotenv`, `cors`
- **Entry point**: `server.js`

### Frontend
- **Framework**: React 18 with Vite 5
- **QR Decoding**: `jsqr` npm package (for live QR scanning from camera)
- **Icons**: Tabler Icons (load via CDN in index.html)
- **Fonts**: Google Fonts — Inter (body), DM Serif Display (headings), Source Code Pro (mono)
- **Styling**: Pure CSS with CSS custom properties — no Tailwind, no styled-components
- **State**: React useState/useRef/useEffect only — no Redux, no Zustand

### Structure
```
gst-shield/
├── server.js                        ← Express backend + AI proxy
├── package.json                     ← server deps
├── .env                             ← API keys (pre-configured)
├── .env.example
├── .gitignore
├── README.md
└── client/
    ├── index.html
    ├── package.json                 ← react + jsqr
    ├── vite.config.js               ← proxy /api → localhost:3000
    └── src/
        ├── main.jsx
        ├── App.jsx                  ← navigation shell
        ├── index.css                ← full design system
        ├── data/
        │   └── demoData.js          ← demo product + invoice data
        ├── utils/
        │   └── api.js               ← callAI() helper
        └── components/
            ├── Shared.jsx           ← reusable UI components
            ├── CameraScanner.jsx    ← live camera (QR + photo)
            ├── Dashboard.jsx        ← home page
            ├── Sector1.jsx          ← product QR verification
            ├── Sector2.jsx          ← invoice verification
            ├── Sector3.jsx          ← AI complaint filing
            └── Sector4.jsx          ← AI chatbot (GSTBot)
```

---

## ENVIRONMENT CONFIGURATION

### `.env` file (pre-configured)
```env
AI_PROVIDER=gemini
GEMINI_API_KEY=AIzaSyBr6uqb1vTmTNenjbHcOPTQGcBaVH08OvA
AI_MODEL=gemini-1.5-flash
GROQ_API_KEY=
PORT=3000
```

### `.env.example`
```env
# Choose: gemini (recommended free) or groq (free fallback)
AI_PROVIDER=gemini

GEMINI_API_KEY=your_gemini_key_here
GROQ_API_KEY=your_groq_key_here
AI_MODEL=
PORT=3000
```

---

## SERVER — `server.js`

Build an Express server that:

1. **Serves the React build** from `client/dist/` as static files
2. **Exposes `POST /api/ai`** — routes AI requests to either Gemini or Groq based on `AI_PROVIDER` in `.env`
3. **Exposes `GET /api/health`** — returns JSON with provider, model, apiKeySet status
4. Catches all other routes and serves `client/dist/index.html` (SPA fallback)

### AI routing logic in `server.js`

```javascript
// Gemini provider
async function callGemini(messages, system, maxTokens) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({
    model: process.env.AI_MODEL || 'gemini-1.5-flash',
    systemInstruction: system || undefined,
    generationConfig: { maxOutputTokens: maxTokens }
  })
  // Convert messages: role 'assistant' → 'model' for Gemini
  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }))
  const chat = model.startChat({ history })
  const result = await chat.sendMessage(messages[messages.length - 1].content)
  return result.response.text()
}

// Groq provider
async function callGroq(messages, system, maxTokens) {
  const { default: Groq } = await import('groq-sdk')
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const allMsgs = system
    ? [{ role: 'system', content: system }, ...messages]
    : messages
  const res = await client.chat.completions.create({
    model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
    messages: allMsgs,
    max_tokens: maxTokens
  })
  return res.choices[0].message.content
}

// POST /api/ai  ← frontend calls this
app.post('/api/ai', async (req, res) => {
  const { messages, system, max_tokens = 1200 } = req.body
  const provider = process.env.AI_PROVIDER || 'gemini'
  try {
    let text
    if (provider === 'gemini') text = await callGemini(messages, system, max_tokens)
    else if (provider === 'groq') text = await callGroq(messages, system, max_tokens)
    else throw new Error('Unknown AI_PROVIDER: ' + provider)
    // Return in standard envelope
    res.json({ content: [{ type: 'text', text }], provider, model: process.env.AI_MODEL })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
```

### `package.json` (root)
```json
{
  "name": "gst-shield-india",
  "version": "3.0.0",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "build": "cd client && npm run build",
    "setup": "npm install && cd client && npm install && npm run build"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "@google/generative-ai": "^0.21.0",
    "groq-sdk": "^0.7.0"
  }
}
```

---

## FRONTEND

### `client/package.json`
```json
{
  "name": "gst-shield-client",
  "private": true,
  "version": "3.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 5173",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "jsqr": "^1.4.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.0"
  }
}
```

### `client/vite.config.js`
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true }
    }
  },
  build: { outDir: 'dist' }
})
```

### `client/index.html`
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GST Shield India</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=DM+Serif+Display&family=Source+Code+Pro:wght@400;500&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.2.0/tabler-icons.min.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

---

## CSS DESIGN SYSTEM — `client/src/index.css`

Use this exact color palette and design system:

```css
:root {
  --navy-900: #0a1628;
  --navy-800: #0f2244;
  --navy-700: #1a3a6c;
  --navy-600: #2d4a7a;
  --navy-100: #e6eef7;
  --gold-600: #c8922a;
  --gold-400: #e0ac50;
  --gold-100: #fef3dc;
  --success-800: #155e3a;
  --success-600: #1a7a4c;
  --success-100: #e8f5ee;
  --warning-800: #7a4f00;
  --warning-100: #fff8e6;
  --danger-800: #8b1a1a;
  --danger-100: #fdecea;
  --info-800: #0d4a8c;
  --info-100: #e3f0fd;
  --text-primary: #1a202c;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
  --bg-page: #f0f4f8;
  --bg-white: #ffffff;
  --bg-surface: #f8fafc;
  --border: #e2e8f0;
  --border-strong: #cbd5e1;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-display: 'DM Serif Display', Georgia, serif;
  --font-mono: 'Source Code Pro', monospace;
  --shadow-sm: 0 1px 3px rgba(0,0,0,.08);
  --shadow-md: 0 4px 12px rgba(0,0,0,.1);
}

/* Reset + body */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: var(--font-sans);
  background: var(--bg-page);
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

/* Inputs */
input, select, textarea {
  font-family: var(--font-sans);
  font-size: 13px;
  background: var(--bg-white);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  width: 100%;
  color: var(--text-primary);
}
input:focus, select:focus, textarea:focus {
  border-color: var(--navy-600);
  box-shadow: 0 0 0 3px rgba(45,74,122,0.12);
}

/* Buttons */
button { font-family: var(--font-sans); cursor: pointer; transition: all 0.15s; border: none; outline: none; }
button:disabled { opacity: 0.5; cursor: not-allowed; }

/* Animations */
@keyframes spin    { to { transform: rotate(360deg); } }
@keyframes fadeIn  { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.spin     { animation: spin 0.9s linear infinite; display: inline-block; }
.fade-in  { animation: fadeIn 0.3s ease forwards; }

/* Utility classes */
.card {
  background: var(--bg-white);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
  box-shadow: var(--shadow-sm);
}
.badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: var(--radius-sm); }
.badge-success { background: var(--success-100); color: var(--success-800); }
.badge-warning  { background: var(--warning-100); color: var(--warning-800); }
.badge-info     { background: var(--info-100);    color: var(--info-800); }
.badge-danger   { background: var(--danger-100);  color: var(--danger-800); }

/* Tables */
.data-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.data-table th { background: var(--bg-surface); color: var(--text-secondary); font-weight: 600; font-size: 11px; padding: 8px 10px; border-bottom: 1px solid var(--border); text-align: left; white-space: nowrap; }
.data-table td { padding: 8px 10px; border-bottom: 1px solid var(--border); vertical-align: top; }

/* Upload zone */
.upload-zone {
  border: 2px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  padding: 2rem 1.5rem;
  text-align: center;
  cursor: pointer;
  background: var(--bg-surface);
  transition: all 0.2s;
}
.upload-zone:hover { border-color: var(--navy-600); background: var(--navy-100); }

/* Grid layouts */
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; }

/* Chat bubbles */
.bubble-user { background: var(--navy-800); color: white; }
.bubble-bot  { background: var(--bg-surface); border: 1px solid var(--border); color: var(--text-primary); }

/* MOBILE RESPONSIVE */
@media (max-width: 768px) {
  .grid-2, .grid-4 { grid-template-columns: 1fr; }
  .card { padding: 1rem; }
  .hide-mobile { display: none !important; }
}

@media (max-width: 480px) {
  body { font-size: 13px; }
}

/* Scrollbar */
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 3px; }
```

---

## COMPONENT SPECIFICATIONS

---

### `client/src/utils/api.js`

```javascript
// Calls POST /api/ai on the Express backend
export async function callAI(messages, system = '', maxTokens = 1200) {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, system, max_tokens: maxTokens })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Server error ${res.status}`)
  }
  const data = await res.json()
  return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n')
}

export async function askAI(userMessage, system = '') {
  return callAI([{ role: 'user', content: userMessage }], system)
}
```

---

### `client/src/data/demoData.js`

Store all demo data here. Include:

#### DEMO_PRODUCT object
```javascript
export const DEMO_PRODUCT = {
  gtin: '8901234567890',
  productName: 'Himalaya Ashwagandha Wellness Tablets (60 tablets)',
  brand: 'Himalaya Drug Company',
  manufacturer: 'The Himalaya Drug Company Pvt. Ltd.',
  manufacturingAddress: 'Makali, Bengaluru – 562162, Karnataka, India',
  batchNumber: 'BT-2024-HW-4521',
  serialNumber: 'SN-HD-20240315-001',
  mfgDate: '15-03-2024',
  expiryDate: '14-03-2026',
  hsn: '30049099',
  gs1Status: 'VERIFIED',
  bisLicenseNo: 'CM/L-4521098',
  fssaiLicenseNo: '10019011004518',
  gstinMfr: '29AABCH1234F1ZP',
  certifications: ['GS1 India Registered', 'BIS Mark Certified', 'FSSAI Licensed', 'ISO 9001:2015', 'WHO-GMP Certified'],
  counterfeitRisk: 'LOW',
  authentic: true
}
```

#### DEMO_INVOICE object
```javascript
export const DEMO_INVOICE = {
  irn: '86d7fb40cd9dc34a0df16f586f627bc9d6f9c9ede3e4b213fc3f0d56f33c0a89',
  ackNo: '15100044593',
  ackDate: '30-06-2024 11:19:00',
  category: 'B2B',
  documentNo: 'DOC-1234/GSTIN',
  documentType: 'Invoice',
  documentDate: '30-06-2024',
  seller: {
    gstin: '29AABCS1429B1Z1',
    name: 'Sai Lakshmi Industries Pvt Ltd',
    address: 'Lakshmi Paradise #147, Kempegowda Road, 560009 Karnataka'
  },
  buyer: {
    gstin: '02SVJ70791Z1',
    name: 'Mehak General Store',
    address: '#931, 1st floor, 2nd Cross, Shantivana, Kodigehalli, Bangalore – 176001, HP'
  },
  items: [
    { slNo: 1, desc: 'Salt (Including Table Salt and Denatured Salt) and Pure Sodium Chloride', hsn: '25010020', qty: 1000, unit: 'PAC', unitPrice: 778.9, discount: 100, taxableAmt: 778800, cgst: '0.10%', sgst: '0.10%', cess: '3.00+100', other: 200, total: 803242.80 },
    { slNo: 2, desc: 'Natural Graphite — In Powder or In Flakes; Graphite, Crystalline', hsn: '25041010', qty: 500, unit: 'BOX', unitPrice: 99.99, discount: 50, taxableAmt: 49945, cgst: '0.25%', sgst: '0.25%', cess: '5.00+100', other: 200, total: 52867.11 },
    { slNo: 3, desc: 'Oil-Cake and Other Solid Residues, Whether or Not Ground or in Form of Pellets', hsn: '23069015', qty: 250, unit: 'CAN', unitPrice: 450, discount: 40, taxableAmt: 112460, cgst: '0.50%', sgst: '0.50%', cess: '11.00+100', other: 200, total: 125692.90 }
  ],
  taxableAmt: 941205,
  cgstAmt: 0, sgstAmt: 0,
  igstAmt: 1465.96,
  cessAmt: 38531.85,
  roundOff: 0.19,
  totalInvAmt: 981803.00,
  isValid: true
}
```

#### COMPLAINT_ROUTES map
```javascript
export const COMPLAINT_ROUTES = {
  'GST Fraud':               { authority: 'Department of Consumer Affairs', email: 'dirpg-ca@nic.in' },
  'Fake GSTIN':              { authority: 'Central Consumer Protection Authority (CCPA)', email: 'com-ccpa@gov.in' },
  'Double Billing':          { authority: 'Department of Consumer Affairs', email: 'dirpg-ca@nic.in' },
  'Overcharging':            { authority: 'National Consumer Helpline (NCH)', email: 'nch-ca@gov.in' },
  'Counterfeit Product':     { authority: 'National Consumer Helpline (NCH)', email: 'nch-ca@gov.in' },
  'Tax Evasion':             { authority: 'Central Consumer Protection Authority (CCPA)', email: 'com-ccpa@gov.in' },
  'Malpractice':             { authority: 'National Consumer Helpline (NCH)', email: 'nch-ca@gov.in' },
  'Misleading Advertisement':{ authority: 'Central Consumer Protection Authority (CCPA)', email: 'com-ccpa@gov.in' }
}
```

#### GSTBOT_SYSTEM prompt
```javascript
export const GSTBOT_SYSTEM = `You are GSTBot, the official AI consumer assistant for GST Shield India — a Government of India platform under the Ministry of Finance.

Your expertise covers:
1. CGST Act 2017, SGST Act 2017, IGST Act 2017 — how each works, rate slabs (0%,5%,12%,18%,28%)
2. GST Invoice Rules — Rule 46 CGST Rules 2017: GSTIN, HSN/SAC codes, taxable value, CGST/SGST/IGST, place of supply, IRN
3. GSTIN structure — 15-character format validation, how to verify at gst.gov.in
4. e-Invoice System — IRN, IRP (Invoice Registration Portal), NIC, Ack number
5. Consumer Protection Act 2019 — consumer rights, CCPA, district/state/national consumer courts, e-Daakhil
6. BIS Act 2016 — mandatory certification products, CM/L license format, ISI mark
7. FSSAI Regulations — license types (Central/State/Registration), 14-digit format, FoSCoS portal
8. GS1 India — GTIN/barcode structure, GEPIR database, licensed members
9. Anti-profiteering — Section 171 CGST Act 2017
10. Complaint channels — NCH 1915, WhatsApp 8800001915, consumerhelpline.gov.in

RULES:
- Always cite the specific Section/Rule/Act
- Give step-by-step guidance when someone reports fraud
- Respond in whatever language the user writes in (Hindi, Tamil, Telugu, Kannada, etc.)
- Be concise, clear, and actionable
- Never make up GST rates — cite real ones or say you are unsure`
```

---

### `client/src/components/Shared.jsx`

Build these reusable components:

```
SectorHeader({ num, title, subtitle, icon })
  - Large header with numbered sector badge, gold icon on navy background, title + subtitle

FieldLabel({ children })
  - Uppercase small-caps section label with bottom border

DetailRow({ label, value, mono })
  - Two-column label/value row with bottom border
  - mono=true applies font-mono to value

NavyBtn({ children, onClick, disabled, style })
  - Navy (#0f2244) background button, white text

GhostBtn({ children, onClick, style })
  - Outlined button, white background

GreenBtn({ children, onClick, disabled, style })
  - Success green button (#1a7a4c) background

StatusBanner({ type, icon, title, subtitle, badge })
  - Full-width status bar with colored background
  - type: 'success' | 'warning' | 'danger' | 'info'
  - Shows icon, title, subtitle, optional badge on right

ScanAnimation({ title, subtitle, steps })
  - Centered loading card with spinning icon
  - List of animated scan steps below

FormField({ label, required, children })
  - Wraps an input/select/textarea with a label above it
```

---

### `client/src/components/CameraScanner.jsx`

This is the most important new component. Build it with these exact specifications:

**Props**: `mode` ('qr' | 'photo'), `onResult`, `onClose`, `title`

**Behavior**:
- `mode="qr"` → streams video, continuously decodes QR codes using `jsqr` in a `requestAnimationFrame` loop. When code detected → flash green → call `onResult({ type: 'qr', data: string })`
- `mode="photo"` → streams live video, shows a gold-outlined document frame overlay, user taps a white circular Capture button → shows photo preview → user confirms with "Use this photo" or retakes → calls `onResult({ type: 'photo', blob: Blob, dataUrl: string })`

**Camera setup**:
```javascript
const stream = await navigator.mediaDevices.getUserMedia({
  video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
  audio: false
})
video.srcObject = stream
await video.play()
```

**QR decode loop**:
```javascript
import jsQR from 'jsqr'

// in requestAnimationFrame loop:
canvas.width = video.videoWidth
canvas.height = video.videoHeight
ctx.drawImage(video, 0, 0)
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
const code = jsQR(imageData.data, canvas.width, canvas.height, { inversionAttempts: 'dontInvert' })
if (code?.data) { /* stop stream, call onResult */ }
```

**UI Layout** (full-screen fixed overlay, z-index: 2000):
```
┌─────────────────────────────────┐
│  [icon] Title        [× close]  │  ← navy header bar
├─────────────────────────────────┤
│                                 │
│      Live camera video          │
│                                 │
│   QR mode:  animated scan box   │
│   (4 gold corner brackets +     │
│    sweeping gold scan line)     │
│                                 │
│   Photo mode: gold dashed       │
│   document frame overlay        │
│                                 │
├─────────────────────────────────┤
│  [Capture]  [Flip]  [Cancel]   │  ← dark controls bar
└─────────────────────────────────┘
```

**Features**:
- Animated gold scan line sweeping up/down in QR mode
- Green flash + checkmark when QR detected
- "Flip Camera" button (show only when `enumerateDevices` finds >1 video input)
- Error state when camera permission denied — shows icon + message + Retry button
- Photo preview after capture with "Use this photo" and "Retake" buttons
- Cleans up stream on unmount (`useEffect` cleanup)
- Works on iOS Safari (uses `playsInline`, `muted`, `autoPlay` on video)

---

### `client/src/App.jsx`

Navigation shell with 5 routes: home, s1, s2, s3, s4.

**Top bar** (navy-900 background):
- Left: Gold shield icon + "GST Shield India" title + "Government GST Verification & Fraud Detection System" subtitle
- Right: Green "● LIVE SYSTEM" badge + "Ministry of Finance, GoI" text

**Navigation bar** (navy-700 background, horizontally scrollable):
- 5 tabs: Dashboard (ti-home), Product Verify (ti-qrcode), Invoice Verify (ti-file-invoice), File Complaint (ti-alert-triangle), AI Assistant (ti-robot)
- Active tab: gold background, gold bottom border
- Inactive: muted blue text, transparent

**Page area**: `max-width: 1200px`, centered, padding 1.5rem

**Footer**: "© 2024 GST Shield India — Government of India" + links to gst.gov.in, consumerhelpline.gov.in, edaakhil.nic.in

**Mobile nav**: On screens < 640px, show only icon (hide label text) so all 5 tabs fit without horizontal scroll

---

### `client/src/components/Dashboard.jsx`

**Hero section** (dark navy gradient card):
- Emblem: gold shield icon + "GOVERNMENT OF INDIA — MINISTRY OF FINANCE" in gold caps
- Heading: "GST Shield India" in DM Serif Display font, white
- Subtext: description of the platform
- Tag pills: CGST Act 2017, SGST Act 2017, Consumer Protection Act 2019, BIS Act 2016, FSSAI Regulations

**Stats row** (4 cards):
- 24.6L+ Products Verified (ti-package)
- 12,847 Fake GSTINs Detected (ti-alert-circle)
- 96.4% Complaints Resolved (ti-check)
- 28+ States Covered (ti-map)

**Sector cards** (2×2 grid, or auto-fit on mobile):
Each card shows: sector number badge, icon, title, description, live stat, left border colored by type
- Sector 01: info color (blue)
- Sector 02: success color (green)
- Sector 03: warning color (amber)
- Sector 04: danger color (red)
- Cards are clickable — call `setNav(sectorId)` on click

**Government links row** (navy-100 background card):
Quick links to: GST Portal, Consumer Helpline, GS1 India, BIS Portal, FSSAI, e-Daakhil

---

### `client/src/components/Sector1.jsx` — Product QR Verification

**Phase machine**: `'upload'` → `'scanning'` → `'report'`

**Upload phase UI**:

Left card — "Scan product QR / barcode":
1. **PRIMARY button** (navy with gold border, tall): Camera icon (ti-camera, 32px, gold) + "Scan Live with Camera" + subtitle + feature badges (📱 Mobile, 💻 Webcam, 🔍 Auto-detect). On click: `setCameraOpen(true)`
2. Divider: "— or upload a saved image —"
3. **Upload zone**: Dashed border, ti-photo-up icon, "Upload QR / barcode image", file input (accept="image/*"), triggers `startScan()` on file select
4. Divider: "— or —"
5. **Demo button**: "Try demo scan" (navy-600, full width)
6. **Privacy note** (info-100 box): "Live scanning is fully in-browser. Camera data never leaves your device."

Right card — "Verification standards":
- 4 rows: GS1 GTIN barcodes, BIS certification mark, FSSAI license, Brand auth QR
- Each row: colored icon square + bold label + description text
- Mobile tip at bottom (success-100 box): "Tap Scan Live and point rear camera at product barcode. Auto-detects."

**CameraScanner** (rendered when `cameraOpen=true`):
- `mode="qr"`
- `onResult`: save QR data to state, close camera, `startScan()`
- `onClose`: close camera

**Scanning phase**: Show `ScanAnimation` with steps:
- "QR payload received: {qrData first 36 chars}…" (if live scanned)
- "Validating GTIN against GS1 India GEPIR database"
- "Checking BIS certification status (CM/L license)"
- "Querying FSSAI FoSCoS for license validity"
- "Cross-checking manufacturer GSTIN on GST portal"
- Delay: 3200ms then go to `'report'`

**Report phase**:
- `StatusBanner` type="success": "Authentic product — verified" + all registry checks
- Download PDF button (top right)
- If live-scanned: show QR payload box (navy-100)
- 2-column grid: Product information | Batch & certification
- Certifications row: green pills with checkmarks
- Audit trail: 4 rows (GS1, BIS, FSSAI, GST Portal) each with PASS badge

---

### `client/src/components/Sector2.jsx` — Invoice & GST Verification

**Phase machine**: `'upload'` → `'scanning'` → `'report'`

**Upload phase UI**:

Left card — "Scan invoice / bill":
1. **PRIMARY button** (navy with gold border, tall): Camera icon + "Scan Invoice with Camera" + subtitle + badges (📱 Mobile, 💻 Webcam, 📄 Any bill format). On click: `setCameraOpen(true)`
2. Divider: "— or upload a saved copy —"
3. **Upload zone**: ti-file-upload icon, "Upload invoice image or PDF", accepts image/*,.pdf
4. Divider, Demo button (navy-600)
5. If photo was captured: show thumbnail preview

Right card — "What gets validated":
- 5 rows: Seller & Buyer GSTIN, HSN/SAC codes, CGST/SGST/IGST amounts, IRN & Ack number, Place of supply
- Each row: green checkmark + label + description
- Mobile tip at bottom (success-100 box)

**CameraScanner** (rendered when `cameraOpen=true`):
- `mode="photo"` title="Live Invoice Scanner"
- `onResult`: save `capturedImg` (dataUrl), close camera, `startScan()`

**Scanning phase**: `ScanAnimation` with OCR steps. Delay 3400ms.

**Report phase**:
- `StatusBanner` type="success"
- Tab switcher: "Extracted data" | "Approved invoice"
- Download button (top right)
- If photo captured + in data view: show captured image thumbnail

**Extracted data tab**:
- 2-column grid: e-Invoice details | Seller & Buyer info
- Full-width goods table with all columns

**Approved invoice tab** (government format):
- Styled to look like an official Indian e-invoice document
- Header: shield icon + "Government of India / e-Invoice System — GST Shield Verified" + green "✓ GOVERNMENT VERIFIED INVOICE" badge + QR placeholder box (top right)
- IRN/Ack bar (surface background)
- Transaction details row (4 columns)
- Party details (seller | buyer) in 2 columns with borders
- Goods table (navy header, alternating rows)
- Totals footer row (navy background for total cell)
- Footer: "Generated by: GST Shield" | barcode placeholder | "Digitally verified by GST Shield"

---

### `client/src/components/Sector3.jsx` — AI Complaint Filing

**Step machine**: `'form'` → `'formatting'` → `'preview'` → `'sent'`

**AI system prompt for complaint formatting**:
```
You are a government complaint formatting officer for India. Convert the user's complaint into a formal government complaint letter addressed to Indian regulatory authorities.

Include:
1. Reference number and date at top
2. Proper addressing (To: [Authority Name], Government of India, Email: [email])
3. Clear subject line
4. Formal salutation
5. Structured body: complainant intro, organization details, factual malpractice description with dates/amounts
6. Specific relief sought
7. Cite Consumer Protection Act 2019 and/or CGST Act 2017 as applicable
8. Formal closing with complainant details

Return ONLY the formatted letter. No extra commentary.
```

**Form step**:

Left card (2/3 width) — complaint form:
- "YOUR DETAILS" section: name*, phone*, email, city (2-column grid)
- "ORGANIZATION DETAILS": shop name*, address, GSTIN, complaint type (select), invoice no., invoice date (2-column grid)
- Complaint description textarea (6 rows) with hint: "Include dates, amounts, product names for a stronger complaint"
- Submit button: "Format & review with AI" (navy, disabled until name + description + shopName filled)

Complaint types dropdown: GST Fraud, Fake GSTIN, Double Billing, Overcharging, Counterfeit Product, Tax Evasion, Malpractice, Misleading Advertisement

Right card (1/3 width):
- "Auto-routing guide" heading
- Highlighted box showing current route (authority + email) based on selected complaint type
- Table of all routes: type → authority email
- Warning box: reference number (random CCPA-XXXXXXX) + "Track at consumerhelpline.gov.in or call 1915"

**Routing logic** (auto-detect from complaint type):
```
GST Fraud, Double Billing  → dirpg-ca@nic.in (Dept. of Consumer Affairs)
Fake GSTIN, Tax Evasion, Misleading Advertisement → com-ccpa@gov.in (CCPA)
Overcharging, Counterfeit Product, Malpractice → nch-ca@gov.in (NCH)
```

**Formatting step**: Show `ScanAnimation` — "AI is formatting your complaint…"

**Preview step**:
- Left: formatted letter in monospace pre-wrapped box + Edit / Send / Download buttons
- Right: complaint summary (DetailRows) + tracking info box

**Sent step**:
- Centered success card: green circle checkmark, "Complaint filed successfully", summary, "File another complaint" button

**Fallback** (when AI fails): Generate a template letter from form fields — never show an empty state.

---

### `client/src/components/Sector4.jsx` — AI Chatbot (GSTBot)

**Layout**: Two-column — chat panel (flex 1) | sidebar (260px fixed)

**Chat panel**:
- Header: gold robot avatar + "GSTBot" + "AI • GST & Consumer Law Expert" + green online dot + Clear button
- Messages list (scrollable, flex-grow, ref for auto-scroll)
- User messages: right-aligned, navy-800 background bubble
- Bot messages: left-aligned, bg-surface bubble with border
- Loading state: left-aligned bubble with spinning icon + "GSTBot is thinking…"
- Input row: multi-line textarea (rows=2) + send button (navy when active)
- Enter = send, Shift+Enter = newline
- Auto-scroll to bottom on new message

**Initial welcome message**:
```
Namaste! I'm GSTBot — your AI assistant for GST verification and consumer protection under Indian law.

I can help you with:
• GST rules — CGST, SGST, IGST, rates and exemptions
• Invoice requirements — what a valid GST invoice must contain
• GSTIN verification — how to check if a GSTIN is genuine
• Consumer rights — Protection Act 2019, complaint procedures
• Fraud identification — fake invoices, double billing, counterfeit goods
• Complaint filing — NCH, CCPA, Consumer Courts, e-Daakhil

Type your question or tap a quick question to get started.
```

**Sidebar**:
- "Quick questions" heading + 8 clickable question buttons (clicking fills input + sends)
- "GSTBot knowledge base" heading + list of 12 laws (CGST Act, SGST Act, Consumer Protection Act, BIS Act, FSSAI, Rule 46, Section 171, e-Invoice System, HSN/SAC, GS1 India, CCPA Regulations, Anti-profiteering)
- "Government helplines" card: NCH 1915, WhatsApp 8800001915, Toll-free 1800-11-4000

**Quick questions**:
1. What is the difference between CGST, SGST and IGST?
2. How do I verify if a GSTIN is real or fake?
3. What are my consumer rights if overcharged GST?
4. What mandatory fields must a GST invoice contain?
5. How do I identify a fraudulent or fake invoice?
6. What is an HSN code and how do I check the correct rate?
7. How do I file a complaint about GST fraud online?
8. What is the IRN / e-Invoice system on my bill?

**API call**: Use `callAI(allMessages, GSTBOT_SYSTEM)` from `utils/api.js`

---

## MOBILE RESPONSIVENESS REQUIREMENTS

Apply these responsive behaviors:

1. **Navigation bar**: On < 640px, hide button label text — show only icons. All 5 icons fit in one row.
2. **Grid layouts**: All 2-column grids become 1-column on < 768px.
3. **Sector3 form**: The 2fr/1fr layout becomes stacked (right card goes below left) on mobile.
4. **Sector4 chat**: The sidebar collapses on < 768px — show only chat panel full width.
5. **CameraScanner**: Already full-screen fixed overlay — works perfectly on mobile.
6. **Tables**: Add `overflow-x: auto` wrapper — horizontal scroll on small screens.
7. **Top bar**: Stack title and badges on very small screens.
8. **Buttons**: Minimum 44px height for touch targets on mobile.
9. **Input**: font-size 16px minimum on mobile to prevent iOS auto-zoom.
10. **Upload zones**: Full width on mobile.

---

## FULL USER FLOWS

### Sector 1 — User scans a product QR live on mobile
1. User opens app on phone → taps "Product Verify"
2. Taps "Scan Live with Camera" → browser requests camera permission
3. Rear camera opens with scanning animation and gold corner brackets
4. User points phone at product barcode → `jsQR` detects it automatically
5. Green flash + checkmark → camera closes
6. Scanning animation (3.2 seconds) → Verification Report appears
7. User sees: Product authentic, all certifications green
8. Taps "Download PDF report"

### Sector 2 — User photographs a paper invoice
1. User opens "Invoice Verify" → taps "Scan Invoice with Camera"
2. Rear camera opens with document frame overlay
3. User positions invoice under camera, taps circular Capture button
4. Photo preview shows → user taps "Use this photo"
5. Scanning animation → Extracted Data view appears
6. User switches to "Approved Invoice" tab → sees government-format verified copy
7. Taps "Download approved invoice"

### Sector 3 — User files a complaint
1. User opens "File Complaint"
2. Fills form: name, phone, shop name, description in plain language
3. Selects complaint type → routing destination auto-updates
4. Taps "Format & review with AI"
5. Gemini API converts description to formal letter
6. User reviews → taps "Send to Government Authority"
7. Success screen with reference number

### Sector 4 — User asks GSTBot
1. User opens "AI Assistant"
2. Types: "What is the GST rate on medicines?"
3. GSTBot responds citing CGST Act Schedule + rate
4. User asks follow-up: "My chemist charged 18% on paracetamol, can I complain?"
5. GSTBot gives step-by-step complaint guidance

---

## SETUP AND RUN COMMANDS

The README.md must include exactly these commands:

```bash
# 1. Install all dependencies
npm run setup
# (runs: npm install && cd client && npm install && npm run build)

# 2. Start server
npm start
# → Open http://localhost:3000

# For development (live reload):
# Terminal 1: node server.js
# Terminal 2: cd client && npm run dev
# → Open http://localhost:5173
```

---

## README.md SECTIONS

Write a comprehensive README.md with:

1. **Project Overview** — what it does, 4 sectors table
2. **API Keys Pre-configured** — Gemini key already set, Groq optional
3. **Quick Start** — 3 commands (cp .env.example .env, npm run setup, npm start)
4. **Live Camera Guide** — how to use QR scanning + photo capture on mobile
5. **Sector User Guide** — step-by-step for all 4 sectors
6. **Provider Switching** — how to switch between Gemini and Groq
7. **Troubleshooting** — camera permission, API errors, build issues
8. **Government Contacts** — NCH 1915, all emails, all portal links

---

## QUALITY REQUIREMENTS

- **No TypeScript** — pure JavaScript/JSX only
- **No external CSS frameworks** — only the CSS variables system described above
- **Zero console errors** in normal operation
- **Graceful error handling** — every API call has try/catch with user-visible fallback
- **Mobile-first** — test all layouts at 375px (iPhone) and 768px (tablet)
- **Camera cleanup** — always call `stream.getTracks().forEach(t => t.stop())` on unmount
- **AI fallback** — Sector 3 always generates a template letter even when API fails
- **No credentials in client code** — API keys only in `.env`, only accessed server-side
- All Tabler icon class names use format `ti ti-icon-name` (two classes)
- All animations use CSS keyframes defined in index.css

---

## WHAT TO BUILD — SUMMARY CHECKLIST

- [ ] `server.js` — Express + Gemini + Groq routing
- [ ] `package.json` (root) — server deps
- [ ] `.env` — pre-configured with Gemini key
- [ ] `.env.example`
- [ ] `.gitignore`
- [ ] `README.md` — complete working manual
- [ ] `client/package.json` — React + jsqr
- [ ] `client/vite.config.js` — with /api proxy
- [ ] `client/index.html` — with Tabler Icons + Google Fonts CDN
- [ ] `client/src/main.jsx`
- [ ] `client/src/App.jsx` — nav shell + mobile responsive
- [ ] `client/src/index.css` — full design system + mobile CSS
- [ ] `client/src/utils/api.js`
- [ ] `client/src/data/demoData.js`
- [ ] `client/src/components/Shared.jsx`
- [ ] `client/src/components/CameraScanner.jsx` ← live QR + photo
- [ ] `client/src/components/Dashboard.jsx`
- [ ] `client/src/components/Sector1.jsx` ← live camera QR
- [ ] `client/src/components/Sector2.jsx` ← live camera photo
- [ ] `client/src/components/Sector3.jsx` ← AI complaint
- [ ] `client/src/components/Sector4.jsx` ← GSTBot

Build everything above. The result must run with `npm run setup && npm start` and open at http://localhost:3000 fully functional.
