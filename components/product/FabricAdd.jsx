// components/product/FabricAdd.jsx
"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";

const ROLES = ["main", "lining", "contrast", "padding", "other"];

const FABRIC_SUGGESTIONS = [
  "Cotton",
  "Linen",
  "Rayon",
  "Viscose",
  "Modal",
  "Georgette",
  "Chiffon",
  "Crepe",
  "Satin",
  "Silk",
  "Organza",
  "Tulle",
  "Net",
  "Velvet",
  "Jacquard",
  "Brocade",
  "Denim",
  // ✅ added
  "4 Way",
  "2 Way",
  "Sandwich",
  "Mesh",
];

const COLOR_SUGGESTIONS = [
  "Black",
  "White",
  "Off White",
  "Ivory",
  "Beige",
  "Grey",
  "Navy",
  "Red",
  "Wine",
  "Pink",
  "Peach",
  "Lavender",
  "Green",
  "Olive",
  "Mustard",
  "Gold",
  "Silver",
];

const s = (v) => String(v ?? "").trim();
const lower = (v) => s(v).toLowerCase();
const norm = (v) => s(v).replace(/\s+/g, " ");

export default function FabricAdd({ value = [], onChange, editable = true }) {
  const list = useMemo(() => (Array.isArray(value) ? value : []), [value]);

  const [row, setRow] = useState({
    fabricName: "",
    fabricCode: "",
    color: "",
    role: "main",
  });

  const commit = (next) => {
    const seen = new Set();
    const clean = [];

    for (const f of next) {
      const fabricName = norm(f?.fabricName);
      if (!fabricName) continue;

      const role = ROLES.includes(lower(f?.role)) ? lower(f.role) : "main";
      const key = `${lower(fabricName)}__${role}`;
      if (seen.has(key)) continue;
      seen.add(key);

      clean.push({
        fabricName,
        fabricCode: norm(f?.fabricCode),
        color: norm(f?.color),
        role,
      });
    }

    onChange?.(clean);
  };

  const add = () => {
    if (!editable) return;

    const fabricName = norm(row.fabricName);
    if (!fabricName) return alert("Fabric name is required");

    commit([
      ...list,
      {
        fabricName,
        fabricCode: norm(row.fabricCode),
        color: norm(row.color),
        role: row.role,
      },
    ]);

    setRow({ fabricName: "", fabricCode: "", color: "", role: "main" });
  };

  const remove = (i) => editable && commit(list.filter((_, idx) => idx !== i));

  const toggleChip = (k, v) => {
    if (!editable) return;
    setRow((p) => {
      const cur = norm(p[k]);
      const next = norm(v);
      return { ...p, [k]: cur.toLowerCase() === next.toLowerCase() ? "" : v };
    });
  };

  const isSelected = (k, v) =>
    norm(row[k]).toLowerCase() === norm(v).toLowerCase();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="space-y-1.5">
          <label className="lbl">Fabric name *</label>
          <input
            className="input"
            placeholder="e.g. Cotton"
            value={row.fabricName}
            onChange={(e) =>
              setRow((p) => ({ ...p, fabricName: e.target.value }))
            }
            disabled={!editable}
          />
        </div>

        <div className="space-y-1.5">
          <label className="lbl">Fabric code</label>
          <input
            className="input"
            placeholder="optional"
            value={row.fabricCode}
            onChange={(e) =>
              setRow((p) => ({ ...p, fabricCode: e.target.value }))
            }
            disabled={!editable}
          />
        </div>

        <div className="space-y-1.5">
          <label className="lbl">Fabric color</label>
          <input
            className="input"
            placeholder="optional"
            value={row.color}
            onChange={(e) => setRow((p) => ({ ...p, color: e.target.value }))}
            disabled={!editable}
          />
        </div>

        <div className="space-y-1.5">
          <label className="lbl">Role</label>
          <select
            className="input"
            value={row.role}
            onChange={(e) => setRow((p) => ({ ...p, role: e.target.value }))}
            disabled={!editable}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="lbl">Common fabrics</div>
        <div className="flex flex-wrap gap-2">
          {FABRIC_SUGGESTIONS.map((f) => {
            const on = isSelected("fabricName", f);
            return (
              <button
                key={f}
                type="button"
                onClick={() => toggleChip("fabricName", f)}
                className={`chip ${on ? "chipOn" : ""}`}
                disabled={!editable}
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="lbl">Common colors</div>
        <div className="flex flex-wrap gap-2">
          {COLOR_SUGGESTIONS.map((c) => {
            const on = isSelected("color", c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleChip("color", c)}
                className={`chip ${on ? "chipOn" : ""}`}
                disabled={!editable}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <button type="button" onClick={add} className="btn" disabled={!editable}>
        <Plus size={16} /> Add Fabric
      </button>

      {!!list.length && (
        <div className="space-y-2">
          {list.map((f, idx) => (
            <div key={`${f.fabricName}-${f.role}-${idx}`} className="row">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{f.fabricName}</span>
                {f.color ? (
                  <span className="text-gray-600">({f.color})</span>
                ) : null}
                <span className="badge">{f.role}</span>
              </div>

              {editable ? (
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="text-gray-500 hover:text-black"
                  aria-label="Remove"
                >
                  <X size={16} />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .lbl {
          font-size: 12px;
          color: #4b5563;
          font-weight: 600;
        }
        .input {
          width: 100%;
          padding: 0.75rem 1rem;
          background: #f3f4f6;
          border-radius: 0.75rem;
          outline: none;
        }
        .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 0.9rem;
          background: #000;
          color: #fff;
          border-radius: 0.75rem;
          font-size: 0.875rem;
        }
        .chip {
          padding: 0.35rem 0.6rem;
          border: 1px solid #e5e7eb;
          border-radius: 999px;
          font-size: 0.75rem;
          background: #fff;
          transition: 120ms;
        }
        .chipOn {
          background: #000;
          color: #fff;
          border-color: #000;
        }
        .row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: #f3f4f6;
          border-radius: 0.75rem;
          font-size: 0.875rem;
        }
        .badge {
          font-size: 0.7rem;
          text-transform: uppercase;
          padding: 0.15rem 0.45rem;
          border-radius: 0.5rem;
          background: #fff;
          border: 1px solid #e5e7eb;
        }
      `}</style>
    </div>
  );
}
