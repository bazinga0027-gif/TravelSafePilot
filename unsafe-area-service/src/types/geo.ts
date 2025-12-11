export type LngLat = [number, number];

export interface UnsafeArea {
  id: string;
  name: string;
  city: string;
  province: string;
  country_code: string;
  risk_level: "low" | "medium" | "high" | "extreme";
  category: string;
  source?: string | null;
  valid_from?: string | null;
  valid_to?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UnsafeAlert {
  id: string;
  title: string;
  description?: string | null;
  city: string;
  province: string;
  country_code: string;
  risk_level: "low" | "medium" | "high" | "extreme";
  category: string;
  radius_m: number;
  source?: string | null;
  valid_from?: string | null;
  valid_to?: string | null;
  created_at: string;
  updated_at: string;
}
