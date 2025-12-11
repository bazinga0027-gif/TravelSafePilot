// lib/whatsapp/ingest.ts
import { query } from "@/lib/db";

export type WhatsAppMessageType =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "location"
  | "unknown";

export interface NormalizedWhatsAppMessage {
  whatsapp_message_id: string;
  from_number: string;
  to_number: string;
  profile_name: string | null;
  message_type: WhatsAppMessageType;
  text_body: string | null;
  raw_payload: any;
  timestamp: Date;
}

/**
 * Entry point called from the API route.
 * Handles the full webhook payload structure from Meta.
 */
export async function handleWhatsAppWebhook(payload: any): Promise<void> {
  if (!payload || !Array.isArray(payload.entry)) {
    console.warn("[WhatsApp] Payload has no entry array");
    return;
  }

  const messages = extractMessages(payload);
  if (messages.length === 0) {
    console.info("[WhatsApp] No messages found in payload");
    return;
  }

  for (const msg of messages) {
    try {
      await saveIncomingMessage(msg);
      await projectIncidentFromMessage(msg);
    } catch (err) {
      console.error("[WhatsApp] Failed to process message", {
        id: msg.whatsapp_message_id,
        err,
      });
    }
  }
}

/**
 * Extract all messages from the webhook payload in a normalized structure.
 */
function extractMessages(payload: any): NormalizedWhatsAppMessage[] {
  const out: NormalizedWhatsAppMessage[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const messages = value?.messages ?? [];
      const contacts = value?.contacts ?? [];

      for (let i = 0; i < messages.length; i++) {
        const m = messages[i];
        const contact = contacts[i] ?? contacts[0] ?? null;

        const profileName =
          contact?.profile?.name ?? contact?.wa_id ?? null;

        const base: NormalizedWhatsAppMessage = {
          whatsapp_message_id: m.id,
          from_number: m.from,
          to_number: m.to ?? value?.metadata?.display_phone_number ?? "",
          profile_name: profileName,
          message_type: detectType(m),
          text_body: extractText(m),
          raw_payload: m,
          timestamp: new Date(Number(m.timestamp) * 1000),
        };

        out.push(base);
      }
    }
  }

  return out;
}

/**
 * Detects the message type from the WhatsApp structure.
 */
function detectType(m: any): WhatsAppMessageType {
  if (m.type === "text") return "text";
  if (m.type === "image") return "image";
  if (m.type === "audio") return "audio";
  if (m.type === "video") return "video";
  if (m.type === "location") return "location";
  return "unknown";
}

/**
 * Extracts a human-readable text body (if any).
 * This will be the main field we use to build incidents later.
 */
function extractText(m: any): string | null {
  if (m.type === "text" && m.text?.body) {
    return m.text.body as string;
  }

  // You can add more fallbacks here (e.g. captions on media)
  if (m.type === "image" && m.image?.caption) {
    return m.image.caption as string;
  }

  return null;
}

/**
 * Persists the raw WhatsApp message into the database.
 *
 * This table is your “source of truth” for all incoming WhatsApp data.
 */
export async function saveIncomingMessage(
  msg: NormalizedWhatsAppMessage
): Promise<void> {
  await ensureMessagesTable();

  await query(
    `
    INSERT INTO whatsapp_messages (
      whatsapp_message_id,
      from_number,
      to_number,
      profile_name,
      message_type,
      text_body,
      raw_payload,
      timestamp
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT (whatsapp_message_id) DO NOTHING
    `,
    [
      msg.whatsapp_message_id,
      msg.from_number,
      msg.to_number,
      msg.profile_name,
      msg.message_type,
      msg.text_body,
      JSON.stringify(msg.raw_payload),
      msg.timestamp.toISOString(),
    ]
  );
}

/**
 * Projects a message into a higher-level “incident” record.
 * This is what you’ll eventually hook into:
 *  - unsafe-area scoring
 *  - community alerts
 *  - map overlays
 */
export async function projectIncidentFromMessage(
  msg: NormalizedWhatsAppMessage
): Promise<void> {
  await ensureIncidentsTable();

  // Very simple projection for now:
  // - Only text messages
  // - Treat every message as a potential “incident report” with free-form text
  if (!msg.text_body) {
    return;
  }

  await query(
    `
    INSERT INTO whatsapp_incidents (
      whatsapp_message_id,
      from_number,
      profile_name,
      summary,
      created_at,
      processed
    )
    VALUES ($1,$2,$3,$4,NOW(),false)
    ON CONFLICT (whatsapp_message_id) DO NOTHING
    `,
    [
      msg.whatsapp_message_id,
      msg.from_number,
      msg.profile_name,
      msg.text_body,
    ]
  );
}

/**
 * One-time table creation helper for whatsapp_messages.
 * Safe to call on every request; it’s an idempotent DDL check.
 */
let messagesTableEnsured = false;
async function ensureMessagesTable(): Promise<void> {
  if (messagesTableEnsured) return;

  await query(`
    CREATE TABLE IF NOT EXISTS whatsapp_messages (
      id SERIAL PRIMARY KEY,
      whatsapp_message_id TEXT UNIQUE NOT NULL,
      from_number TEXT NOT NULL,
      to_number TEXT NOT NULL,
      profile_name TEXT,
      message_type TEXT NOT NULL,
      text_body TEXT,
      raw_payload JSONB NOT NULL,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  messagesTableEnsured = true;
}

/**
 * One-time table creation helper for whatsapp_incidents.
 * This is the higher-level table for the rest of tasks (B→G).
 */
let incidentsTableEnsured = false;
async function ensureIncidentsTable(): Promise<void> {
  if (incidentsTableEnsured) return;

  await query(`
    CREATE TABLE IF NOT EXISTS whatsapp_incidents (
      id SERIAL PRIMARY KEY,
      whatsapp_message_id TEXT UNIQUE NOT NULL,
      from_number TEXT NOT NULL,
      profile_name TEXT,
      summary TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      processed BOOLEAN NOT NULL DEFAULT false
    );
  `);

  incidentsTableEnsured = true;
}
