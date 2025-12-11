// src/types.ts

export type IncidentSource = "whatsapp" | "web" | "app" | "manual";

export interface ParsedIncident {
  source: IncidentSource;
  sourceGroupId?: number | null;
  rawMessageId?: string | null;
  rawText: string;
  incidentType?: string | null;
  category?: string | null;
  severity?: number | null;
  lat?: number | null;
  lng?: number | null;
  locationText?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  occurredAt?: Date | null;
  confidence?: number | null;
  metadata?: Record<string, any>;
}
