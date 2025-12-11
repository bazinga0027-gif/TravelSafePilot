// src/services/incidentParser.ts

import { IncidentSource, ParsedIncident } from "../types";

/**
 * Very basic placeholder parser.
 * Later we’ll add:
 *  - SA-specific crime phrase detection
 *  - Location extraction
 *  - Time parsing ("19:35", "this morning", etc.)
 *  - Severity / category logic
 */
export function parseIncidentFromText(
  rawText: string,
  opts?: {
    defaultCity?: string;
    defaultProvince?: string;
    defaultCountry?: string;
    source?: IncidentSource;
  }
): ParsedIncident {
  const text = rawText.trim();

  const source: IncidentSource = opts?.source || "whatsapp";

  // Basic defaults
  const parsed: ParsedIncident = {
    source,
    rawText: text,
    incidentType: null,
    category: null,
    severity: null,
    lat: null,
    lng: null,
    locationText: null,
    city: opts?.defaultCity || null,
    province: opts?.defaultProvince || null,
    country: opts?.defaultCountry || "South Africa",
    occurredAt: null,
    confidence: 0.2,
    metadata: {}
  };

  const lower = text.toLowerCase();

  // Naive incident type detection (temporary – we’ll tune it for SA later)
  if (lower.includes("hijack") || lower.includes("hijacking")) {
    parsed.incidentType = "hijacking";
    parsed.category = "crime";
    parsed.severity = 4;
    parsed.confidence = 0.6;
  } else if (lower.includes("armed robbery")) {
    parsed.incidentType = "armed_robbery";
    parsed.category = "crime";
    parsed.severity = 4;
    parsed.confidence = 0.65;
  } else if (lower.includes("robbery")) {
    parsed.incidentType = "robbery";
    parsed.category = "crime";
    parsed.severity = 3;
    parsed.confidence = 0.55;
  } else if (lower.includes("shots fired") || lower.includes("shooting")) {
    parsed.incidentType = "shots_fired";
    parsed.category = "crime";
    parsed.severity = 5;
    parsed.confidence = 0.7;
  } else if (lower.includes("protest") || lower.includes("strike")) {
    parsed.incidentType = "protest";
    parsed.category = "unrest";
    parsed.severity = 3;
    parsed.confidence = 0.5;
  } else if (lower.includes("accident") || lower.includes("collision")) {
    parsed.incidentType = "accident";
    parsed.category = "accident";
    parsed.severity = 3;
    parsed.confidence = 0.5;
  }

  // Basic location hint – placeholder for now
  if (lower.includes(" near ") || lower.includes(" at ")) {
    parsed.locationText = text;
  }

  return parsed;
}
