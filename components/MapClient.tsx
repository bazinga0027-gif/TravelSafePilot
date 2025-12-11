"use client";

/* global google */

import React, { useEffect, useRef, useState } from "react";
import { MarkerClusterer } from "@googlemaps/markerclusterer";

type LatLng = { lat: number; lng: number };

// Autocomplete is on now
const ENABLE_AUTOCOMPLETE = true;

type UnsafeAreaType = "permanent" | "temporary";
type RiskLevel = "low" | "medium" | "high" | "extreme";

interface UnsafeArea {
  id: string;
  name: string;
  city?: string;
  province?: string;
  country?: string;
  type: UnsafeAreaType;
  riskLevel: RiskLevel;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  notes?: string | null;
  geometry: any; // GeoJSON
  createdAt: string;
  updatedAt: string;
}

type IncidentType =
  | "crime"
  | "protest"
  | "roadblock"
  | "unrest"
  | "accident"
  | "theft"
  | "hijacking"
  | "other";

type SeverityLevel = 1 | 2 | 3 | 4 | 5;

interface Incident {
  id: string;
  title: string;
  summary?: string;
  incidentType: IncidentType;
  severity: SeverityLevel;
  lat: number;
  lng: number;
  radiusMeters?: number | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  reportedAt: string;
  validFrom?: string | null;
  validTo?: string | null;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface NearRouteResponse {
  corridorKm: number;
  sinceHours: number;
  total: number;
  highestSeverity: SeverityLevel | null;
  riskScore: number | null;
  incidents: Incident[];
}

interface RouteStats {
  distanceText: string;
  durationText: string;
  riskScore: number | null;
  highestSeverity: SeverityLevel | null;
  incidentCount: number;
}

type SegmentRisk = "safe" | "medium" | "high";

interface ColoredSegment {
  path: LatLng[];
  risk: SegmentRisk;
}

// Fallback center = JHB
const JHB_CENTER: LatLng = { lat: -26.2041, lng: 28.0473 };

function severityToRisk(severity: SeverityLevel | null): SegmentRisk {
  if (!severity || severity <= 1) return "safe";
  if (severity <= 3) return "medium";
  return "high";
}

function riskToColor(risk: SegmentRisk): string {
  switch (risk) {
    case "high":
      return "#d93025"; // red
    case "medium":
      return "#f9ab00"; // yellow/orange
    case "safe":
    default:
      return "#1a9449"; // green
  }
}

function riskLevelToSegmentRisk(riskLevel: RiskLevel): SegmentRisk {
  switch (riskLevel) {
    case "extreme":
    case "high":
      return "high";
    case "medium":
    case "low":
      return "medium";
    default:
      return "safe";
  }
}

// Simple point-in-polygon for GeoJSON-style coords
function pointInPolygon(point: LatLng, polygonCoords: LatLng[]): boolean {
  let inside = false;
  const x = point.lng;
  const y = point.lat;

  for (let i = 0, j = polygonCoords.length - 1; i < polygonCoords.length; j = i++) {
    const xi = polygonCoords[i].lng;
    const yi = polygonCoords[i].lat;
    const xj = polygonCoords[j].lng;
    const yj = polygonCoords[j].lat;

    const intersect =
      yi > y !== yj > y &&
      x <
        ((xj - xi) * (y - yi)) / (yj - yi + 0.0000001) +
          xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

// Haversine distance in km
function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(
        sinDLat * sinDLat +
          Math.cos(la1) *
            Math.cos(la2) *
            sinDLng *
            sinDLng
      ),
      Math.sqrt(
        1 -
          (sinDLat * sinDLat +
            Math.cos(la1) *
              Math.cos(la2) *
              sinDLng *
              sinDLng)
      )
    );

  return R * c;
}

// Helper: label + color for overall route risk
function overallRiskLabelAndColor(
  stats: RouteStats | null
): { label: string; colorClass: string } {
  if (!stats) {
    return {
      label: "No route loaded",
      colorClass: "text-slate-300",
    };
  }

  const { riskScore, highestSeverity, incidentCount } = stats;

  if (!riskScore || incidentCount === 0 || !highestSeverity) {
    return {
      label: "Route appears low-risk",
      colorClass: "text-emerald-300",
    };
  }

  if (highestSeverity >= 4 || riskScore > 8) {
    return {
      label: "High risk",
      colorClass: "text-red-400",
    };
  }

  if (highestSeverity >= 3 || riskScore > 4) {
    return {
      label: "Moderate risk",
      colorClass: "text-amber-300",
    };
  }

  return {
    label: "Low to moderate risk",
    colorClass: "text-emerald-300",
  };
}

const MapClient: React.FC = () => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const mapDivRef = useRef<HTMLDivElement | null>(null);

  const originInputRef = useRef<HTMLInputElement | null>(null);
  const destInputRef = useRef<HTMLInputElement | null>(null);

  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);

  const routePolylinesRef = useRef<google.maps.Polyline[]>([]);
  const routeMarkersRef = useRef<google.maps.Marker[]>([]);
  // Global/viewport incidents (clustered)
  const viewportIncidentMarkersRef = useRef<any[]>([]);
  const incidentClusterRef = useRef<MarkerClusterer | null>(null);
  // Route-specific incident overlays (markers + circles)
  const routeIncidentMarkersRef = useRef<(google.maps.Marker | google.maps.Circle)[]>([]);
  const unsafeAreaPolygonsRef = useRef<google.maps.Polygon[]>([]);

  const [origin, setOrigin] = useState<string>("");
  const [destination, setDestination] = useState<string>("");

  // Precise coordinates from autocomplete, if user picked a suggestion
  const [originLocation, setOriginLocation] = useState<LatLng | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<LatLng | null>(null);

  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [routeStats, setRouteStats] = useState<RouteStats | null>(null);
  const [incidentsSummary, setIncidentsSummary] =
    useState<NearRouteResponse | null>(null);

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const [showIncidentList, setShowIncidentList] = useState(false); // route-based list
  const [showViewportIncidentList, setShowViewportIncidentList] = useState(false); // viewport list
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  // --- Map init & geolocation ---
  useEffect(() => {
    let cancelled = false;

    function initMapIfReady() {
      if (typeof window === "undefined") return;
      const g = (window as any).google;
      if (!g || !g.maps) return;
      if (cancelled) return;
      if (mapRef.current) return;

      const mapDiv = mapDivRef.current;
      if (!mapDiv) return;

      const map = new google.maps.Map(mapDiv, {
        center: JHB_CENTER,
        zoom: 11,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });

      mapRef.current = map;
      directionsServiceRef.current = new google.maps.DirectionsService();
      setIsMapReady(true);

      if (navigator.geolocation) {
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!mapRef.current) return;
            const userPos = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            };
            mapRef.current.setCenter(userPos);
            mapRef.current.setZoom(13);
            setIsLocating(false);
          },
          () => {
            setIsLocating(false);
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      }
    }

    // Try immediately
    initMapIfReady();

    // Poll briefly in case script loads slightly later
    const interval = setInterval(() => {
      if (mapRef.current) {
        clearInterval(interval);
        return;
      }
      initMapIfReady();
    }, 500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // --- Autocomplete wiring ---
  useEffect(() => {
    if (!ENABLE_AUTOCOMPLETE) return;
    if (!isMapReady) return;
    if (typeof window === "undefined") return;
    const g = (window as any).google;
    if (!g?.maps?.places?.Autocomplete) return;

    const originInput = originInputRef.current;
    const destInput = destInputRef.current;
    if (!originInput || !destInput) return;

    const originAuto = new g.maps.places.Autocomplete(originInput, {
      fields: ["geometry", "formatted_address"],
    });
    const destAuto = new g.maps.places.Autocomplete(destInput, {
      fields: ["geometry", "formatted_address"],
    });

    originAuto.addListener("place_changed", () => {
      const place = originAuto.getPlace();
      if (!place || !place.geometry || !place.geometry.location) return;
      const loc = place.geometry.location;
      const coords: LatLng = { lat: loc.lat(), lng: loc.lng() };
      setOriginLocation(coords);
      if (place.formatted_address) {
        setOrigin(place.formatted_address);
      }
    });

    destAuto.addListener("place_changed", () => {
      const place = destAuto.getPlace();
      if (!place || !place.geometry || !place.geometry.location) return;
      const loc = place.geometry.location;
      const coords: LatLng = { lat: loc.lat(), lng: loc.lng() };
      setDestinationLocation(coords);
      if (place.formatted_address) {
        setDestination(place.formatted_address);
      }
    });

    return () => {
      // Drop references, no explicit destroy for Autocomplete
    };
  }, [isMapReady]);

  // --- Load incidents for current viewport from API (DB-backed) ---
  useEffect(() => {
    if (!isMapReady || !mapRef.current) return;

    const map = mapRef.current;
    let timeoutId: number | undefined;
    let cancelled = false;

    async function fetchIncidentsForBounds() {
      if (!map || cancelled) return;

      const bounds = map.getBounds();
      if (!bounds) return;

      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();

      const north = ne.lat();
      const east = ne.lng();
      const south = sw.lat();
      const west = sw.lng();

      try {
        const res = await fetch(
          `/api/incidents?north=${north}&south=${south}&east=${east}&west=${west}&hours=24&max=300`
        );
        if (!res.ok) return;
        const data = (await res.json()) as Incident[];
        if (!cancelled) {
          setIncidents(data);
        }
      } catch (err) {
        console.error("Failed to load viewport incidents:", err);
      }
    }

    function handleIdle() {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
      // debounce to avoid spamming during drag
      timeoutId = window.setTimeout(() => {
        void fetchIncidentsForBounds();
      }, 400);
    }

    // Initial load for the starting bounds
    void fetchIncidentsForBounds();

    const listener = map.addListener("idle", handleIdle);

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
      listener.remove();
    };
  }, [isMapReady]);

  // --- Incident markers + clustering with severity/halos ---
  useEffect(() => {
    if (!isMapReady || !mapRef.current) return;

    const map = mapRef.current;

    // Clear existing viewport markers from map
    viewportIncidentMarkersRef.current.forEach((m) => {
      // Works for Marker, Circle, AdvancedMarkerElement
      // @ts-ignore
      if (m.setMap) m.setMap(null);
      // @ts-ignore
      if ("map" in m) (m as any).map = null;
    });
    viewportIncidentMarkersRef.current = [];

    // Clear existing clusterer, if any
    if (incidentClusterRef.current) {
      incidentClusterRef.current.clearMarkers();
      incidentClusterRef.current = null;
    }

    // No incidents? Nothing to do.
    if (!incidents || incidents.length === 0) return;

    const markers: google.maps.marker.AdvancedMarkerElement[] = [];

    incidents.forEach((incident) => {
      if (incident.lat == null || incident.lng == null) return;

      const severity = incident.severity ?? 1;
      const risk = severityToRisk(severity as SeverityLevel);

      // Core color by risk
      let coreColor = "#1a73e8"; // default blue-ish
      if (risk === "high") coreColor = "#d93025";
      else if (risk === "medium") coreColor = "#f9ab00";

      // Build DOM structure: halo + core
      const container = document.createElement("div");
      container.style.position = "relative";
      container.style.display = "flex";
      container.style.alignItems = "center";
      container.style.justifyContent = "center";
      container.style.width = "28px";
      container.style.height = "28px";

      const halo = document.createElement("div");
      halo.style.position = "absolute";
      halo.style.width = "24px";
      halo.style.height = "24px";
      halo.style.borderRadius = "999px";
      halo.style.backgroundColor = coreColor;
      halo.style.opacity = risk === "high" ? "0.25" : "0.18";
      halo.style.boxShadow =
        risk === "high"
          ? "0 0 12px rgba(217,48,37,0.7)"
          : "0 0 8px rgba(0,0,0,0.5)";

      const core = document.createElement("div");
      core.style.width = risk === "high" ? "12px" : "10px";
      core.style.height = risk === "high" ? "12px" : "10px";
      core.style.borderRadius = "50%";
      core.style.backgroundColor = coreColor;
      core.style.border = "2px solid white";
      core.style.boxShadow = "0 0 4px rgba(0,0,0,0.6)";

      container.appendChild(halo);
      container.appendChild(core);

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: incident.lat, lng: incident.lng },
        title: incident.title ?? "Incident",
        content: container,
      });

      marker.addListener("gmp-click", () => {
        setSelectedIncidentId(incident.id);
        if (mapRef.current) {
          mapRef.current.panTo({ lat: incident.lat, lng: incident.lng });
          const currentZoom = mapRef.current.getZoom() ?? 13;
          if (currentZoom < 14) {
            mapRef.current.setZoom(14);
          }
        }
      });

      markers.push(marker);
      viewportIncidentMarkersRef.current.push(marker as any);
    });

    if (markers.length === 0) return;

    const clusterer = new MarkerClusterer({
      map,
      markers,
    });

    incidentClusterRef.current = clusterer;

    return () => {
      clusterer.clearMarkers();
      viewportIncidentMarkersRef.current.forEach((m) => {
        // @ts-ignore
        if (m.setMap) m.setMap(null);
        // @ts-ignore
        if ("map" in m) (m as any).map = null;
      });
      viewportIncidentMarkersRef.current = [];
    };
  }, [isMapReady, incidents]);

  // --- Unsafe areas (from registry) ---
  useEffect(() => {
    if (!isMapReady || !mapRef.current) return;

    let cancelled = false;

    async function loadUnsafeAreas() {
      try {
        const res = await fetch("/api/unsafe-areas");
        if (!res.ok) return;
        const areas = (await res.json()) as UnsafeArea[];
        if (cancelled || !mapRef.current) return;

        unsafeAreaPolygonsRef.current.forEach((poly) => poly.setMap(null));
        unsafeAreaPolygonsRef.current = [];

        areas
          .filter((a) => a.isActive && a.geometry)
          .forEach((area) => {
            const polygons: LatLng[][] = [];

            if (area.geometry.type === "Polygon") {
              const coords = area.geometry.coordinates[0] as [number, number][];
              polygons.push(coords.map(([lng, lat]) => ({ lat, lng })));
            } else if (area.geometry.type === "MultiPolygon") {
              area.geometry.coordinates.forEach((poly: [number, number][][]) => {
                const coords = poly[0];
                polygons.push(coords.map(([lng, lat]) => ({ lat, lng })));
              });
            }

            const risk = riskLevelToSegmentRisk(area.riskLevel);
            const strokeColor = riskToColor(risk);

            polygons.forEach((polygonPath) => {
              const polygon = new google.maps.Polygon({
                paths: polygonPath,
                map: mapRef.current!,
                strokeColor,
                strokeOpacity: 0.8,
                strokeWeight: 1,
                fillColor: strokeColor,
                fillOpacity: 0.18,
              });
              unsafeAreaPolygonsRef.current.push(polygon);
            });
          });
      } catch {
        // Silent fail for polygons
      }
    }

    void loadUnsafeAreas();

    return () => {
      cancelled = true;
    };
  }, [isMapReady]);

  // --- Clear overlays safely (route-only overlays) ---
  function clearRouteOverlays() {
    routePolylinesRef.current.forEach((pl) => pl.setMap(null));
    routePolylinesRef.current = [];

    routeMarkersRef.current.forEach((m) => m.setMap(null));
    routeMarkersRef.current = [];

    routeIncidentMarkersRef.current.forEach((m) => m.setMap(null));
    routeIncidentMarkersRef.current = [];

    setRouteStats(null);
    setIncidentsSummary(null);
    setShowIncidentList(false);
  }

  function handleClear() {
    setOrigin("");
    setDestination("");
    setOriginLocation(null);
    setDestinationLocation(null);
    clearRouteOverlays();
    setError(null);
  }

  function handleSwap() {
    setOrigin((prevOrigin) => {
      const newOrigin = destination;
      setDestination(prevOrigin);

      // swap coords as well
      setOriginLocation((prevCoord) => {
        const newOriginCoord = destinationLocation;
        setDestinationLocation(prevCoord);
        return newOriginCoord;
      });

      return newOrigin;
    });
  }

  function handleLocateMe() {
    if (!mapRef.current || !navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userPos = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        mapRef.current?.setCenter(userPos);
        mapRef.current?.setZoom(13);
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  // --- Routing + incidents + segmented colouring ---
  async function handleRoute() {
    if (!mapRef.current || !directionsServiceRef.current) return;
    if (!origin || !destination) {
      setError("Please enter both origin and destination.");
      return;
    }

    setIsLoadingRoute(true);
    setError(null);
    clearRouteOverlays();

    try {
      const originParam = (originLocation ?? origin) as any;
      const destinationParam = (destinationLocation ?? destination) as any;

      const directionsResult = await directionsServiceRef.current.route({
        origin: originParam,
        destination: destinationParam,
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: false,
      });

      if (!directionsResult.routes || directionsResult.routes.length === 0) {
        setError("No route found.");
        setIsLoadingRoute(false);
        return;
      }

      const route = directionsResult.routes[0];
      const leg = route.legs[0];

      const distanceText = leg.distance?.text ?? "";
      const durationText = leg.duration?.text ?? "";

      const path: LatLng[] =
        route.overview_path?.map((p) => ({ lat: p.lat(), lng: p.lng() })) ?? [];

      if (path.length < 2) {
        setError("Route too short to analyze.");
        setIsLoadingRoute(false);
        return;
      }

      const bounds = new google.maps.LatLngBounds();
      path.forEach((p) => bounds.extend(new google.maps.LatLng(p.lat, p.lng)));
      mapRef.current.fitBounds(bounds);

      const nearRouteRes = await fetch("/api/incidents/near-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          points: path,
          corridorKm: 1.0,
          sinceHours: 72,
        }),
      });

      let nearRouteData: NearRouteResponse | null = null;
      if (nearRouteRes.ok) {
        nearRouteData = (await nearRouteRes.json()) as NearRouteResponse;
        setIncidentsSummary(nearRouteData);
      }

      const routeIncidents = nearRouteData?.incidents ?? [];

      // Near-route markers with severity-based icons + halos (via circle radius)
      routeIncidents.forEach((incident) => {
        const pos = { lat: incident.lat, lng: incident.lng };

        const risk = severityToRisk(incident.severity);
        const color =
          risk === "high" ? "#d93025" : risk === "medium" ? "#f9ab00" : "#1a73e8";

        const marker = new google.maps.Marker({
          position: pos,
          map: mapRef.current!,
          title: incident.title,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: risk === "high" ? 7 : 6,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });

        const radiusMeters =
          incident.radiusMeters && incident.radiusMeters > 0
            ? incident.radiusMeters
            : 300;

        const circle = new google.maps.Circle({
          map: mapRef.current!,
          center: pos,
          radius: radiusMeters,
          strokeColor: color,
          strokeOpacity: 0.8,
          strokeWeight: 1,
          fillColor: color,
          fillOpacity: risk === "high" ? 0.16 : 0.12,
        });

        routeIncidentMarkersRef.current.push(marker);
        routeIncidentMarkersRef.current.push(circle);
      });

      const unsafePolygons: { risk: SegmentRisk; rings: LatLng[][] }[] = [];
      unsafeAreaPolygonsRef.current.forEach((poly) => {
        const stroke = (poly.get("strokeColor") as string | null) ?? "";
        let risk: SegmentRisk = "medium";
        if (stroke === "#d93025") risk = "high";
        else if (stroke === "#1a9449") risk = "safe";
        else if (stroke === "#f9ab00") risk = "medium";

        const paths = poly.getPaths();
        const rings: LatLng[][] = [];
        for (let i = 0; i < paths.getLength(); i++) {
          const p = paths.getAt(i);
          const ring: LatLng[] = [];
          for (let j = 0; j < p.getLength(); j++) {
            const c = p.getAt(j);
            ring.push({ lat: c.lat(), lng: c.lng() });
          }
          rings.push(ring);
        }
        unsafePolygons.push({ risk, rings });
      });

      function classifyPoint(p: LatLng): SegmentRisk {
        for (const up of unsafePolygons) {
          for (const ring of up.rings) {
            if (pointInPolygon(p, ring)) {
              return up.risk;
            }
          }
        }

        let maxIncidentSeverity: SeverityLevel | null = null;
        for (const incident of routeIncidents) {
          const dKm = haversineKm(p, { lat: incident.lat, lng: incident.lng });
          const radiusKm = incident.radiusMeters ? incident.radiusMeters / 1000 : 0.3;
          if (dKm <= radiusKm + 0.2) {
            if (maxIncidentSeverity === null || incident.severity > maxIncidentSeverity) {
              maxIncidentSeverity = incident.severity;
            }
          }
        }

        if (maxIncidentSeverity !== null) {
          return severityToRisk(maxIncidentSeverity);
        }

        return "safe";
      }

      const segments: ColoredSegment[] = [];
      let currentRisk = classifyPoint(path[0]);
      let currentSegment: LatLng[] = [path[0]];

      for (let i = 1; i < path.length; i++) {
        const p = path[i];
        const mid: LatLng = {
          lat: (path[i - 1].lat + p.lat) / 2,
          lng: (path[i - 1].lng + p.lng) / 2,
        };
        const segRisk = classifyPoint(mid);

        if (segRisk === currentRisk) {
          currentSegment.push(p);
        } else {
          if (currentSegment.length >= 2) {
            segments.push({ path: [...currentSegment], risk: currentRisk });
          }
          currentRisk = segRisk;
          currentSegment = [path[i - 1], p];
        }
      }

      if (currentSegment.length >= 2) {
        segments.push({ path: currentSegment, risk: currentRisk });
      }

      segments.forEach((seg) => {
        const polyline = new google.maps.Polyline({
          map: mapRef.current!,
          path: seg.path.map((p) => new google.maps.LatLng(p.lat, p.lng)),
          strokeColor: riskToColor(seg.risk),
          strokeOpacity: 0.9,
          strokeWeight: 5,
        });
        routePolylinesRef.current.push(polyline);
      });

      const startMarker = new google.maps.Marker({
        position: path[0],
        map: mapRef.current!,
        label: "A",
      });
      const endMarker = new google.maps.Marker({
        position: path[path.length - 1],
        map: mapRef.current!,
        label: "B",
      });
      routeMarkersRef.current.push(startMarker, endMarker);

      const highestSeverity = nearRouteData?.highestSeverity ?? null;
      const riskScore = nearRouteData?.riskScore ?? null;
      const incidentCount = nearRouteData?.total ?? routeIncidents.length;

      setRouteStats({
        distanceText,
        durationText,
        riskScore,
        highestSeverity,
        incidentCount,
      });

      setIsLoadingRoute(false);
    } catch (err: any) {
      console.error(err);
      setError("Failed to calculate route. Please try again.");
      setIsLoadingRoute(false);
    }
  }

  const { label: overallLabel, colorClass } =
    overallRiskLabelAndColor(routeStats);

  const incidentCount =
    routeStats?.incidentCount ??
    incidentsSummary?.incidents.length ??
    0;

  const viewportIncidentCount = incidents.length;

  return (
    <div className="w-full h-full flex flex-col gap-3 md:gap-4 p-2 md:p-4 bg-slate-950">
      {/* Top search bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-3 md:px-4 py-3 shadow-lg shadow-black/40">
        <div className="flex flex-col xl:flex-row gap-3 items-stretch">
          {/* Address inputs */}
          <div className="flex-1 flex flex-col md:flex-row gap-3">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Start
              </label>
              <input
                ref={originInputRef}
                type="text"
                value={origin}
                onChange={(e) => {
                  setOrigin(e.target.value);
                  setOriginLocation(null);
                }}
                placeholder="Enter origin (address, suburb, landmark)..."
                className="w-full rounded-full border border-slate-700 bg-slate-950/80 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:border-emerald-400/80 transition"
              />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Destination
              </label>
              <input
                ref={destInputRef}
                type="text"
                value={destination}
                onChange={(e) => {
                  setDestination(e.target.value);
                  setDestinationLocation(null);
                }}
                placeholder="Enter destination (city, town, accommodation)..."
                className="w-full rounded-full border border-slate-700 bg-slate-950/80 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:border-emerald-400/80 transition"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-row md:flex-row gap-2 items-stretch xl:w-auto">
            <button
              type="button"
              onClick={handleSwap}
              className="flex-1 rounded-full border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs md:text-sm text-slate-100 hover:border-emerald-400/60 hover:bg-slate-900 transition shadow-sm"
            >
              Swap
            </button>
            <button
              type="button"
              onClick={handleLocateMe}
              className="flex-1 rounded-full border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs md:text-sm text-slate-100 hover:border-emerald-400/60 hover:bg-slate-900 transition shadow-sm disabled:opacity-60"
              disabled={isLocating}
            >
              {isLocating ? "Locating..." : "Locate me"}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="flex-1 rounded-full border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs md:text-sm text-slate-100 hover:border-rose-400/60 hover:bg-slate-900 transition shadow-sm"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleRoute}
              className="flex-1 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 px-3 py-2 text-xs md:text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/40 hover:from-emerald-400 hover:to-emerald-300 transition-transform hover:-translate-y-[1px] disabled:opacity-60 disabled:hover:translate-y-0"
              disabled={isLoadingRoute || !origin || !destination || !isMapReady}
            >
              {isLoadingRoute ? "Routing..." : "Get route"}
            </button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-red-400/60 bg-red-950/70 text-red-100 text-sm px-3 py-2 shadow-sm">
          {error}
        </div>
      )}

      {/* Map */}
      <div className="flex-1 rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl shadow-black/40">
        <div
          ref={mapDivRef}
          className="w-full h-full"
          style={{ minHeight: 480 }}
        />
      </div>

      {/* Viewport incident summary + toggle */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 px-3 md:px-4 py-2.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-xs md:text-sm shadow-[0_-4px_20px_rgba(0,0,0,0.6)]">
        <div className="flex flex-wrap gap-2 md:gap-4 items-center">
          <div className="rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-1.5 flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-slate-400">
              In view (last 24h)
            </span>
            <span className="font-semibold text-slate-100">
              {viewportIncidentCount}
            </span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-3">
          {viewportIncidentCount > 0 && (
            <button
              type="button"
              onClick={() => setShowViewportIncidentList((v) => !v)}
              className="text-[11px] md:text-xs text-emerald-300 hover:text-emerald-200 underline-offset-2 underline"
            >
              {showViewportIncidentList ? "Hide area incidents" : "Show area incidents"}
            </button>
          )}
        </div>
      </div>

      {/* Route summary bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 px-3 md:px-4 py-2.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-xs md:text-sm shadow-[0_-4px_20px_rgba(0,0,0,0.6)]">
        {routeStats ? (
          <>
            <div className="flex flex-wrap gap-2 md:gap-4 items-center">
              <div className="rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-1.5 flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wide text-slate-400">
                  Distance
                </span>
                <span className="font-semibold text-slate-100">
                  {routeStats.distanceText || "-"}
                </span>
              </div>
              <div className="rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-1.5 flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wide text-slate-400">
                  Duration
                </span>
                <span className="font-semibold text-slate-100">
                  {routeStats.durationText || "-"}
                </span>
              </div>
              <div className="rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-1.5 flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wide text-slate-400">
                  Incidents
                </span>
                <span className="font-semibold text-slate-100">
                  {incidentCount}
                </span>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-3">
              <div
                className={`rounded-full px-3 py-1 border border-slate-700 bg-slate-950/80 font-semibold text-xs md:text-sm ${colorClass}`}
              >
                {overallLabel}
              </div>

              {incidentsSummary && incidentsSummary.incidents.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowIncidentList((v) => !v)}
                  className="text-[11px] md:text-xs text-emerald-300 hover:text-emerald-200 underline-offset-2 underline"
                >
                  {showIncidentList ? "Hide route incidents" : "Show route incidents"}
                </button>
              )}
            </div>
          </>
        ) : (
          <p className="text-[11px] md:text-xs text-slate-300">
            Enter a start and destination above, then click{" "}
            <span className="font-semibold">Get route</span> to see coloured
            route segments (green / amber / red), unsafe polygons, and incidents
            near your path.
          </p>
        )}
      </div>

      {/* Viewport incident list */}
      {showViewportIncidentList && viewportIncidentCount > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/95 px-3 md:px-4 py-3 text-xs text-slate-200 max-h-64 overflow-y-auto shadow-[0_-8px_30px_rgba(0,0,0,0.8)]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">
              Incidents in this area (last 24h)
            </p>
            <span className="text-[11px] text-slate-500">
              {viewportIncidentCount} total
            </span>
          </div>
          <ul className="space-y-1">
            {incidents.map((i) => {
              const isSelected = i.id === selectedIncidentId;
              const risk = severityToRisk(i.severity);
              const color =
                risk === "high" ? "text-red-300" : risk === "medium" ? "text-amber-300" : "text-emerald-300";

              return (
                <li
                  key={i.id}
                  className={`rounded-lg px-2 py-1.5 border ${
                    isSelected
                      ? "border-emerald-400 bg-slate-900"
                      : "border-slate-800 bg-slate-950/80"
                  } cursor-pointer`}
                  onClick={() => {
                    setSelectedIncidentId(i.id);
                    if (mapRef.current) {
                      mapRef.current.panTo({ lat: i.lat, lng: i.lng });
                      const currentZoom = mapRef.current.getZoom() ?? 13;
                      if (currentZoom < 14) {
                        mapRef.current.setZoom(14);
                      }
                    }
                  }}
                >
                  <div className={`font-medium ${color}`}>
                    {i.incidentType.toUpperCase()} • Sev {i.severity}
                    {i.sourceName && (
                      <span className="ml-2 text-[10px] text-slate-400">
                        ({i.sourceName})
                      </span>
                    )}
                  </div>
                  <div className="text-slate-200">{i.title}</div>
                  {i.reportedAt && (
                    <div className="text-[10px] text-slate-500">
                      Reported: {new Date(i.reportedAt).toLocaleString()}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Route-based incident list */}
      {showIncidentList &&
        incidentsSummary &&
        incidentsSummary.incidents.length > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/95 px-3 md:px-4 py-3 text-xs text-slate-200 max-h-56 overflow-y-auto shadow-[0_-8px_30px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">
                Incidents near your route (last {incidentsSummary.sinceHours}h)
              </p>
              <span className="text-[11px] text-slate-500">
                Showing {Math.min(incidentsSummary.incidents.length, 20)} of{" "}
                {incidentsSummary.incidents.length}
              </span>
            </div>
            <ul className="space-y-1">
              {incidentsSummary.incidents.slice(0, 20).map((i) => (
                <li
                  key={i.id}
                  className="rounded-lg bg-slate-950/80 border border-slate-800 px-2 py-1.5"
                >
                  <div className="font-medium text-slate-100">
                    {i.incidentType.toUpperCase()} • Sev {i.severity}
                  </div>
                  <div className="text-slate-300">{i.title}</div>
                  {i.sourceUrl && (
                    <a
                      href={i.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-emerald-300 underline"
                    >
                      Source
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
    </div>
  );
};

export default MapClient;
