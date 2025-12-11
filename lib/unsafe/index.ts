import registry from "./registry.json";

export type UnsafeArea = {
  id: string;
  name: string;
  city: string;
  province: string;
  polygons?: Array<Array<[number, number]>>; // [[ [lat,lng], ... ]]
  reason?: string;
  permanent?: boolean;
};

export function getUnsafeAreas(): UnsafeArea[] {
  return registry as UnsafeArea[];
}
