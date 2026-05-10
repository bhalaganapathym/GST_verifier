import os
import base64
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv
import google.generativeai as genai
from groq import Groq

load_dotenv()

app = FastAPI(title="GST Shield India")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Helpers ──────────────────────────────────────────────────────────────────

def get_gemini_model(model_name: str = None):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not set in .env")
    genai.configure(api_key=api_key)
    return genai.GenerativeModel(model_name or os.getenv("AI_MODEL", "gemini-flash-latest"))

def decode_image(image_base64: str):
    """Returns (mime_type, raw_bytes) from a data-URL or plain base64 string."""
    b64 = image_base64
    mime = "image/jpeg"
    if "," in b64:
        header, b64 = b64.split(",", 1)
        mime = header.split(":")[1].split(";")[0]
    return mime, base64.b64decode(b64)

# ─── Request Models ───────────────────────────────────────────────────────────

class Message(BaseModel):
    role: str
    content: str

class AIRequest(BaseModel):
    messages: List[Message]
    system: Optional[str] = ""
    max_tokens: Optional[int] = 1500

class ImageRequest(BaseModel):
    image_base64: str

# ─── Chat / Complaint / Bot endpoint ──────────────────────────────────────────

@app.post("/api/ai")
async def ai_endpoint(req: AIRequest):
    provider = os.getenv("AI_PROVIDER", "gemini")
    try:
        if provider == "groq":
            api_key = os.getenv("GROQ_API_KEY")
            if not api_key:
                raise HTTPException(status_code=500, detail="GROQ_API_KEY not set")
            client = Groq(api_key=api_key)
            msgs = []
            if req.system:
                msgs.append({"role": "system", "content": req.system})
            for m in req.messages:
                msgs.append({"role": m.role, "content": m.content})
            model_name = os.getenv("AI_MODEL", "llama-3.3-70b-versatile")
            resp = client.chat.completions.create(
                messages=msgs, model=model_name, max_tokens=req.max_tokens
            )
            text = resp.choices[0].message.content
        else:
            model = get_gemini_model()
            # Build history (all but last message)
            history = []
            for m in req.messages[:-1]:
                history.append({
                    "role": "model" if m.role == "assistant" else "user",
                    "parts": [m.content]
                })
            if req.system:
                model = genai.GenerativeModel(
                    model_name=os.getenv("AI_MODEL", "gemini-flash-latest"),
                    system_instruction=req.system
                )
            chat = model.start_chat(history=history)
            response = chat.send_message(req.messages[-1].content)
            text = response.text

        return {"content": [{"type": "text", "text": text}]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── Invoice OCR endpoint ─────────────────────────────────────────────────────

INVOICE_PROMPT = '''You are an expert OCR and GST document parser.
Analyze this image carefully.

STEP 1: Determine if this is an invoice, bill, receipt, or purchase order.
- If it is NOT, reply with exactly: NOT_AN_INVOICE
- If it IS, continue to step 2.

STEP 2: Extract all data and return ONLY valid JSON with this exact structure (no markdown, no extra text):
{
  "irn": "IRN string if present, else null",
  "ackNo": "Acknowledgement number if present, else null",
  "category": "B2B or B2C",
  "documentNo": "invoice/bill number",
  "documentType": "Invoice",
  "documentDate": "DD-MM-YYYY",
  "seller": {
    "gstin": "GSTIN if present, else null",
    "name": "seller company name",
    "address": "seller address"
  },
  "buyer": {
    "gstin": "GSTIN if present, else null",
    "name": "buyer name or company",
    "address": "buyer address"
  },
  "items": [
    {
      "slNo": 1,
      "desc": "item description",
      "hsn": "HSN/SAC code if present, else null",
      "qty": 1,
      "unit": "unit of measure",
      "unitPrice": 100.00,
      "taxableAmt": 100.00,
      "cgst": "CGST % or amount string",
      "sgst": "SGST % or amount string",
      "igst": "IGST % or amount string",
      "total": 118.00
    }
  ],
  "totalTaxableAmt": 100.00,
  "totalTax": 18.00,
  "totalInvAmt": 118.00,
  "placeOfSupply": "state name if present, else null",
  "paymentTerms": "payment terms if present, else null"
}

CRITICAL: Return ONLY valid JSON. No explanation. No markdown code blocks.'''

@app.post("/api/ocr")
async def ocr_endpoint(req: ImageRequest):
    model = get_gemini_model()
    try:
        mime, img_bytes = decode_image(req.image_base64)
        response = model.generate_content([
            {"mime_type": mime, "data": img_bytes},
            INVOICE_PROMPT
        ])
        result = response.text.strip()
        # Strip accidental markdown code fences
        if result.startswith("```"):
            result = result.split("```")[1]
            if result.startswith("json"):
                result = result[4:]
        return {"result": result.strip()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── Product Scan endpoint ────────────────────────────────────────────────────

PRODUCT_PROMPT = '''You are a product packaging and barcode analysis expert.
Analyze this image carefully.

STEP 1: Determine if this image contains a product, product packaging, a barcode, or a QR code.
- If it is NONE of the above, reply with exactly: NOT_A_PRODUCT
- If it IS, continue to step 2.

STEP 2: Extract only what you can ACTUALLY READ from the image. 
IMPORTANT RULES:
- DO NOT invent or hallucinate product names, batch numbers, or any data not visible in the image.
- If a field is not visible in the image, set it to null — do not guess.
- If only a barcode is visible with no surrounding text, extract the barcode number and set all other text fields to null.

Return ONLY valid JSON with this structure (no markdown, no extra text):
{
  "gtin": "barcode number string if readable, else null",
  "productName": "product name from label text, else null",
  "brand": "brand name from label, else null",
  "manufacturer": "manufacturer name from label, else null",
  "manufacturingAddress": "address from label, else null",
  "batchNumber": "batch number from label, else null",
  "serialNumber": "serial number from label, else null",
  "mfgDate": "manufacturing date DD-MM-YYYY from label, else null",
  "expiryDate": "expiry date DD-MM-YYYY from label, else null",
  "hsn": "HSN code from label, else null",
  "fssaiLicenseNo": "FSSAI license number from label, else null",
  "bisLicenseNo": "BIS/ISI license number from label, else null",
  "gstinMfr": "GSTIN from label, else null",
  "netWeight": "net weight/volume from label, else null",
  "mrp": "MRP from label, else null",
  "certifications": ["list of certifications visible on label"]
}

CRITICAL: Return ONLY valid JSON. No explanation. No markdown.'''

@app.post("/api/product_scan")
async def product_scan_endpoint(req: ImageRequest):
    model = get_gemini_model()
    try:
        mime, img_bytes = decode_image(req.image_base64)
        response = model.generate_content([
            {"mime_type": mime, "data": img_bytes},
            PRODUCT_PROMPT
        ])
        result = response.text.strip()
        if result.startswith("```"):
            result = result.split("```")[1]
            if result.startswith("json"):
                result = result[4:]
        return {"result": result.strip()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── GTIN / Barcode Knowledge Lookup ─────────────────────────────────────────

class GTINRequest(BaseModel):
    gtin: str

GTIN_PROMPT_TEMPLATE = '''You are a global product registry expert with knowledge of GS1 barcodes, UPC codes, EAN-13 codes, and QR code payloads.

Given this barcode / QR code value: {gtin}

1. Identify what product or company this belongs to.
2. Decode the GS1 company prefix if it is a numeric barcode (first 3–9 digits identify the brand owner / manufacturer).
3. If this is a well-known product barcode, return real manufacturing details from your knowledge.
4. If this is a QR code payload (URL, text, vCard, etc.), parse it and extract all useful fields.

Return ONLY valid JSON in this exact structure (no markdown, no extra text):
{{
  "gtin": "{gtin}",
  "barcodeType": "EAN-13 | UPC-A | QR Code | Code 128 | other",
  "gs1CompanyPrefix": "first 7-9 digits if EAN/UPC, else null",
  "countryOfOrigin": "country name from GS1 prefix, e.g. India for 890, USA for 0–13, null if unknown",
  "productName": "product name if identifiable, else null",
  "brand": "brand name if identifiable, else null",
  "manufacturer": "full legal manufacturer name if identifiable, else null",
  "manufacturingAddress": "registered manufacturing address if identifiable, else null",
  "category": "product category e.g. Food, Electronics, Pharma, etc.",
  "netWeight": "net weight/volume if known, else null",
  "mrp": "MRP if known, else null",
  "hsn": "likely HSN code for this product category under Indian GST, else null",
  "fssaiLicenseNo": "if known, else null",
  "bisLicenseNo": "if known, else null",
  "gstinMfr": "if known, else null",
  "certifications": ["any known certifications for this product"],
  "qrPayload": "if QR code, the decoded payload string, else null",
  "notes": "any additional useful information about this barcode or product"
}}

IMPORTANT: Only state facts you are confident about. Set unknown fields to null rather than guessing.
If this is a QR code containing a URL or structured data, parse and include those details in the relevant fields.'''

@app.post("/api/gtin_lookup")
async def gtin_lookup_endpoint(req: GTINRequest):
    model = get_gemini_model()
    try:
        prompt = GTIN_PROMPT_TEMPLATE.format(gtin=req.gtin)
        response = model.generate_content(prompt)
        result = response.text.strip()
        if result.startswith("```"):
            result = result.split("```")[1]
            if result.startswith("json"):
                result = result[4:]
        return {"result": result.strip()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── Health check ─────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health_endpoint():
    provider = os.getenv("AI_PROVIDER", "gemini")
    model = os.getenv("AI_MODEL", "gemini-flash-latest" if provider == "gemini" else "llama-3.3-70b-versatile")
    return {
        "status": "ok",
        "provider": provider,
        "model": model,
        "apiKeys": {
            "gemini": bool(os.getenv("GEMINI_API_KEY")),
            "groq": bool(os.getenv("GROQ_API_KEY")),
        }
    }

# ─── Serve React frontend ──────────────────────────────────────────────────────

if os.path.exists("client/dist"):
    app.mount("/", StaticFiles(directory="client/dist", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 3000))
    print(f"\nGST Shield India running at http://localhost:{port}\n")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
