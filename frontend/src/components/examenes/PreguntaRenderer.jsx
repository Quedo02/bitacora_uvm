// src/components/examenes/PreguntaRenderer.jsx
import { CheckCircle } from "lucide-react";

export function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

export function safeJsonParse(v, fallback = null) {
  if (v == null) return fallback;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(String(v));
  } catch {
    return fallback;
  }
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function buildCompletarMapFromResp(resp) {
  const map = new Map();
  const blanks = safeArray(resp?.blanks);
  for (const b of blanks) {
    const id = b?.id ?? b?.blank_id ?? b?.index;
    if (id == null) continue;
    map.set(String(id), String(b?.valor ?? b?.value ?? ""));
  }
  return map;
}

function upsertCompletarBlank(resp, id, valor) {
  const blanks = safeArray(resp?.blanks).map((b) => ({ ...b }));
  const sid = String(id);
  const idx = blanks.findIndex((b) => String(b?.id ?? b?.blank_id ?? b?.index) === sid);
  if (idx >= 0) blanks[idx] = { ...blanks[idx], id, valor };
  else blanks.push({ id, valor });
  return { ...(resp || {}), blanks };
}

function upsertMatch(resp, izq_id, der_id) {
  const matches = safeArray(resp?.matches).map((m) => ({ ...m }));
  const sid = String(izq_id);
  const idx = matches.findIndex((m) => String(m?.izq_id) === sid);
  if (idx >= 0) matches[idx] = { ...matches[idx], izq_id, der_id };
  else matches.push({ izq_id, der_id });
  return { ...(resp || {}), matches };
}

function getMatchedDer(resp, izq_id) {
  const matches = safeArray(resp?.matches);
  const m = matches.find((x) => String(x?.izq_id) === String(izq_id));
  return m ? String(m?.der_id ?? "") : "";
}

function pickOrdenarItems(contenido) {
  if (!contenido) return [];
  const items = safeArray(contenido?.items);
  if (items.length) return items;
  const opciones = safeArray(contenido?.opciones);
  return opciones;
}

function normalizeOrdenarInit(items, resp) {
  const n = items.length;
  const raw = safeArray(resp?.orden).map((x) => Number(x));
  const ok = raw.length === n && raw.every((x) => Number.isInteger(x) && x >= 0 && x < n);
  if (ok) return raw;
  return Array.from({ length: n }, (_, i) => i);
}

function moveInArray(arr, from, to) {
  const next = arr.slice();
  const [v] = next.splice(from, 1);
  next.splice(to, 0, v);
  return next;
}

/**
 * Aplica el orden guardado (opciones_orden_json) al contenido
 * para que se vea tal cual el alumno lo vio.
 */
export function applyOrdenToContenido(tipo, contenido, opcionesOrdenJson) {
  const t = String(tipo || "").toLowerCase();
  const cont = safeJsonParse(contenido, contenido && typeof contenido === "object" ? contenido : {}) || {};
  const ord = safeJsonParse(opcionesOrdenJson, null);

  if (!ord || typeof ord !== "object") return cont;

  // Opción múltiple: ord.opciones = [3,2,1,0] etc.
  if (Array.isArray(cont?.opciones) && Array.isArray(ord?.opciones)) {
    const reordered = ord.opciones.map((i) => cont.opciones?.[i]).filter((x) => x !== undefined);
    return { ...cont, opciones: reordered };
  }

  // Ordenar: a veces guardas "items", a veces "opciones"
  if (t === "ordenar") {
    const items = Array.isArray(cont?.items) ? cont.items : safeArray(cont?.opciones);
    const order = Array.isArray(ord?.items) ? ord.items : Array.isArray(ord?.opciones) ? ord.opciones : null;
    if (items.length && Array.isArray(order)) {
      const reordered = order.map((i) => items?.[i]).filter((x) => x !== undefined);
      if (Array.isArray(cont?.items)) return { ...cont, items: reordered };
      return { ...cont, opciones: reordered };
    }
  }

  return cont;
}

export default function PreguntaRenderer({
  tipo,
  contenido,
  respuesta,
  onChange,
  disabled = false,
}) {
  const t = String(tipo || "").toLowerCase();
  const cont = contenido && typeof contenido === "object" ? contenido : safeJsonParse(contenido, {}) || {};
  const resp = respuesta && typeof respuesta === "object" ? respuesta : safeJsonParse(respuesta, null);

  // Opción múltiple
  if (t === "opcion_multiple") {
    const opciones = safeArray(cont?.opciones);
    const multiple = Boolean(cont?.multiple);

    const seleccionRaw = resp?.seleccion;
    const seleccion = multiple ? safeArray(seleccionRaw).map(Number) : seleccionRaw;

    const isSelected = (idx) => {
      if (multiple) return safeArray(seleccion).includes(idx);
      return Number(seleccion) === idx;
    };

    const toggle = (idx) => {
      if (disabled) return;
      if (multiple) {
        const set = new Set(safeArray(seleccion).map(Number));
        set.has(idx) ? set.delete(idx) : set.add(idx);
        onChange?.({ seleccion: Array.from(set) });
      } else {
        onChange?.({ seleccion: idx });
      }
    };

    if (!opciones.length) {
      return (
        <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-600">
          No hay opciones.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {opciones.map((opc, idx) => {
          const selected = isSelected(idx);
          return (
            <button
              key={idx}
              type="button"
              disabled={disabled}
              onClick={() => toggle(idx)}
              className={[
                "w-full text-left rounded-xl border-2 p-4 transition-all flex items-start gap-3",
                disabled ? "cursor-default" : "hover:border-slate-300",
                selected
                  ? "border-brand-red bg-brand-red/5"
                  : "border-slate-200 bg-white",
              ].join(" ")}
            >
              <span
                className={[
                  "mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full border-2",
                  selected ? "border-brand-red bg-brand-red text-white" : "border-slate-300",
                ].join(" ")}
              >
                {selected ? <CheckCircle size={14} /> : null}
              </span>
              <span className="text-sm text-slate-800">{String(opc)}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Verdadero/Falso
  if (t === "verdadero_falso") {
    const valor = resp?.valor;
    const set = (v) => {
      if (disabled) return;
      onChange?.({ valor: v });
    };

    return (
      <div className="grid grid-cols-2 gap-3">
        {[true, false].map((v) => {
          const selected = valor === v;
          return (
            <button
              key={String(v)}
              type="button"
              disabled={disabled}
              onClick={() => set(v)}
              className={[
                "rounded-xl border-2 p-4 text-center transition-all",
                disabled ? "cursor-default" : "hover:border-slate-300",
                selected ? "border-brand-red bg-brand-red/5" : "border-slate-200 bg-white",
              ].join(" ")}
            >
              <div className="text-sm font-semibold text-slate-900">
                {v ? "Verdadero" : "Falso"}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  // Abierta
  if (t === "abierta") {
    const texto = resp?.texto ?? "";
    return (
      <div className="space-y-2">
        <textarea
          disabled={disabled}
          value={texto}
          onChange={(e) => !disabled && onChange?.({ texto: e.target.value })}
          rows={4}
          className={[
            "w-full rounded-xl border-2 p-3 text-sm",
            disabled ? "bg-slate-50 border-slate-200" : "bg-white border-slate-200",
          ].join(" ")}
          placeholder="Escribe tu respuesta..."
        />
      </div>
    );
  }

  // Numérica
  if (t === "numerica") {
    const valor = resp?.valor ?? "";
    return (
      <div className="space-y-2">
        <input
          disabled={disabled}
          value={valor}
          onChange={(e) => !disabled && onChange?.({ valor: e.target.value })}
          className={[
            "w-full rounded-xl border-2 p-3 text-sm",
            disabled ? "bg-slate-50 border-slate-200" : "bg-white border-slate-200",
          ].join(" ")}
          placeholder="Número..."
        />
      </div>
    );
  }

  // Completar (blanks inline)
  if (t === "completar") {
    const texto = String(cont?.texto || "");
    const blanks = safeArray(cont?.blanks);

    if (!isNonEmptyString(texto) || !blanks.length) {
      return (
        <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-600">
          No hay contenido para completar.
        </div>
      );
    }

    const respMap = buildCompletarMapFromResp(resp);

    // Supone tokens como __1__ o {1} etc. (en tu data real ya lo manejas con ids)
    // Aquí: render por lista de blanks, porque tu contenido_json suele traer blanks[] con id
    return (
      <div className="space-y-3">
        <div className="p-4 rounded-xl border-2 border-slate-200 bg-white">
          <div className="text-sm text-slate-800 whitespace-pre-wrap">{texto}</div>
        </div>

        <div className="space-y-2">
          {blanks.map((b, idx) => {
            const bid = String(b?.id ?? idx);
            const val = respMap.get(bid) ?? "";
            return (
              <div key={bid} className="flex items-center gap-3">
                <div className="text-xs font-medium text-slate-500 w-24">Blank #{bid}</div>
                <input
                  disabled={disabled}
                  value={val}
                  onChange={(e) => {
                    if (disabled) return;
                    onChange?.(upsertCompletarBlank(resp || { blanks: [] }, bid, e.target.value));
                  }}
                  className={[
                    "flex-1 rounded-xl border-2 p-3 text-sm",
                    disabled ? "bg-slate-50 border-slate-200" : "bg-white border-slate-200",
                  ].join(" ")}
                  placeholder="Respuesta..."
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Relacionar
  if (t === "relacionar") {
    const izq = safeArray(cont?.izq);
    const der = safeArray(cont?.der);

    if (!izq.length || !der.length) {
      return (
        <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-600">
          No hay pares para relacionar.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {izq.map((l) => {
          const lid = String(l?.id);
          const selected = getMatchedDer(resp, lid);
          return (
            <div key={lid} className="rounded-xl border-2 border-slate-200 bg-white p-4">
              <div className="text-sm font-medium text-slate-900 mb-2">{l?.texto}</div>
              <select
                disabled={disabled}
                value={selected}
                onChange={(e) => {
                  if (disabled) return;
                  onChange?.(upsertMatch(resp || { matches: [] }, lid, e.target.value));
                }}
                className={[
                  "w-full rounded-xl border-2 p-3 text-sm",
                  disabled ? "bg-slate-50 border-slate-200" : "bg-white border-slate-200",
                ].join(" ")}
              >
                <option value="">Selecciona…</option>
                {der.map((d) => (
                  <option key={String(d?.id)} value={String(d?.id)}>
                    {d?.texto}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    );
  }

  // Ordenar
  if (t === "ordenar") {
    const items = pickOrdenarItems(cont);
    const curOrden = normalizeOrdenarInit(items, resp);
    const onMove = (from, to) => {
      if (disabled || to < 0 || to >= curOrden.length) return;
      onChange?.({ orden: moveInArray(curOrden, from, to) });
    };

    if (!items.length) {
      return (
        <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-600">
          No hay elementos para ordenar.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <ul className="space-y-2">
          {curOrden.map((optIdx, pos) => {
            const label = items[optIdx] ?? `Opción #${optIdx}`;
            const canUp = pos > 0;
            const canDown = pos < curOrden.length - 1;

            return (
              <li
                key={`${pos}-${optIdx}`}
                className={[
                  "flex items-center gap-4 rounded-xl border-2 p-4 transition-all",
                  disabled ? "bg-slate-50 border-slate-200" : "bg-white border-slate-200",
                ].join(" ")}
              >
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-brand-red to-brand-wine text-white text-sm font-bold shadow-sm">
                  {pos + 1}
                </span>
                <div className="flex-1 text-sm text-slate-900">{String(label)}</div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={disabled || !canUp}
                    onClick={() => onMove(pos, pos - 1)}
                    className={[
                      "w-9 h-9 rounded-lg border-2 flex items-center justify-center text-sm font-bold",
                      disabled || !canUp
                        ? "border-slate-200 text-slate-300 cursor-not-allowed"
                        : "border-slate-300 text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={disabled || !canDown}
                    onClick={() => onMove(pos, pos + 1)}
                    className={[
                      "w-9 h-9 rounded-lg border-2 flex items-center justify-center text-sm font-bold",
                      disabled || !canDown
                        ? "border-slate-200 text-slate-300 cursor-not-allowed"
                        : "border-slate-300 text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    ↓
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-600">
      <em>Tipo de pregunta "{tipo}" no soportado</em>
    </div>
  );
}
