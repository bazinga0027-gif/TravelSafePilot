// app/api/whatsapp/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";

const VERIFY_TOKEN =
  process.env.WHATSAPP_VERIFY_TOKEN || "travelsafepilot_verify_token";

// GET = verification handshake from Meta
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Basic sanity log (optional – remove later if noisy)
  console.log("WhatsApp GET webhook", { mode, token, challenge });

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    // Must return the challenge as plain text, 200
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// POST = real messages / events from WhatsApp
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  console.log("WhatsApp POST webhook body:", JSON.stringify(body, null, 2));

  // You can add actual handling later; for now just acknowledge
  return NextResponse.json({ received: true });
}
