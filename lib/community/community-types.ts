// lib/community/community-types.ts

export type CommunityRiskType =
  | "SMASH_AND_GRAB"
  | "ARMED_ROBBERY"
  | "THEFT_OUT_OF_MOTOR_VEHICLE"
  | "SUSPICIOUS_LOITERING"
  | "ROAD_BLOCKADE"
  | "GENERAL_SAFETY_CONCERN";

export type CommunitySourceType = "COMMUNITY" | "OFFICIAL" | "NEWS";

export type CommunityVerificationStatus =
  | "UNVERIFIED"
  | "COMMUNITY_VERIFIED"
  | "VERIFIED_OFFICIAL";

export interface CommunityAlert {
  id: string;
  latitude: number;
  longitude: number;

  intersectionName: string;
  suburb?: string;
  city?: string;
  province?: string;

  riskType: CommunityRiskType;
  summary: string;
  detailsInternal?: string;

  sourceType: CommunitySourceType;
  verificationStatus: CommunityVerificationStatus;

  incidentCount: number;
  firstReportedAt?: string; // ISO
  lastReportedAt?: string;  // ISO

  expiresAt: string; // ISO
  riskScore: number;
  isActive: boolean;

  partnerName?: string;
  partnerOrganisation?: string;
}

export const COMMUNITY_ALERT_TTL_DAYS = 30;

export function computeExpiryDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + COMMUNITY_ALERT_TTL_DAYS);
  return d.toISOString();
}

export function buildSummary(params: {
  riskType: CommunityRiskType;
  intersectionName: string;
  suburb?: string;
  incidentCount?: number;
}): string {
  const { riskType, intersectionName, suburb, incidentCount } = params;

  const labels: Record<CommunityRiskType, string> = {
    SMASH_AND_GRAB: "Smash-and-grab hotspot",
    ARMED_ROBBERY: "Armed robbery risk",
    THEFT_OUT_OF_MOTOR_VEHICLE: "Theft out of motor vehicle risk",
    SUSPICIOUS_LOITERING: "Suspicious loitering reported",
    ROAD_BLOCKADE: "Road blockade / obstruction risk",
    GENERAL_SAFETY_CONCERN: "General safety concern reported",
  };

  const base = labels[riskType] ?? "Safety alert";
  const where = suburb ? `${intersectionName}, ${suburb}` : intersectionName;

  let suffix = "";
  if (incidentCount && incidentCount > 1) {
    suffix = ` (${incidentCount} recent incidents)`;
  }

  return `${base} at ${where}${suffix}. Community alert – use extra caution.`;
}
