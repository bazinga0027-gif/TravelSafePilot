// src/routes/webhook.ts
import { Router, Request, Response } from "express";
import { query } from "../db";
import { parseIncidentFromText } from "../services/incidentParser";
import { ParsedIncident } from "../types";

export const webhookRouter = Router();

/**
 * GET webhook verification (optional – used by Meta to confirm your endpoint)
 */
webhookRouter.get("/whatsapp", (req: Request, res: Response) => {
  // You can wire this to WHATSAPP_VERIFY_TOKEN if needed.
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token && challenge) {
    // Very naive accept-all for now:
    return res.status(200).send(challenge);
  }

  return res.status(400).send("Bad Request");
});

/**
 * POST webhook – main entry point for incoming WhatsApp messages.
 * Right now we:
 *  - log the body
 *  - try to pull out some text
 *  - run parseIncidentFromText()
 *  - insert into community_incidents as source='whatsapp'
 */
webhookRouter.post("/whatsapp", async (req: Request, res: Response) => {
  try {
    const body = req.body;

    // TODO: adapt this to actual WhatsApp Cloud API payload structure.
    // For now we assume something like:
    //
    // {
    //   "wa_group_id": "...",
    //   "message_id": "...",
    //   "text": "...",
    //   "group_name": "...",
    //   "timestamp": 1234567890
    // }

    console.log("Incoming WhatsApp payload:", JSON.stringify(body, null, 2));

    const waGroupId: string | undefined = body.wa_group_id;
    const messageId: string | undefined = body.message_id;
    const text: string | undefined = body.text;
    const groupName: string | undefined = body.group_name;
    const ts: number | undefined = body.timestamp;

    if (!text || !waGroupId) {
      // For now, just acknowledge so WhatsApp doesn't keep retrying
      return res.status(200).json({ status: "ignored", reason: "missing text or wa_group_id" });
    }

    // Ensure group exists or create a basic record
    const groupResult = await query<{ id: number }>(
      `
        INSERT INTO whatsapp_groups (wa_group_id, name)
        VALUES ($1, $2)
        ON CONFLICT (wa_group_id)
        DO UPDATE SET name = EXCLUDED.name
        RETURNING id;
      `,
      [waGroupId, groupName || null]
    );

    const groupId = groupResult.rows[0].id;

    const parsed: ParsedIncident = parseIncidentFromText(text, {
      // later we can add defaultCity/defaultProvince from whatsapp_groups columns
    });

    // Insert into community_incidents
    await query(
      `
        INSERT INTO community_incidents (
          source,
          source_group_id,
          raw_message_id,
          raw_text,
          incident_type,
          category,
          severity,
          lat,
          lng,
          location_text,
          city,
          province,
          country,
          occurred_at,
          reported_at,
          confidence,
          metadata
        )
        VALUES (
          'whatsapp',
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14,
          $15,
          $16
        );
      `,
      [
        groupId,
        messageId || null,
        parsed.rawText,
        parsed.incidentType,
        parsed.category,
        parsed.severity,
        parsed.lat,
        parsed.lng,
        parsed.locationText,
        parsed.city,
        parsed.province,
        parsed.country,
        parsed.occurredAt ?? (ts ? new Date(ts * 1000) : null),
        new Date(),
        parsed.confidence,
        JSON.stringify(parsed.metadata || {})
      ]
    );

    return res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("Error handling WhatsApp webhook:", err);
    return res.status(500).json({ status: "error" });
  }
});
