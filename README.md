# GST Shield India v3.0 — Python Backend

## Quick Start (5 commands)

# 1. Create virtual environment
python -m venv venv

# 2. Activate (Mac/Linux)
source venv/bin/activate
# Activate (Windows)
venv\Scripts\activate

# 3. Install Python + React dependencies
pip install -r requirements.txt
cd client && npm install && npm run build && cd ..

# 4. Run
python main.py

# 5. Open browser
http://localhost:3000

## API Keys
Both keys are already configured in .env:
- Gemini: AIzaSyBr6uqb1vTmTNenjbHcOPTQGcBaVH08OvA (pre-set)
- Groq: Add your key from console.groq.com (optional)

## Switch to Groq
Edit .env:
  AI_PROVIDER=groq
  GROQ_API_KEY=gsk_your_key
Restart: python main.py

## Development mode (live reload)
Terminal 1: python main.py
Terminal 2: cd client && npm run dev
Open: http://localhost:5173

## Live Camera — How to use
SECTOR 1 (QR):
  Tap "Scan Live with Camera" → allow camera → point at barcode → auto-detects

SECTOR 2 (Invoice):
  Tap "Scan Invoice with Camera" → allow camera → position invoice flat → tap Capture → confirm

Works on mobile browsers. Use rear camera for best results.

## Health check
http://localhost:3000/api/health

## Troubleshooting
Camera denied: allow camera in browser settings, refresh, retry
Port in use: set PORT=4000 in .env
Module not found: pip install -r requirements.txt (with venv active)
Build not found: cd client && npm run build
Gemini error: verify GEMINI_API_KEY in .env

## Government Contacts
NCH Helpline: 1915
WhatsApp: 8800001915
Toll-free: 1800-11-4000
NCH email: nch-ca@gov.in
CCPA email: com-ccpa@gov.in
Consumer portal: consumerhelpline.gov.in
