import { getUnsafeAreas } from "@/lib/unsafe";

export default function AreasToAvoid() {
  const areas = getUnsafeAreas();
  return (
    <div>
      <h3>Areas to Avoid</h3>
      <p className="badge">Permanent Exclusions</p>
      <ul>
        {areas.map((a) => (
          <li key={a.id}>
            <strong>{a.name}</strong> — {a.city} ({a.province}){a.reason ? `: ${a.reason}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
