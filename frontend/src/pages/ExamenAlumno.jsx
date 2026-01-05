// src/pages/examenes/ExamenAlumno.jsx
import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import Button from "../components/ui/Button";
import { Clock, CheckCircle, Send } from "lucide-react";

function unwrapResponse(data) {
  if (!data) return null;
  if (typeof data === "object" && data !== null && "response" in data) return data.response;
  return data;
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

/** ============================
 *  RESPUESTA SHAPES (frontend)
 *  ============================
 * opcion_multiple:
 *   - single: { seleccion: number|null }
 *   - multiple: { seleccion: number[] }
 *
 * verdadero_falso:
 *   - { valor: true|false|null }
 *
 * abierta:
 *   - { texto: string }
 *
 * numerica:
 *   - { valor: number|string }
 *
 * completar:
 *   - { blanks: [{ id, valor }] }
 *
 * relacionar:
 *   - { matches: [{ izq_id, der_id }] }
 *
 * ordenar:
 *   - { orden: number[] } // índices sobre items/opciones
 */

/** ============================
 *  HELPERS: Completar + Relacionar + Ordenar
 *  ============================ */
function buildCompletarMapFromResp(resp) {
  const map = new Map();
  const blanks = safeArray(resp?.blanks);
  for (const b of blanks) {
    const id = b?.id ?? b?.blank_id ?? b?.index;
    const val = b?.valor ?? b?.value ?? b?.texto ?? b?.text ?? "";
    if (id != null) map.set(String(id), String(val ?? ""));
  }
  return map;
}

function upsertCompletarBlank(resp, blankId, value) {
  const id = String(blankId);
  const cur = resp && typeof resp === "object" ? resp : {};
  const blanks = safeArray(cur.blanks).map((b) => ({
    id: b?.id ?? b?.blank_id ?? b?.index,
    valor: b?.valor ?? b?.value ?? b?.texto ?? b?.text ?? "",
  }));

  const next = blanks.filter((b) => String(b.id) !== id);
  next.push({ id: blankId, valor: value });

  next.sort((a, b) => {
    const na = Number(a.id);
    const nb = Number(b.id);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return String(a.id).localeCompare(String(b.id));
  });

  return { ...cur, blanks: next };
}

function upsertMatch(resp, izq_id, der_id) {
  const cur = resp && typeof resp === "object" ? resp : {};
  const matches = safeArray(cur.matches).map((m) => ({
    izq_id: m?.izq_id,
    der_id: m?.der_id,
  }));

  const next = matches.filter((m) => String(m.izq_id) !== String(izq_id));
  next.push({ izq_id, der_id });

  return { ...cur, matches: next };
}

function getMatchedDer(resp, izq_id) {
  const matches = safeArray(resp?.matches);
  const found = matches.find((m) => String(m?.izq_id) === String(izq_id));
  return found?.der_id ?? "";
}

function pickOrdenarItems(contenido) {
  if (!contenido) return [];
  if (Array.isArray(contenido.items)) return contenido.items;
  if (Array.isArray(contenido.opciones)) return contenido.opciones;
  return [];
}

function normalizeOrdenarInit(items, resp) {
  const n = items.length;
  const raw = safeArray(resp?.orden);

  // Si ya trae orden válido (permutación de 0..n-1), úsalo.
  if (raw.length === n) {
    const nums = raw.map((x) => Number(x));
    const ok = nums.every((x) => Number.isInteger(x) && x >= 0 && x < n);
    if (ok) {
      const set = new Set(nums);
      if (set.size === n) return nums;
    }
  }

  // si no, orden base [0..n-1]
  return Array.from({ length: n }, (_, i) => i);
}

function moveInArray(arr, from, to) {
  const a = arr.slice();
  const [it] = a.splice(from, 1);
  a.splice(to, 0, it);
  return a;
}

/** ============================
 *  Render principal de pregunta
 *  (SOLO inputs para responder)
 *  ============================ */
function RenderizarPregunta({ pregunta, respuesta, onChange, disabled }) {
  const tipo = String(pregunta?.tipo || "").toLowerCase();
  const contenido = pregunta?.contenido ?? {};

  // OPCIÓN MÚLTIPLE
  if (tipo === "opcion_multiple") {
    const opciones = safeArray(contenido?.opciones);
    const multiple = Boolean(contenido?.multiple);

    const sel = respuesta?.seleccion;
    const selSet = new Set(
      multiple ? safeArray(sel).map((n) => Number(n)).filter(Number.isFinite) : []
    );
    const selSingle = !multiple ? (Number.isFinite(Number(sel)) ? Number(sel) : null) : null;

    return (
      <div className="space-y-2">
        {opciones.map((opc, idx) => {
          const label = isNonEmptyString(opc) ? opc : String(opc ?? "");
          const checked = multiple ? selSet.has(idx) : selSingle === idx;

          return (
            <label
              key={idx}
              className={[
                "flex items-start gap-3 p-3 rounded-lg border transition",
                disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-slate-50",
                checked ? "border-brand-red/40 bg-brand-red/5" : "border-slate-200",
              ].join(" ")}
            >
              <input
                disabled={disabled}
                type={multiple ? "checkbox" : "radio"}
                name={`pregunta_${pregunta.pregunta_version_id}`}
                checked={checked}
                onChange={(e) => {
                  if (disabled) return;

                  if (multiple) {
                    const next = new Set(selSet);
                    if (e.target.checked) next.add(idx);
                    else next.delete(idx);
                    onChange({ seleccion: Array.from(next).sort((a, b) => a - b) });
                  } else {
                    onChange({ seleccion: idx });
                  }
                }}
                className="mt-0.5"
              />
              <span className="text-sm text-slate-800">{label}</span>
            </label>
          );
        })}
      </div>
    );
  }

  // VERDADERO / FALSO
  if (tipo === "verdadero_falso") {
    const cur = respuesta?.valor;

    return (
      <div className="space-y-2">
        {[
          { valor: true, label: "Verdadero" },
          { valor: false, label: "Falso" },
        ].map((opt) => {
          const checked = cur === opt.valor;

          return (
            <label
              key={String(opt.valor)}
              className={[
                "flex items-center gap-3 p-3 rounded-lg border transition",
                disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-slate-50",
                checked ? "border-brand-red/40 bg-brand-red/5" : "border-slate-200",
              ].join(" ")}
            >
              <input
                disabled={disabled}
                type="radio"
                name={`pregunta_${pregunta.pregunta_version_id}`}
                checked={checked}
                onChange={() => {
                  if (disabled) return;
                  onChange({ valor: opt.valor });
                }}
              />
              <span className="text-sm text-slate-800">{opt.label}</span>
            </label>
          );
        })}
      </div>
    );
  }

  // ABIERTA (sin mostrar “respuesta esperada”)
  if (tipo === "abierta") {
    return (
      <textarea
        disabled={disabled}
        value={respuesta?.texto ?? ""}
        onChange={(e) => onChange({ texto: e.target.value })}
        className={[
          "w-full min-h-[120px] p-3 border rounded-lg text-sm resize-y",
          disabled ? "bg-slate-100 border-slate-200" : "bg-white border-slate-300",
        ].join(" ")}
        placeholder="Escribe tu respuesta aquí..."
      />
    );
  }

  // NUMÉRICA
  if (tipo === "numerica") {
    return (
      <input
        disabled={disabled}
        type="number"
        step="any"
        value={respuesta?.valor ?? ""}
        onChange={(e) => onChange({ valor: e.target.value })}
        className={[
          "w-full max-w-xs p-3 border rounded-lg text-sm",
          disabled ? "bg-slate-100 border-slate-200" : "bg-white border-slate-300",
        ].join(" ")}
        placeholder="Ingresa tu respuesta numérica"
      />
    );
  }

  // COMPLETAR
  if (tipo === "completar") {
    const blanks = safeArray(contenido?.blanks);
    const map = buildCompletarMapFromResp(respuesta);

    const base = String(pregunta?.enunciado ?? "");
    const parts = base.split("___");
    const canInline = parts.length > 1 && blanks.length > 0;

    const onBlankChange = (blankId, value) => {
      const next = upsertCompletarBlank(respuesta, blankId, value);
      onChange(next);
    };

    return (
      <div className="space-y-4">
        {canInline ? (
          <div className="text-sm text-slate-900 leading-relaxed">
            {parts.map((txt, i) => {
              const blank = blanks[i];
              const bid = blank?.id ?? i;
              const val = map.get(String(bid)) ?? "";

              return (
                <span key={i}>
                  {txt}
                  {i < parts.length - 1 ? (
                    <span className="inline-flex items-center mx-1 align-baseline">
                      <input
                        disabled={disabled}
                        value={val}
                        onChange={(e) => onBlankChange(bid, e.target.value)}
                        className={[
                          "min-w-[140px] px-2 py-1 rounded-md border text-sm",
                          disabled ? "bg-slate-100 border-slate-200" : "bg-white border-slate-300",
                        ].join(" ")}
                        placeholder={String(blank?.placeholder ?? "___")}
                      />
                    </span>
                  ) : null}
                </span>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-slate-700">Completa los espacios:</div>
        )}

        {!canInline && blanks.length > 0 && (
          <div className="space-y-3">
            {blanks.map((b, idx) => {
              const bid = b?.id ?? idx;
              const val = map.get(String(bid)) ?? "";
              return (
                <div key={String(bid)} className="rounded-lg border border-slate-200 p-3">
                  <div className="text-xs text-slate-500 mb-2">Espacio #{String(bid)}</div>
                  <input
                    disabled={disabled}
                    value={val}
                    onChange={(e) => onBlankChange(bid, e.target.value)}
                    className={[
                      "w-full px-3 py-2 rounded-lg border text-sm",
                      disabled ? "bg-slate-100 border-slate-200" : "bg-white border-slate-300",
                    ].join(" ")}
                    placeholder={String(b?.placeholder ?? "___")}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // RELACIONAR
  if (tipo === "relacionar") {
    const izq = safeArray(contenido?.izq);
    const der = safeArray(contenido?.der);
    const oneToOne = Boolean(contenido?.one_to_one);

    const onPick = (izqId, derId) => {
      if (disabled) return;
      const next = upsertMatch(respuesta, izqId, derId);
      onChange(next);
    };

    const usedRights = new Set(
      safeArray(respuesta?.matches)
        .map((m) => m?.der_id)
        .filter((x) => x != null)
        .map(String)
    );

    return (
      <div className="space-y-3">
        <div className="text-xs text-slate-500">
          Relaciona cada elemento de la izquierda con uno de la derecha. {oneToOne ? "(1 a 1)" : ""}
        </div>

        <div className="space-y-3">
          {izq.map((l) => {
            const lid = l?.id;
            const ltxt = String(l?.texto ?? "");
            const curRid = getMatchedDer(respuesta, lid);

            return (
              <div key={String(lid)} className="rounded-lg border border-slate-200 p-3">
                <div className="text-sm text-slate-900 font-medium mb-2">{ltxt}</div>

                <select
                  disabled={disabled}
                  value={curRid || ""}
                  onChange={(e) => onPick(lid, e.target.value)}
                  className={[
                    "w-full rounded-lg border px-3 py-2 text-sm",
                    disabled ? "bg-slate-100 border-slate-200" : "bg-white border-slate-300",
                  ].join(" ")}
                >
                  <option value="">— Selecciona —</option>
                  {der.map((r) => {
                    const rid = String(r?.id ?? "");
                    const rtxt = String(r?.texto ?? "");
                    const isUsedByOther = oneToOne && usedRights.has(rid) && String(curRid) !== rid;

                    return (
                      <option key={rid} value={rid} disabled={isUsedByOther}>
                        {rtxt}
                        {isUsedByOther ? " (usado)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ORDENAR
  if (tipo === "ordenar") {
    const items = pickOrdenarItems(contenido);
    const curOrden = normalizeOrdenarInit(items, respuesta);

    const onMove = (from, to) => {
      if (disabled) return;
      if (to < 0 || to >= curOrden.length) return;
      const nextOrden = moveInArray(curOrden, from, to);
      onChange({ orden: nextOrden });
    };

    if (!items.length) {
      return (
        <div className="p-4 bg-slate-50 rounded-lg text-sm text-slate-600">
          No hay elementos para ordenar.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="text-xs text-slate-500">Ordena los elementos usando ↑ ↓</div>

        <ul className="space-y-2">
          {curOrden.map((optIdx, pos) => {
            const label = items[optIdx] ?? `Opción #${optIdx}`;
            const canUp = pos > 0;
            const canDown = pos < curOrden.length - 1;

            return (
              <li
                key={`${pos}-${optIdx}`}
                className={[
                  "flex items-center gap-3 rounded-lg border p-3",
                  disabled ? "bg-slate-50 border-slate-200" : "bg-white border-slate-200",
                ].join(" ")}
              >
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                  {pos + 1}
                </span>

                <div className="flex-1 text-sm text-slate-900">{String(label)}</div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={disabled || !canUp}
                    onClick={() => onMove(pos, pos - 1)}
                    className={[
                      "px-2 py-1 rounded border text-xs",
                      disabled || !canUp ? "border-slate-200 text-slate-300" : "border-slate-300 hover:bg-slate-50",
                    ].join(" ")}
                    title="Subir"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={disabled || !canDown}
                    onClick={() => onMove(pos, pos + 1)}
                    className={[
                      "px-2 py-1 rounded border text-xs",
                      disabled || !canDown ? "border-slate-200 text-slate-300" : "border-slate-300 hover:bg-slate-50",
                    ].join(" ")}
                    title="Bajar"
                  >
                    ↓
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {!disabled ? (
          <div className="text-[11px] text-slate-500">
            *Se guarda automáticamente cada movimiento.
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="p-4 bg-slate-50 rounded-lg text-sm text-slate-600">
      <em>Tipo de pregunta "{tipo}" - Renderizado pendiente</em>
    </div>
  );
}

export default function ExamenAlumno({ currentUser }) {
  const { examenId } = useParams();
  const navigate = useNavigate();

  const timerRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [examenInfo, setExamenInfo] = useState(null);
  const [intento, setIntento] = useState(null);
  const [preguntas, setPreguntas] = useState([]);
  const [respuestas, setRespuestas] = useState({});

  const [tiempoRestante, setTiempoRestante] = useState(null);
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    if (!examenId) {
      setError("ID de examen inválido");
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/api/examenes/examen/${examenId}`);
        const data = unwrapResponse(res.data);
        setExamenInfo(data?.examen ?? data);
      } catch (e) {
        setError(e?.response?.data?.response || e?.message || "Error al cargar examen");
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [examenId]);

  const iniciarIntento = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await api.post(`/api/examenes/examen/${examenId}/iniciar`);
      const data = unwrapResponse(res.data);

      setIntento({ id: data.intento_id, num: data.intento_num });
      setPreguntas(safeArray(data.preguntas));
      setExamenInfo(data.examen);

      const inicial = {};
      for (const p of safeArray(data.preguntas)) {
        const pvId = p.pregunta_version_id;
        const tipo = String(p?.tipo || "").toLowerCase();

        if (tipo === "opcion_multiple") {
          const multiple = Boolean(p?.contenido?.multiple);
          inicial[pvId] = multiple ? { seleccion: [] } : { seleccion: null };
        } else if (tipo === "verdadero_falso") {
          inicial[pvId] = { valor: null };
        } else if (tipo === "abierta") {
          inicial[pvId] = { texto: "" };
        } else if (tipo === "numerica") {
          inicial[pvId] = { valor: "" };
        } else if (tipo === "completar") {
          inicial[pvId] = { blanks: [] };
        } else if (tipo === "relacionar") {
          inicial[pvId] = { matches: [] };
        } else if (tipo === "ordenar") {
          const items = pickOrdenarItems(p?.contenido);
          inicial[pvId] = { orden: Array.from({ length: items.length }, (_, i) => i) };
        } else {
          inicial[pvId] = null;
        }
      }
      setRespuestas(inicial);

      const duracionMs = (data.examen?.duracion_min || 60) * 60 * 1000;
      const finMs = Date.now() + duracionMs;
      setTiempoRestante(Math.floor(duracionMs / 1000));

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        const restante = Math.floor((finMs - Date.now()) / 1000);
        if (restante <= 0) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          setTiempoRestante(0);
          finalizarIntento(true);
        } else {
          setTiempoRestante(restante);
        }
      }, 1000);
    } catch (e) {
      setError(e?.response?.data?.response || e?.message || "No se pudo iniciar el intento");
    } finally {
      setSaving(false);
    }
  };

  const guardarRespuesta = async (preguntaVersionId, valor) => {
    if (!intento?.id) return;

    setRespuestas((prev) => ({ ...prev, [preguntaVersionId]: valor }));

    try {
      await api.post(`/api/examenes/intento/${intento.id}/responder`, {
        pregunta_version_id: preguntaVersionId,
        respuesta_json: valor, // si tu backend exige string: JSON.stringify(valor)
      });
    } catch (e) {
      console.error("Error al guardar respuesta:", e);
    }
  };

  const finalizarIntento = async (auto = false) => {
    if (!intento?.id) return;

    if (!auto && !enviado) {
      if (!window.confirm("¿Estás seguro de enviar tu examen? Ya no podrás modificar tus respuestas.")) return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await api.post(`/api/examenes/intento/${intento.id}/finalizar`);
      const data = unwrapResponse(res.data);
      setEnviado(true);
      alert(`Examen enviado. Calificación automática: ${data.calif_auto || 0}`);
    } catch (e) {
      setError(e?.response?.data?.response || e?.message || "Error al enviar examen");
    } finally {
      setSaving(false);
    }
  };

  const progreso = useMemo(() => {
    if (!preguntas.length) return 0;

    const contestadas = preguntas.filter((p) => {
      const pvId = p.pregunta_version_id;
      const tipo = String(p?.tipo || "").toLowerCase();
      const r = respuestas[pvId];
      if (!r) return false;

      if (tipo === "opcion_multiple") {
        const multiple = Boolean(p?.contenido?.multiple);
        if (multiple) return safeArray(r?.seleccion).length > 0;
        return Number.isFinite(Number(r?.seleccion));
      }
      if (tipo === "verdadero_falso") return typeof r?.valor === "boolean";
      if (tipo === "abierta") return isNonEmptyString(r?.texto);
      if (tipo === "numerica") return r?.valor !== "" && r?.valor != null;

      if (tipo === "completar") {
        const blanks = safeArray(p?.contenido?.blanks);
        const map = buildCompletarMapFromResp(r);
        return map.size > 0 && blanks.length > 0;
      }

      if (tipo === "relacionar") {
        const izq = safeArray(p?.contenido?.izq);
        const matches = safeArray(r?.matches);
        return matches.length > 0 && izq.length > 0;
      }

      if (tipo === "ordenar") {
        const items = pickOrdenarItems(p?.contenido);
        const ord = safeArray(r?.orden);
        // contestada si ya trae un array del tamaño correcto
        return items.length > 0 && ord.length === items.length;
      }

      return false;
    }).length;

    return Math.round((contestadas / preguntas.length) * 100);
  }, [respuestas, preguntas]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red mx-auto mb-4"></div>
          <div className="text-slate-600">Cargando examen...</div>
        </div>
      </div>
    );
  }

  if (error && !examenInfo) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  if (!intento && examenInfo) {
    const estado = String(examenInfo.estado || "").toLowerCase();
    const disponible = estado === "programado" || estado === "activo";

    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-lg">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              {examenInfo.tipo === "parcial" ? `Examen Parcial ${examenInfo.parcial_id || ""}` : "Examen Final"}
            </h1>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-sm text-slate-700">
              Estado: <span className="font-semibold">{examenInfo.estado}</span>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-600">Duración</span>
              <span className="font-semibold text-slate-900">{examenInfo.duracion_min} minutos</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-600">Número de preguntas</span>
              <span className="font-semibold text-slate-900">{examenInfo.num_preguntas}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-600">Intentos permitidos</span>
              <span className="font-semibold text-slate-900">{examenInfo.intentos_max}</span>
            </div>
          </div>

          {disponible ? (
            <>
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
                <strong>Instrucciones:</strong>
                <ul className="mt-2 ml-4 space-y-1 list-disc">
                  <li>Lee cuidadosamente cada pregunta antes de responder</li>
                  <li>Tus respuestas se guardan automáticamente</li>
                  <li>El tiempo comenzará al iniciar el examen</li>
                  <li>Asegúrate de tener una conexión estable a internet</li>
                </ul>
              </div>

              <Button variant="primary" onClick={iniciarIntento} disabled={saving} className="w-full py-3 text-base font-semibold">
                {saving ? "Iniciando..." : "Iniciar Examen"}
              </Button>
            </>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
              Este examen no está disponible en este momento
            </div>
          )}

          <div className="mt-6 flex justify-center">
            <Button variant="outline_secondary" onClick={() => navigate(-1)} className="inline-flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-slate-300">←</span>
              Volver
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (intento && !enviado) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                {examenInfo?.tipo === "parcial" ? `Parcial ${examenInfo.parcial_id || ""}` : "Examen Final"}
              </h1>
              <div className="text-xs text-slate-600 mt-0.5">Intento {intento.num}</div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg">
                <Clock size={18} className={tiempoRestante <= 300 ? "text-red-600" : "text-slate-600"} />
                <span className={`font-mono text-base font-semibold ${tiempoRestante <= 300 ? "text-red-600" : "text-slate-900"}`}>
                  {formatTime(tiempoRestante ?? 0)}
                </span>
              </div>

              <div className="text-sm">
                <span className="font-semibold text-slate-900">{progreso}%</span>
                <span className="text-slate-600 ml-1">completo</span>
              </div>

              <Button variant="primary" onClick={() => finalizarIntento(false)} disabled={saving} className="inline-flex items-center gap-2">
                <Send size={16} />
                Enviar
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

          <div className="space-y-6">
            {preguntas.map((p, idx) => (
              <div key={p.pregunta_version_id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-red text-white flex items-center justify-center font-semibold">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-base font-medium text-slate-900 mb-1">{p.enunciado}</div>
                    <div className="text-xs text-slate-500">
                      {p.puntos} punto{Number(p.puntos) !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>

                <div className="ml-14">
                  <RenderizarPregunta
                    pregunta={p}
                    respuesta={respuestas[p.pregunta_version_id]}
                    onChange={(valor) => guardarRespuesta(p.pregunta_version_id, valor)}
                    disabled={saving}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <Button variant="primary" onClick={() => finalizarIntento(false)} disabled={saving} className="px-8 py-3 text-base">
              <Send size={18} className="mr-2" />
              {saving ? "Enviando..." : "Enviar Examen"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (enviado) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="rounded-xl border border-green-200 bg-white p-8 shadow-lg text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">¡Examen enviado!</h1>
          <p className="text-slate-600 mb-6">Tu examen ha sido enviado correctamente. Pronto podrás ver tu calificación.</p>
          <Button variant="primary" onClick={() => navigate("/alumno/examenes")}>
            Ver mis exámenes
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
