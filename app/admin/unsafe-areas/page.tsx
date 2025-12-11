"use client";

import { useEffect, useState } from "react";

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
  geometry: any;
  createdAt: string;
  updatedAt: string;
}

interface FormState {
  id?: string;
  name: string;
  city: string;
  province: string;
  country: string;
  type: UnsafeAreaType;
  riskLevel: RiskLevel;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  notes: string;
  geometryJson: string;
}

const emptyForm: FormState = {
  name: "",
  city: "",
  province: "",
  country: "South Africa",
  type: "permanent",
  riskLevel: "high",
  isActive: true,
  startsAt: "",
  endsAt: "",
  notes: "",
  geometryJson: "",
};

export default function UnsafeAreasAdminPage() {
  const [areas, setAreas] = useState<UnsafeArea[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const isEditing = !!form.id;

  useEffect(() => {
    void loadAreas();
  }, []);

  async function loadAreas() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/unsafe-areas");
      if (!res.ok) {
        throw new Error(`Failed to load areas: ${res.status}`);
      }
      const data = (await res.json()) as UnsafeArea[];
      setAreas(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Failed to load unsafe areas");
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(area: UnsafeArea) {
    setForm({
      id: area.id,
      name: area.name,
      city: area.city ?? "",
      province: area.province ?? "",
      country: area.country ?? "South Africa",
      type: area.type,
      riskLevel: area.riskLevel,
      isActive: area.isActive,
      startsAt: area.startsAt ?? "",
      endsAt: area.endsAt ?? "",
      notes: area.notes ?? "",
      geometryJson: JSON.stringify(area.geometry, null, 2),
    });
  }

  function handleNew() {
    setForm(emptyForm);
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this unsafe area?")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/unsafe-areas/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to delete unsafe area");
      }
      await loadAreas();
      if (form.id === id) {
        setForm(emptyForm);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Failed to delete unsafe area");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload: any = {
        name: form.name,
        city: form.city || undefined,
        province: form.province || undefined,
        country: form.country || undefined,
        type: form.type,
        riskLevel: form.riskLevel,
        isActive: form.isActive,
        startsAt: form.startsAt || undefined,
        endsAt: form.endsAt || undefined,
        notes: form.notes || undefined,
        geometryJson: form.geometryJson,
      };

      const url = isEditing
        ? `/api/unsafe-areas/${form.id}`
        : "/api/unsafe-areas";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to save unsafe area");
      }

      await loadAreas();
      if (!isEditing) {
        setForm(emptyForm);
      } else {
        setForm((prev) => ({
          ...prev,
          id: body.id,
        }));
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Failed to save unsafe area");
    } finally {
      setSaving(false);
    }
  }

  function handleChange<K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Unsafe Areas Registry</h1>
        <p className="text-sm text-gray-600">
          Manage permanent and temporary unsafe zones used by TravelSafePilot
          for routing and advice.
        </p>
      </header>

      {error && (
        <div className="border border-red-300 bg-red-50 text-red-800 px-4 py-2 rounded">
          {error}
        </div>
      )}

      <section className="grid md:grid-cols-2 gap-8">
        {/* List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Existing Areas</h2>
            <button
              type="button"
              onClick={handleNew}
              className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50"
              disabled={saving}
            >
              New Area
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : areas.length === 0 ? (
            <p className="text-sm text-gray-500">
              No unsafe areas defined yet.
            </p>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Location</th>
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">Risk</th>
                    <th className="p-2 text-left">Active</th>
                    <th className="p-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {areas.map((area) => (
                    <tr key={area.id} className="border-t">
                      <td className="p-2">{area.name}</td>
                      <td className="p-2 text-xs text-gray-700">
                        {[area.city, area.province, area.country]
                          .filter(Boolean)
                          .join(", ")}
                      </td>
                      <td className="p-2 capitalize text-xs">{area.type}</td>
                      <td className="p-2 capitalize text-xs">
                        {area.riskLevel}
                      </td>
                      <td className="p-2 text-xs">
                        {area.isActive ? "Yes" : "No"}
                      </td>
                      <td className="p-2 text-right space-x-2">
                        <button
                          type="button"
                          className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                          onClick={() => handleEdit(area)}
                          disabled={saving}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-xs px-2 py-1 border border-red-300 text-red-700 rounded hover:bg-red-50"
                          onClick={() => handleDelete(area.id)}
                          disabled={saving}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="space-y-4">
          <h2 className="font-semibold">
            {isEditing ? "Edit Unsafe Area" : "New Unsafe Area"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3 text-sm">
            <div className="space-y-1">
              <label className="block font-medium">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full border rounded px-2 py-1"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block font-medium">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  className="w-full border rounded px-2 py-1"
                />
              </div>
              <div className="space-y-1">
                <label className="block font-medium">Province</label>
                <input
                  type="text"
                  value={form.province}
                  onChange={(e) => handleChange("province", e.target.value)}
                  className="w-full border rounded px-2 py-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block font-medium">Country</label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => handleChange("country", e.target.value)}
                  className="w-full border rounded px-2 py-1"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-medium">Type</label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    handleChange("type", e.target.value as UnsafeAreaType)
                  }
                  className="w-full border rounded px-2 py-1"
                >
                  <option value="permanent">Permanent</option>
                  <option value="temporary">Temporary</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block font-medium">Risk Level</label>
                <select
                  value={form.riskLevel}
                  onChange={(e) =>
                    handleChange("riskLevel", e.target.value as RiskLevel)
                  }
                  className="w-full border rounded px-2 py-1"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="extreme">Extreme</option>
                </select>
              </div>

              <div className="space-y-1 flex items-end">
                <label className="inline-flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      handleChange("isActive", e.target.checked)
                    }
                  />
                  <span className="font-medium">Active</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block font-medium text-xs">
                  Starts At (ISO, optional)
                </label>
                <input
                  type="text"
                  placeholder="2025-12-09T00:00:00Z"
                  value={form.startsAt}
                  onChange={(e) => handleChange("startsAt", e.target.value)}
                  className="w-full border rounded px-2 py-1 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="block font-medium text-xs">
                  Ends At (ISO, optional)
                </label>
                <input
                  type="text"
                  placeholder="2025-12-10T00:00:00Z"
                  value={form.endsAt}
                  onChange={(e) => handleChange("endsAt", e.target.value)}
                  className="w-full border rounded px-2 py-1 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block font-medium">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                className="w-full border rounded px-2 py-1"
                rows={2}
              />
            </div>

            <div className="space-y-1">
              <label className="block font-medium">
                Geometry (GeoJSON Polygon/MultiPolygon)
              </label>
              <textarea
                value={form.geometryJson}
                onChange={(e) =>
                  handleChange("geometryJson", e.target.value)
                }
                className="w-full border rounded px-2 py-1 font-mono text-xs"
                rows={8}
                placeholder={`Paste GeoJSON here, e.g.:

{
  "type": "Polygon",
  "coordinates": [
    [
      [28.041, -26.204],
      [28.042, -26.205],
      [28.043, -26.204],
      [28.041, -26.204]
    ]
  ]
}
`}
                required
              />
              <p className="text-xs text-gray-500">
                You can generate polygons using tools like geojson.io and paste
                them here. Later we can hook this into the live Google Map
                editor.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 rounded bg-black text-white text-sm disabled:opacity-60"
              >
                {saving
                  ? isEditing
                    ? "Saving..."
                    : "Creating..."
                  : isEditing
                  ? "Save Changes"
                  : "Create Area"}
              </button>

              {isEditing && (
                <button
                  type="button"
                  onClick={handleNew}
                  className="text-xs text-gray-600 underline"
                  disabled={saving}
                >
                  Cancel edit
                </button>
              )}
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
