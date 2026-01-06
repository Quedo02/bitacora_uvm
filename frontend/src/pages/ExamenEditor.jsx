// src/pages/examenes/ExamenEditor.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import Skeleton from "../components/ui/Skeleton";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import { ArrowLeft, Wand2, Eye, Trash2, Send, Lock, AlertTriangle, Clock, CheckCircle } from "lucide-react";

function unwrapResponse(data) {
  if (!data) return null;
  if (typeof data === "object" && data !== null && "response" in data) return data.response;
  return data;
}

function safeArray(v) { return Array.isArray(v) ? v : []; }

function toDatetimeLocal(mysqlDt) {
  if (!mysqlDt) return "";
  const s = String(mysqlDt).replace(" ", "T");
  return s.slice(0, 16);
}

function toMysqlDatetime(dtLocal) {
  if (!dtLocal) return "";
  return String(dtLocal).replace("T", " ") + ":00";
}

function pad2(n) { return String(n).padStart(2, "0"); }

function minDatetimeLocal(minutesAhead = 0) {
  const now = new Date();
  if (minutesAhead) now.setMinutes(now.getMinutes() + minutesAhead);
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}T${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
}

function sanitizeDatetimeLocal(v) {
  if (!v) return "";
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const normalized = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  if (normalized !== v) return "";
  if (d.getTime() < Date.now()) return "";
  return v;
}

function openDatetimePicker(inputEl) {
  if (!inputEl) return;
  if (typeof inputEl.showPicker === "function") inputEl.showPicker();
  else inputEl.focus();
}

function badgeClass(estado) {
  const e = String(estado || "").toLowerCase();
  if (e === "cerrado") return "bg-slate-100 text-slate-700";
  if (e === "programado") return "bg-green-100 text-green-700";
  if (e === "activo") return "bg-blue-100 text-blue-700";
  if (e === "borrador") return "bg-amber-100 text-amber-800";
  if (e === "archivado") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-700";
}

function safeJsonParse(v, fallback = null) {
  if (v == null) return fallback;
  if (typeof v === "object") return v;
  try { return JSON.parse(String(v)); } catch { return fallback; }
}

function getContenido(p) { return safeJsonParse(p?.opciones ?? p?.contenido_json ?? null, null); }
function getRespuesta(p) { return safeJsonParse(p?.respuesta ?? p?.respuesta_json ?? null, null); }
function asNum(v, fallback = 0) { const n = Number(v); return Number.isFinite(n) ? n : fallback; }
function isNonEmptyString(v) { return typeof v === "string" && v.trim().length > 0; }

function roundTo(v, decimals = 2) {
  const p = 10 ** decimals;
  return Math.round((Number(v) || 0) * p) / p;
}

function splitTotalPoints(total, n, decimals = 2) {
  const N = Number(n) || 0;
  if (N <= 0) return [];
  const base = roundTo(total / N, decimals);
  const arr = Array.from({ length: N }, () => base);
  const sum = roundTo(arr.reduce((a, b) => a + b, 0), decimals);
  const diff = roundTo(total - sum, decimals);
  arr[N - 1] = roundTo(arr[N - 1] + diff, decimals);
  return arr;
}

function Pill({ children, tone = "slate" }) {
  const map = { slate: "bg-slate-100 text-slate-700", green: "bg-emerald-100 text-emerald-800", amber: "bg-amber-100 text-amber-800", red: "bg-red-100 text-red-800", blue: "bg-blue-100 text-blue-800" };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[tone] || map.slate}`}>{children}</span>;
}

function Box({ title, children, subtitle }) {
  return (
    <div className="mt-4 ml-10 rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
        <div className="text-xs font-semibold text-slate-700">{title}</div>
        {subtitle && <div className="text-[11px] text-slate-500 mt-0.5">{subtitle}</div>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function detectTipo(cont, resp) {
  if (resp && Array.isArray(resp.orden)) return "ordenar";
  if (cont && (Array.isArray(cont.items) || Array.isArray(cont.opciones)) && resp && Array.isArray(resp.correcta)) return "opcion_multiple";
  if (resp && typeof resp.correcta === "boolean") return "verdadero_falso";
  if (resp && (typeof resp.valor === "number" || Number.isFinite(Number(resp.valor)))) return "numerica";
  if (cont && Array.isArray(cont.blanks)) return "completar";
  if (cont && (Array.isArray(cont.rubrica) || Array.isArray(cont.keywords))) return "abierta";
  if (resp && (Array.isArray(resp.keywords) || Number.isFinite(Number(resp.min_hits)))) return "abierta";
  if (cont && Array.isArray(cont.izq) && Array.isArray(cont.der) && resp && Array.isArray(resp.matches)) return "relacionar";
  return "desconocida";
}

function pickOptions(cont) {
  if (!cont) return [];
  if (Array.isArray(cont.items)) return cont.items;
  if (Array.isArray(cont.opciones)) return cont.opciones;
  return [];
}

function OptionRow({ index, text, ok, multiple }) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
      <span className="mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full border border-slate-300 bg-white">
        <span className={["block w-2.5 h-2.5 rounded-full", ok ? "bg-emerald-600" : "bg-transparent"].join(" ")} />
      </span>
      <div className="flex-1 leading-relaxed text-slate-900">
        {String(text)}
        {ok && <span className="ml-2 text-xs font-semibold text-emerald-700">(Correcta)</span>}
      </div>
    </li>
  );
}

function TrueFalsePreview({ correcta }) {
  return (
    <ul className="space-y-2">
      {[{ label: "Verdadero", value: true }, { label: "Falso", value: false }].map((it, idx) => {
        const ok = correcta === it.value;
        return (
          <li key={idx} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-slate-300 bg-white">
              <span className={["block w-2.5 h-2.5 rounded-full", ok ? "bg-emerald-600" : "bg-transparent"].join(" ")} />
            </span>
            <span className="flex-1 text-slate-900">{it.label}</span>
            {ok && <span className="text-xs font-semibold text-emerald-700">(Correcta)</span>}
          </li>
        );
      })}
    </ul>
  );
}

function NumericPreview({ valor, tolerancia, unidad }) {
  const u = isNonEmptyString(unidad) ? unidad.trim() : "";
  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-700">Respuesta correcta:</div>
      <div className="flex flex-wrap items-center gap-2">
        <input disabled value={String(valor ?? "")} className="w-40 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900" />
        {u && <Pill>{u}</Pill>}
        <Pill tone="green">Correcta</Pill>
      </div>
      <div className="text-xs text-slate-500">Tolerancia: <span className="font-semibold text-slate-700">{String(tolerancia ?? 0)}</span></div>
    </div>
  );
}

function OpenPreview({ rubrica, keywords, minHits }) {
  const r = safeArray(rubrica);
  const k = safeArray(keywords);
  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm text-slate-700 mb-2">Respuesta del alumno (ejemplo):</div>
        <textarea disabled placeholder="Aquí el alumno escribiría su respuesta…" className="w-full min-h-[96px] rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400" />
      </div>
      {(r.length > 0 || k.length > 0) && (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="text-xs font-semibold text-slate-700 mb-2">Criterios / guía</div>
          {r.length > 0 && <div className="mb-3"><div className="text-xs text-slate-600 mb-1">Rúbrica:</div><ul className="list-disc pl-5 text-sm text-slate-900 space-y-1">{r.map((x, i) => <li key={i}>{String(x)}</li>)}</ul></div>}
          {k.length > 0 && <div><div className="text-xs text-slate-600 mb-1">Se espera que incluya:</div><div className="flex flex-wrap gap-2">{k.map((x, i) => <Pill key={i} tone="blue">{String(x)}</Pill>)}</div>{asNum(minHits) > 0 && <div className="mt-2 text-xs text-slate-500">Mínimo de coincidencias: <span className="font-semibold text-slate-700">{minHits}</span></div>}</div>}
        </div>
      )}
    </div>
  );
}

function buildAnswerMapCompletar(resp) {
  const m = new Map();
  if (!resp) return m;
  const blanksArr = safeArray(resp.blanks);
  if (blanksArr.length) {
    for (const b of blanksArr) {
      const key = b?.id ?? b?.blank_id ?? b?.index;
      const val = b?.valor ?? b?.value ?? b?.respuesta ?? b?.text ?? b?.texto ?? "";
      if (key != null) m.set(String(key), String(val ?? ""));
    }
  }
  return m;
}

function CompletarPreview({ enunciado, blanks, answerMap }) {
  const b = safeArray(blanks);
  const base = String(enunciado ?? "");
  const parts = base.split("___");
  const getAns = (blank, idx) => answerMap.get(String(blank?.id ?? idx)) ?? "";

  return (
    <div className="space-y-4">
      {parts.length > 1 && b.length > 0 ? (
        <div className="text-sm text-slate-900 leading-relaxed">
          {parts.map((txt, i) => {
            const blank = b[i];
            const ans = blank ? getAns(blank, i) : "";
            return (
              <span key={i}>{txt}{i < parts.length - 1 && <span className="inline-flex items-center mx-1 align-baseline"><span className="min-w-[96px] px-2 py-1 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-900 text-sm font-semibold">{ans || "—"}</span></span>}</span>
            );
          })}
        </div>
      ) : <div className="text-sm text-slate-700">Respuestas correctas:</div>}
      <ul className="space-y-2">
        {b.map((blank, idx) => {
          const bid = blank?.id ?? idx;
          const ans = answerMap.get(String(bid)) ?? "";
          return (
            <li key={bid} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div><div className="text-xs text-slate-500">Espacio #{bid}</div><div className="text-xs text-slate-600">Tipo: <span className="font-medium text-slate-800">{String(blank?.tipo ?? "texto")}</span></div></div>
                <Pill tone={ans ? "green" : "amber"}>{ans ? "Correcta definida" : "Sin respuesta"}</Pill>
              </div>
              <div className="mt-2 text-sm text-slate-900"><span className="font-semibold">Correcta:</span> {ans ? <span className="text-emerald-700 font-semibold">{ans}</span> : <span className="text-slate-500">—</span>}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RelacionarPreview({ cont, resp }) {
  const izq = safeArray(cont?.izq);
  const der = safeArray(cont?.der);
  const matches = safeArray(resp?.matches);
  const rightMap = new Map(); for (const r of der) rightMap.set(String(r?.id), String(r?.texto ?? ""));
  const leftMap = new Map(); for (const l of izq) leftMap.set(String(l?.id), String(l?.texto ?? ""));
  const rows = matches.map((m) => ({ left: leftMap.get(String(m?.izq_id)) ?? "", right: rightMap.get(String(m?.der_id)) ?? "" })).filter((x) => x.left || x.right);

  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-700">Emparejamientos correctos:</div>
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr className="text-left text-xs text-slate-600"><th className="px-3 py-2 w-1/2">Columna A</th><th className="px-3 py-2 w-1/2">Columna B</th></tr></thead>
          <tbody>
            {rows.length ? rows.map((r, idx) => <tr key={idx} className="border-t border-slate-200"><td className="px-3 py-2 text-slate-900">{r.left || "—"}</td><td className="px-3 py-2 text-slate-900">{r.right || "—"}</td></tr>)
              : <tr className="border-t border-slate-200"><td colSpan={2} className="px-3 py-3 text-slate-500">No se pudieron interpretar los matches.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrdenarPreview({ items, orden }) {
  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-700">Orden correcto:</div>
      <ol className="space-y-2">
        {orden.map((optIdx, pos) => (
          <li key={`${pos}-${optIdx}`} className="flex items-start gap-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-semibold">{pos + 1}</span>
            <div className="text-sm text-slate-900">{items[optIdx] ?? `Opción #{optIdx}`}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function PreguntaPreviewDetalle({ p }) {
  const cont = getContenido(p);
  const resp = getRespuesta(p);
  const tipo = detectTipo(cont, resp);

  if (tipo === "ordenar") {
    const items = pickOptions(cont);
    const orden = safeArray(resp?.orden).map((x) => asNum(x, -1)).filter((n) => n >= 0);
    return <Box title="Ordenar" subtitle="Se muestra el orden correcto final">{items.length ? <OrdenarPreview items={items} orden={orden} /> : <div className="text-sm text-slate-500">No hay opciones para ordenar.</div>}</Box>;
  }
  if (tipo === "opcion_multiple") {
    const opciones = safeArray(cont?.opciones);
    const correctasArr = safeArray(resp?.correcta);
    const correctas = new Set(correctasArr.map((n) => asNum(n, -1)).filter((n) => n >= 0));
    const multiple = Boolean(cont?.multiple);
    return <Box title={multiple ? "Selección múltiple" : "Selección única"} subtitle={multiple ? "Puede haber más de una respuesta correcta" : "Solo una respuesta correcta"}>{opciones.length ? <ul className="space-y-2">{opciones.map((txt, idx) => <OptionRow key={idx} index={idx} text={txt} ok={correctas.has(idx)} multiple={multiple} />)}</ul> : <div className="text-sm text-slate-500">No hay opciones definidas.</div>}</Box>;
  }
  if (tipo === "verdadero_falso") return <Box title="Verdadero / Falso" subtitle="Se marca la opción correcta"><TrueFalsePreview correcta={resp?.correcta} /></Box>;
  if (tipo === "numerica") return <Box title="Respuesta numérica" subtitle="Se muestra el valor correcto y su tolerancia"><NumericPreview valor={resp?.valor} tolerancia={resp?.tolerancia} unidad={cont?.unidad} /></Box>;
  if (tipo === "abierta") return <Box title="Respuesta abierta" subtitle="Aquí el alumno responde con texto"><OpenPreview rubrica={cont?.rubrica} keywords={resp?.keywords ?? cont?.keywords} minHits={resp?.min_hits} /></Box>;
  if (tipo === "completar") {
    const blanks = safeArray(cont?.blanks);
    const map = buildAnswerMapCompletar(resp);
    return <Box title="Completar" subtitle="Se muestran los espacios y la respuesta correcta"><CompletarPreview enunciado={p?.enunciado} blanks={blanks} answerMap={map} /></Box>;
  }
  if (tipo === "relacionar") return <Box title="Relacionar columnas" subtitle="Se muestran los emparejamientos correctos"><RelacionarPreview cont={cont} resp={resp} /></Box>;

  return (
    <Box title="Tipo de pregunta no reconocido" subtitle="No se pudo interpretar automáticamente este formato">
      <div className="text-sm text-slate-700">Por ahora esta pregunta no tiene renderer visual.</div>
      <details className="mt-3"><summary className="cursor-pointer text-xs text-slate-500">Ver datos técnicos</summary><div className="mt-2 rounded bg-slate-50 p-3 text-xs text-slate-600 overflow-auto"><pre className="whitespace-pre-wrap">{JSON.stringify({ contenido: cont, respuesta: resp }, null, 2)}</pre></div></details>
    </Box>
  );
}

export default function ExamenEditor({ currentUser }) {
  const { seccionId, examenId } = useParams();
  const navigate = useNavigate();
  const fechaInicioRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [examenDetalle, setExamenDetalle] = useState(null);
  const [puntosDraft, setPuntosDraft] = useState({});
  const [vistaPrevia, setVistaPrevia] = useState(false);

  // Determinar si el examen es editable
  const { esEditable, razonNoEditable, examenHaComenzado } = useMemo(() => {
    const estado = String(examenDetalle?.examen?.estado || "").toLowerCase();
    const fechaInicio = examenDetalle?.examen?.fecha_inicio;
    
    if (!fechaInicio) return { esEditable: estado === "borrador", razonNoEditable: "", examenHaComenzado: false };
    
    const inicio = new Date(fechaInicio);
    const haComenzado = Date.now() >= inicio.getTime();
    
    if (estado === "borrador") {
      return { esEditable: true, razonNoEditable: "", examenHaComenzado: false };
    }
    
    if (estado === "programado" && !haComenzado) {
      return { esEditable: true, razonNoEditable: "", examenHaComenzado: false };
    }
    
    if (estado === "programado" && haComenzado) {
      return { esEditable: false, razonNoEditable: "El examen ya ha comenzado", examenHaComenzado: true };
    }
    
    if (estado === "activo") {
      return { esEditable: false, razonNoEditable: "El examen está en curso", examenHaComenzado: true };
    }
    
    if (estado === "cerrado") {
      return { esEditable: false, razonNoEditable: "El examen está cerrado", examenHaComenzado: true };
    }
    
    return { esEditable: false, razonNoEditable: "Estado no reconocido", examenHaComenzado: false };
  }, [examenDetalle?.examen?.estado, examenDetalle?.examen?.fecha_inicio]);

  const totalPuntos = useMemo(() => {
    const rows = safeArray(examenDetalle?.preguntas);
    let sum = 0;
    for (const p of rows) sum += Number(p?.puntos ?? 0) || 0;
    return Math.round(sum * 100) / 100;
  }, [examenDetalle?.preguntas]);

  const TOTAL_OBJETIVO = 10;
  const totalOk = useMemo(() => Math.abs((Number(totalPuntos) || 0) - TOTAL_OBJETIVO) < 0.0001, [totalPuntos]);
  const numPreguntasOk = useMemo(() => {
    const objetivo = Number(examenDetalle?.examen?.num_preguntas ?? 0) || 0;
    const actual = safeArray(examenDetalle?.preguntas).length;
    return objetivo > 0 ? actual === objetivo : actual > 0;
  }, [examenDetalle?.examen?.num_preguntas, examenDetalle?.preguntas]);

  useEffect(() => {
    if (!examenId) { setError("ID de examen inválido"); setLoading(false); return; }
    (async () => {
      setLoading(true); setError("");
      try {
        const res = await api.get(`/api/examenes/examen/${examenId}`);
        setExamenDetalle(unwrapResponse(res.data));
      } catch (e) { setError(e?.response?.data?.response || e?.message || "Error al cargar examen"); }
      finally { setLoading(false); }
    })();
  }, [examenId]);

  useEffect(() => {
    const rows = safeArray(examenDetalle?.preguntas);
    if (!rows.length) { setPuntosDraft({}); return; }
    const m = {};
    for (const p of rows) {
      const pvId = Number(p?.pregunta_version_id ?? 0);
      if (!pvId) continue;
      m[pvId] = String(p?.puntos ?? 1);
    }
    setPuntosDraft(m);
  }, [examenDetalle?.examen?.id]);

  const updateExamen = async (partial) => {
    const eid = Number(examenDetalle?.examen?.id ?? 0);
    if (!eid) return;
    setSaving(true); setError("");
    try {
      await api.put(`/api/examenes/examen/${eid}`, partial);
      const res = await api.get(`/api/examenes/examen/${eid}`);
      setExamenDetalle(unwrapResponse(res.data));
    } catch (e) { setError(e?.response?.data?.response || e?.message || "No se pudo actualizar"); }
    finally { setSaving(false); }
  };

  const applyAutoPoints = async (eid, det) => {
    const rows = safeArray(det?.preguntas);
    const n = rows.length;
    if (!n) return;
    const targets = splitTotalPoints(TOTAL_OBJETIVO, n, 2);
    for (let i = 0; i < n; i++) {
      const pvId = Number(rows[i]?.pregunta_version_id ?? 0);
      if (!pvId) continue;
      await api.put(`/api/examenes/examen/${eid}/pregunta/${pvId}`, { puntos: targets[i] });
    }
  };

  const actionArmar = async () => {
    const eid = Number(examenDetalle?.examen?.id ?? 0);
    if (!eid) return;
    setSaving(true); setError("");
    try {
      await api.post(`/api/examenes/examen/${eid}/armar`);
      const res1 = await api.get(`/api/examenes/examen/${eid}`);
      const det1 = unwrapResponse(res1.data);
      await applyAutoPoints(eid, det1);
      const res2 = await api.get(`/api/examenes/examen/${eid}`);
      setExamenDetalle(unwrapResponse(res2.data));
    } catch (e) { setError(e?.response?.data?.response || e?.message || "No se pudo armar"); }
    finally { setSaving(false); }
  };

  const actionPublicar = async () => {
    const eid = Number(examenDetalle?.examen?.id ?? 0);
    if (!eid) return;
    const objetivo = Number(examenDetalle?.examen?.num_preguntas ?? 0) || 0;
    const actual = safeArray(examenDetalle?.preguntas).length;
    if (objetivo > 0 && actual !== objetivo) { setError(`No puedes publicar: el examen requiere ${objetivo} preguntas y actualmente tiene ${actual}.`); return; }
    if (Math.abs((Number(totalPuntos) || 0) - TOTAL_OBJETIVO) > 0.0001) { setError(`No puedes publicar: el total de puntos debe ser ${TOTAL_OBJETIVO}. Actualmente: ${totalPuntos}.`); return; }
    if (!window.confirm("¿Estás seguro de publicar este examen? Ya no podrás editar la configuración ni las preguntas una vez comience.")) return;
    setSaving(true); setError("");
    try {
      await api.post(`/api/examenes/examen/${eid}/publicar`);
      const res = await api.get(`/api/examenes/examen/${eid}`);
      setExamenDetalle(unwrapResponse(res.data));
    } catch (e) { setError(e?.response?.data?.response || e?.message || "No se pudo publicar"); }
    finally { setSaving(false); }
  };

  const actionDespublicar = async () => {
    const eid = Number(examenDetalle?.examen?.id ?? 0);
    if (!eid) return;
    if (!window.confirm("¿Regresar el examen a borrador? Esto cancelará su programación.")) return;
    setSaving(true); setError("");
    try {
      await api.put(`/api/examenes/examen/${eid}`, { estado: "borrador" });
      const res = await api.get(`/api/examenes/examen/${eid}`);
      setExamenDetalle(unwrapResponse(res.data));
    } catch (e) { setError(e?.response?.data?.response || e?.message || "No se pudo despublicar"); }
    finally { setSaving(false); }
  };

  const actionCerrar = async () => {
    const eid = Number(examenDetalle?.examen?.id ?? 0);
    if (!eid) return;
    if (!window.confirm("¿Cerrar este examen? Los alumnos ya no podrán realizarlo.")) return;
    setSaving(true); setError("");
    try {
      await api.post(`/api/examenes/examen/${eid}/cerrar`);
      navigate(`/docente/examenes/${seccionId}`);
    } catch (e) { setError(e?.response?.data?.response || e?.message || "No se pudo cerrar"); }
    finally { setSaving(false); }
  };

  const savePuntos = async (pvId) => {
    const eid = Number(examenDetalle?.examen?.id ?? 0);
    if (!eid || !pvId) return;
    const raw = puntosDraft[pvId];
    const puntos = Number(raw);
    if (!Number.isFinite(puntos) || puntos <= 0) { setError("Puntos inválidos (debe ser > 0)"); return; }
    setSaving(true); setError("");
    try {
      await api.put(`/api/examenes/examen/${eid}/pregunta/${pvId}`, { puntos });
      const res = await api.get(`/api/examenes/examen/${eid}`);
      setExamenDetalle(unwrapResponse(res.data));
    } catch (e) { setError(e?.response?.data?.response || e?.message || "No se pudo actualizar puntos"); }
    finally { setSaving(false); }
  };

  const removePregunta = async (preguntaVersionId) => {
    const eid = Number(examenDetalle?.examen?.id ?? 0);
    if (!eid) return;
    if (!window.confirm("¿Eliminar esta pregunta del examen?")) return;
    setSaving(true); setError("");
    try {
      await api.delete(`/api/examenes/examen/${eid}/pregunta/${preguntaVersionId}`);
      const res = await api.get(`/api/examenes/examen/${eid}`);
      setExamenDetalle(unwrapResponse(res.data));
    } catch (e) { setError(e?.response?.data?.response || e?.message || "No se pudo eliminar pregunta"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-6"><Skeleton height={60} radius={12} className="mb-4" /><Skeleton height={400} radius={16} /></div>;
  if (!examenDetalle?.examen) return <div className="p-6"><div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error || "No se pudo cargar el examen"}</div></div>;

  const ex = examenDetalle.examen;
  const preguntas = safeArray(examenDetalle.preguntas);
  const estado = String(ex.estado || "").toLowerCase();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline_secondary" onClick={() => navigate(`/docente/examenes/${seccionId}`)} className="inline-flex items-center gap-2"><ArrowLeft size={16} />Volver</Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900">Examen #{ex.id}</h1>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass(ex.estado)}`}>{String(ex.estado || "–")}</span>
              {estado === "programado" && !examenHaComenzado && <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700"><Clock size={12} />Aún no inicia</span>}
              {examenHaComenzado && <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700"><CheckCircle size={12} />En curso</span>}
            </div>
            <div className="text-sm text-slate-600 mt-1">{ex.tipo === "parcial" ? `Parcial ${ex.parcial_id || ""}` : "Final"} · {totalPuntos} pts total</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline_secondary" onClick={() => setVistaPrevia(!vistaPrevia)} className="inline-flex items-center gap-2"><Eye size={16} />{vistaPrevia ? "Editar" : "Vista previa"}</Button>

          {esEditable && (
            <>
              <Button variant="outline_primary" onClick={actionArmar} disabled={saving} className="inline-flex items-center gap-2"><Wand2 size={16} />Generar preguntas</Button>
              {estado === "borrador" && (
                <Button variant="primary" onClick={actionPublicar} disabled={saving || !totalOk || !numPreguntasOk} className="inline-flex items-center gap-2" title={!numPreguntasOk ? "No coincide la cantidad de preguntas." : !totalOk ? "El total de puntos debe ser 10." : ""}><Send size={16} />Publicar</Button>
              )}
              {estado === "programado" && !examenHaComenzado && (
                <Button variant="outline_danger" onClick={actionDespublicar} disabled={saving} className="inline-flex items-center gap-2"><ArrowLeft size={16} />Regresar a borrador</Button>
              )}
            </>
          )}

          {(estado === "programado" || estado === "activo") && examenHaComenzado && (
            <Button variant="outline_danger" onClick={actionCerrar} disabled={saving}><Lock size={16} className="mr-2" />Cerrar examen</Button>
          )}
        </div>
      </div>

      {/* Mensaje de no editable */}
      {!esEditable && razonNoEditable && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex items-center gap-3">
          <AlertTriangle size={20} />
          <span><strong>Modo solo lectura:</strong> {razonNoEditable}. No puedes modificar este examen.</span>
        </div>
      )}

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{String(error)}</div>}

      {!vistaPrevia ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Configuración */}
          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Configuración</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Select label="Tipo de examen" value={ex.tipo ?? "parcial"} onChange={(e) => updateExamen({ tipo: e.target.value })} disabled={saving || !esEditable}>
                <option value="parcial">Parcial</option>
                <option value="final">Final</option>
              </Select>
              <Input label="Número de parcial" type="number" min={1} value={ex.parcial_id ?? ""} onChange={(e) => updateExamen({ parcial_id: e.target.value ? Number(e.target.value) : null })} disabled={saving || !esEditable || ex.tipo !== "parcial"} placeholder="1, 2, 3..." />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha y hora de inicio</label>
                <input ref={fechaInicioRef} type="datetime-local" value={toDatetimeLocal(ex.fecha_inicio)} min={minDatetimeLocal(1)} disabled={saving || !esEditable}
                  onClick={() => openDatetimePicker(fechaInicioRef.current)} onFocus={() => openDatetimePicker(fechaInicioRef.current)}
                  onChange={(e) => {
                    const cleaned = sanitizeDatetimeLocal(e.target.value);
                    if (!cleaned) { setError("Fecha inválida o en el pasado."); return; }
                    setError(""); updateExamen({ fecha_inicio: toMysqlDatetime(cleaned) });
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100" />
                <div className="mt-1 text-[11px] text-slate-500">No se permiten fechas pasadas.</div>
              </div>
              <Input label="Duración (minutos)" type="number" min={1} value={ex.duracion_min ?? 60} onChange={(e) => updateExamen({ duracion_min: Number(e.target.value) })} disabled={saving || !esEditable} />
              <Input label="Intentos permitidos" type="number" min={1} value={ex.intentos_max ?? 1} onChange={(e) => updateExamen({ intentos_max: Number(e.target.value) })} disabled={saving || !esEditable} />
              <Select label="Método de armado" value={ex.modo_armado ?? "random"} onChange={(e) => updateExamen({ modo_armado: e.target.value })} disabled={saving || !esEditable}>
                <option value="random">Automático (aleatorio)</option>
                <option value="manual">Manual</option>
              </Select>
              <Input label="Cantidad de preguntas" type="number" min={1} value={ex.num_preguntas ?? 10} onChange={(e) => updateExamen({ num_preguntas: Number(e.target.value) })} disabled={saving || !esEditable} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Dificultad mín" type="number" min={1} max={10} value={ex.dificultad_min ?? 1} onChange={(e) => updateExamen({ dificultad_min: Number(e.target.value) })} disabled={saving || !esEditable} />
                <Input label="Dificultad máx" type="number" min={1} max={10} value={ex.dificultad_max ?? 10} onChange={(e) => updateExamen({ dificultad_max: Number(e.target.value) })} disabled={saving || !esEditable} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select label="Aleatorizar preguntas" value={Number(ex.mezclar_preguntas ?? 1)} onChange={(e) => updateExamen({ mezclar_preguntas: Number(e.target.value) })} disabled={saving || !esEditable}><option value={1}>Sí</option><option value={0}>No</option></Select>
                <Select label="Aleatorizar opciones" value={Number(ex.mezclar_opciones ?? 1)} onChange={(e) => updateExamen({ mezclar_opciones: Number(e.target.value) })} disabled={saving || !esEditable}><option value={1}>Sí</option><option value={0}>No</option></Select>
              </div>
            </div>
            {esEditable && <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900"><strong>Tip:</strong> Ajusta los filtros y presiona "Generar preguntas" para actualizar el banco.</div>}
          </div>

          {/* Lista de preguntas */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900">Preguntas</h2>
              <div className="text-xs text-slate-600">{preguntas.length} · <span className="font-semibold">{totalPuntos}</span> pts</div>
            </div>
            <div className="max-h-[600px] overflow-auto">
              {preguntas.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-600"><div className="mb-2">No hay preguntas</div><div className="text-xs text-slate-500">Presiona "Generar preguntas"</div></div>
              ) : (
                <ul className="space-y-3">
                  {preguntas.map((p, idx) => {
                    const pvId = Number(p?.pregunta_version_id ?? 0);
                    const draftVal = puntosDraft[pvId] ?? String(p?.puntos ?? 1);
                    return (
                      <li key={p?.id ?? idx} className="rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="text-xs font-semibold text-slate-700">#{p?.orden_base ?? idx + 1}</div>
                          <div className="flex items-center gap-2">
                            <input type="number" step="0.25" min="0.01" value={draftVal} disabled={saving || !esEditable}
                              onChange={(e) => setPuntosDraft((prev) => ({ ...prev, [pvId]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === "Enter") savePuntos(pvId); }}
                              onBlur={() => { const cur = Number(p?.puntos ?? 1); const next = Number(draftVal); if (Number.isFinite(next) && Math.round(next * 100) !== Math.round(cur * 100)) savePuntos(pvId); }}
                              className="w-16 rounded border border-slate-300 px-2 py-1 text-xs disabled:bg-slate-100"
                              title={!esEditable ? "No editable" : "Enter para guardar"} />
                            <span className="text-xs text-slate-500">pts</span>
                            {esEditable && <button type="button" onClick={() => removePregunta(pvId)} disabled={saving} className="p-1 text-slate-400 hover:text-red-600 rounded" title="Eliminar"><Trash2 size={14} /></button>}
                          </div>
                        </div>
                        <div className="text-sm text-slate-800 line-clamp-2">{p?.enunciado || "Sin enunciado"}</div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {!esEditable && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{razonNoEditable}. No puedes editar puntos o eliminar preguntas.</div>}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm max-w-4xl mx-auto">
          <div className="mb-6 pb-6 border-b border-slate-200">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{ex.tipo === "parcial" ? `Examen Parcial ${ex.parcial_id || ""}` : "Examen Final"}</h1>
            <div className="text-sm text-slate-600">Duración: <span className="font-medium">{ex.duracion_min} minutos</span> · Total de puntos: <span className="font-medium">{totalPuntos}</span> · Preguntas: <span className="font-medium">{preguntas.length}</span></div>
          </div>
          {preguntas.length === 0 ? (
            <div className="text-center py-12 text-slate-600">Este examen aún no tiene preguntas asignadas</div>
          ) : (
            <div className="space-y-8">
              {preguntas.map((p, idx) => (
                <div key={p?.id ?? idx} className="pb-6 border-b border-slate-100 last:border-0">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-red text-white text-sm font-semibold">{idx + 1}</span>
                        <span className="text-xs text-slate-500">({p?.puntos || 1} punto{Number(p?.puntos || 1) !== 1 ? "s" : ""})</span>
                      </div>
                      <div className="text-base text-slate-900 leading-relaxed">{p?.enunciado || "Sin enunciado"}</div>
                    </div>
                  </div>
                  <PreguntaPreviewDetalle p={p} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}