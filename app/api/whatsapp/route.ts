// app/api/whatsapp/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { handleWhatsAppWebhook } from "@/lib/whatsapp/ingest";

export const runtime = "nodejs";

/**
 * GET /api/whatsapp
 *
 * Used by Meta (WhatsApp Cloud API) to VERIFY the webhook.
 * It sends:
 *  - hub.mode
 *  - hub.verify_token
 *  - hub.challenge
 *
 * If the verify_token matches our env var WHATSAPP_VERIFY_TOKEN,
 * we must echo back the challenge.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!mode || !token) {
    return new NextResponse("Missing mode or token", { status: 400 });
  }

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    // Successful verification
    return new NextResponse(challenge ?? "", {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }

  // Verification failed
  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * POST /api/whatsapp
 *
 * WhatsApp sends message notifications here.
 * We:
 *  1. Verify the X-Hub-Signature-256 using WHATSAPP_APP_SECRET
 *  2. Parse the body for messages
 *  3. Hand off to the ingest pipeline to store/process
 */
export async function POST(req: NextRequest) {
  const APP_SECRET = process.env.WHATSAPP_APP_SECRET;

  // Read raw body as text so we can compute HMAC for signature verification.
  const rawBody = await req.text();

  // Validate signature if app secret is configured
  if (APP_SECRET) {
    const signatureHeader = req.headers.get("x-hub-signature-256");
    if (!signatureHeader) {
      console.warn("[WhatsApp] Missing x-hub-signature-256 header");
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const expectedSignature = signPayload(APP_SECRET, rawBody);

    if (!timingSafeEqual(signatureHeader, expectedSignature)) {
      console.warn("[WhatsApp] Invalid signature", {
        received: signatureHeader,
        expected: expectedSignature,
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else {
    console.warn(
      "[WhatsApp] WHATSAPP_APP_SECRET is not set, skipping signature verification"
    );
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    console.error("[WhatsApp] Failed to parse JSON body", err);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    await handleWhatsAppWebhook(payload);
  } catch (err) {
    console.error("[WhatsApp] Error handling webhook payload", err);
    // We still return 200 so WhatsApp does not retry endlessly.
  }

  return NextResponse.json({ status: "received" }, { status: 200 });
}

/**
 * Compute HMAC-SHA256 of the raw request body using the app secret.
 * WhatsApp expects the format: "sha256=<hex>"
 */
function signPayload(appSecret: string, rawBody: string): string {
  const hmac = crypto.createHmac("sha256", appSecret);
  hmac.update(rawBody, "utf8");
  const digest = hmac.digest("hex");
  return `sha256=${digest}`;
}

/**
 * Constant-time comparison to avoid timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}
