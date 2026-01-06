// src/pages/examenes/ExamenAlumno.jsx
import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import Button from "../components/ui/Button";
import {
  Clock,
  CheckCircle,
  Send,
  AlertTriangle,
  ArrowLeft,
  Eye,
  Trophy,
  Timer,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

function unwrapResponse(data) {
  if (!data) return null;
  if (typeof data === "object" && data !== null && "response" in data)
    return data.response;
  return data;
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function formatTime(seconds) {
  if (seconds <= 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function formatMx(mysqlDt) {
  if (!mysqlDt) return "-";
  const [d, t] = String(mysqlDt).split(" ");
  if (!d) return String(mysqlDt);
  const [yyyy, mm, dd] = d.split("-");
  const hhmm = (t || "").slice(0, 5);
  return `${dd}/${mm}/${yyyy} ${hhmm}`;
}

function formatMxDate(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

// Parse MySQL DATETIME ("YYYY-MM-DD HH:mm:ss") como hora LOCAL (sin UTC)
function parseMysqlLocal(mysqlDt) {
  if (!mysqlDt) return null;
  const s = String(mysqlDt).trim();
  const isoLike = s.includes("T") ? s : s.replace(" ", "T");
  const d = new Date(isoLike);
  return Number.isNaN(d.getTime()) ? null : d;
}

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
  if (raw.length === n) {
    const nums = raw.map((x) => Number(x));
    const ok = nums.every((x) => Number.isInteger(x) && x >= 0 && x < n);
    if (ok && new Set(nums).size === n) return nums;
  }
  return Array.from({ length: n }, (_, i) => i);
}

function moveInArray(arr, from, to) {
  const a = arr.slice();
  const [it] = a.splice(from, 1);
  a.splice(to, 0, it);
  return a;
}

function isAnswered(tipo, respuesta, contenido) {
  if (!respuesta) return false;
  if (tipo === "opcion_multiple") {
    const multiple = Boolean(contenido?.multiple);
    if (multiple) return safeArray(respuesta?.seleccion).length > 0;
    return respuesta?.seleccion !== null && respuesta?.seleccion !== undefined;
  }
  if (tipo === "verdadero_falso") return typeof respuesta?.valor === "boolean";
  if (tipo === "abierta") return isNonEmptyString(respuesta?.texto);
  if (tipo === "numerica")
    return respuesta?.valor !== "" && respuesta?.valor != null;
  if (tipo === "completar") {
    const blanks = safeArray(contenido?.blanks);
    const map = buildCompletarMapFromResp(respuesta);
    return map.size > 0 && blanks.length > 0;
  }
  if (tipo === "relacionar") {
    const izq = safeArray(contenido?.izq);
    const matches = safeArray(respuesta?.matches);
    return matches.length > 0 && izq.length > 0;
  }
  if (tipo === "ordenar") {
    const orden = safeArray(respuesta?.orden);
    return orden.length > 0;
  }
  return false;
}

function RenderizarPregunta({ pregunta, respuesta, onChange, disabled }) {
  const tipo = String(pregunta?.tipo || "").toLowerCase();
  const contenido = pregunta?.contenido ?? {};

  if (tipo === "opcion_multiple") {
    const opciones = safeArray(contenido?.opciones);
    const multiple = Boolean(contenido?.multiple);
    const sel = respuesta?.seleccion;
    const selSet = new Set(
      multiple
        ? safeArray(sel)
            .map((n) => Number(n))
            .filter(Number.isFinite)
        : []
    );
    const selSingle = !multiple
      ? Number.isFinite(Number(sel))
        ? Number(sel)
        : null
      : null;

    return (
      <div className="space-y-3">
        {multiple && (
          <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-2">
            Puedes seleccionar múltiples opciones
          </div>
        )}
        {opciones.map((opc, idx) => {
          const label = isNonEmptyString(opc) ? opc : String(opc ?? "");
          const checked = multiple ? selSet.has(idx) : selSingle === idx;
          return (
            <label
              key={idx}
              className={[
                "flex items-start gap-4 p-4 rounded-xl border-2 transition-all",
                disabled
                  ? "opacity-60 cursor-not-allowed"
                  : "cursor-pointer hover:shadow-md",
                checked
                  ? "border-brand-red bg-brand-red/5 shadow-sm"
                  : "border-slate-200 hover:border-slate-300 bg-white",
              ].join(" ")}
            >
              <div className="mt-0.5">
                {multiple ? (
                  <div
                    className={[
                      "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                      checked
                        ? "border-brand-red bg-brand-red"
                        : "border-slate-300",
                    ].join(" ")}
                  >
                    {checked && (
                      <CheckCircle size={14} className="text-white" />
                    )}
                  </div>
                ) : (
                  <div
                    className={[
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      checked ? "border-brand-red" : "border-slate-300",
                    ].join(" ")}
                  >
                    {checked && (
                      <div className="w-2.5 h-2.5 rounded-full bg-brand-red" />
                    )}
                  </div>
                )}
              </div>
              <span className="text-sm text-slate-800 flex-1 leading-relaxed">
                {label}
              </span>
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
                    onChange({
                      seleccion: Array.from(next).sort((a, b) => a - b),
                    });
                  } else {
                    onChange({ seleccion: idx });
                  }
                }}
                className="sr-only"
              />
            </label>
          );
        })}
      </div>
    );
  }

  if (tipo === "verdadero_falso") {
    const cur = respuesta?.valor;
    return (
      <div className="grid grid-cols-2 gap-4">
        {[
          { valor: true, label: "Verdadero", icon: "✓" },
          { valor: false, label: "Falso", icon: "✗" },
        ].map((opt) => {
          const checked = cur === opt.valor;
          return (
            <label
              key={String(opt.valor)}
              className={[
                "flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 transition-all",
                disabled
                  ? "opacity-60 cursor-not-allowed"
                  : "cursor-pointer hover:shadow-md",
                checked
                  ? "border-brand-red bg-brand-red/5 shadow-sm"
                  : "border-slate-200 hover:border-slate-300 bg-white",
              ].join(" ")}
            >
              <span
                className={[
                  "text-3xl font-bold",
                  checked ? "text-brand-red" : "text-slate-400",
                ].join(" ")}
              >
                {opt.icon}
              </span>
              <span className="text-sm font-medium text-slate-800">
                {opt.label}
              </span>
              <input
                disabled={disabled}
                type="radio"
                name={`pregunta_${pregunta.pregunta_version_id}`}
                checked={checked}
                onChange={() => {
                  if (!disabled) onChange({ valor: opt.valor });
                }}
                className="sr-only"
              />
            </label>
          );
        })}
      </div>
    );
  }

  if (tipo === "abierta") {
    return (
      <div className="space-y-2">
        <textarea
          disabled={disabled}
          value={respuesta?.texto ?? ""}
          onChange={(e) => onChange({ texto: e.target.value })}
          className={[
            "w-full min-h-[180px] p-4 border-2 rounded-xl text-sm resize-y font-sans transition-colors",
            disabled
              ? "bg-slate-50 border-slate-200 text-slate-600"
              : "bg-white border-slate-300 focus:border-brand-red focus:ring-4 focus:ring-brand-red/10",
          ].join(" ")}
          placeholder="Escribe tu respuesta aquí..."
        />
        <div className="text-xs text-slate-500 text-right">
          {(respuesta?.texto || "").length} caracteres
        </div>
      </div>
    );
  }

  if (tipo === "numerica") {
    return (
      <div className="max-w-sm">
        <input
          disabled={disabled}
          type="number"
          step="any"
          value={respuesta?.valor ?? ""}
          onChange={(e) => onChange({ valor: e.target.value })}
          className={[
            "w-full p-4 border-2 rounded-xl text-lg font-mono transition-colors",
            disabled
              ? "bg-slate-50 border-slate-200"
              : "bg-white border-slate-300 focus:border-brand-red focus:ring-4 focus:ring-brand-red/10",
          ].join(" ")}
          placeholder="0"
        />
        {contenido?.unidad && (
          <div className="mt-2 text-sm text-slate-600">
            Unidad: <span className="font-medium">{contenido.unidad}</span>
          </div>
        )}
      </div>
    );
  }

  if (tipo === "completar") {
    const blanks = safeArray(contenido?.blanks);
    const map = buildCompletarMapFromResp(respuesta);
    const base = String(pregunta?.enunciado ?? "");
    const parts = base.split("___");
    const canInline = parts.length > 1 && blanks.length > 0;
    const onBlankChange = (blankId, value) => {
      onChange(upsertCompletarBlank(respuesta, blankId, value));
    };

    return (
      <div className="space-y-4">
        {canInline ? (
          <div className="text-base text-slate-900 leading-loose p-4 bg-slate-50 rounded-xl">
            {parts.map((txt, i) => {
              const blank = blanks[i];
              const bid = blank?.id ?? i;
              const val = map.get(String(bid)) ?? "";
              return (
                <span key={i}>
                  {txt}
                  {i < parts.length - 1 && (
                    <span className="inline-flex items-center mx-1 align-baseline">
                      <input
                        disabled={disabled}
                        value={val}
                        onChange={(e) => onBlankChange(bid, e.target.value)}
                        className={[
                          "min-w-[120px] px-3 py-1.5 rounded-lg border-2 text-sm font-medium",
                          disabled
                            ? "bg-white border-slate-200"
                            : "bg-white border-slate-300 focus:border-brand-red",
                          val ? "border-brand-red/50 bg-brand-red/5" : "",
                        ].join(" ")}
                        placeholder="..."
                      />
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {blanks.map((b, idx) => {
              const bid = b?.id ?? idx;
              const val = map.get(String(bid)) ?? "";
              return (
                <div
                  key={String(bid)}
                  className="rounded-xl border-2 border-slate-200 p-4 bg-white"
                >
                  <div className="text-xs font-medium text-slate-500 mb-2">
                    Espacio #{String(bid)}
                  </div>
                  <input
                    disabled={disabled}
                    value={val}
                    onChange={(e) => onBlankChange(bid, e.target.value)}
                    className={[
                      "w-full px-4 py-3 rounded-lg border-2 text-sm",
                      disabled
                        ? "bg-slate-50 border-slate-200"
                        : "bg-white border-slate-300 focus:border-brand-red",
                    ].join(" ")}
                    placeholder={String(b?.placeholder ?? "Tu respuesta...")}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (tipo === "relacionar") {
    const izq = safeArray(contenido?.izq);
    const der = safeArray(contenido?.der);
    const oneToOne = Boolean(contenido?.one_to_one);
    const onPick = (izqId, derId) => {
      if (!disabled) onChange(upsertMatch(respuesta, izqId, derId));
    };
    const usedRights = new Set(
      safeArray(respuesta?.matches)
        .map((m) => m?.der_id)
        .filter((x) => x != null)
        .map(String)
    );

    return (
      <div className="space-y-4">
        <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3">
          Relaciona cada elemento de la izquierda con uno de la derecha.
          {oneToOne && " Cada opción solo se puede usar una vez."}
        </div>
        <div className="space-y-3">
          {izq.map((l) => {
            const lid = l?.id;
            const ltxt = String(l?.texto ?? "");
            const curRid = getMatchedDer(respuesta, lid);
            const hasMatch = curRid !== "";
            return (
              <div
                key={String(lid)}
                className={[
                  "rounded-xl border-2 p-4 transition-colors",
                  hasMatch
                    ? "border-brand-red/50 bg-brand-red/5"
                    : "border-slate-200 bg-white",
                ].join(" ")}
              >
                <div className="text-sm text-slate-900 font-medium mb-3">
                  {ltxt}
                </div>
                <select
                  disabled={disabled}
                  value={curRid || ""}
                  onChange={(e) => onPick(lid, e.target.value)}
                  className={[
                    "w-full rounded-lg border-2 px-4 py-3 text-sm transition-colors",
                    disabled
                      ? "bg-slate-50 border-slate-200"
                      : "bg-white border-slate-300 focus:border-brand-red",
                  ].join(" ")}
                >
                  <option value="">— Selecciona una opción —</option>
                  {der.map((r) => {
                    const rid = String(r?.id ?? "");
                    const rtxt = String(r?.texto ?? "");
                    const isUsedByOther =
                      oneToOne && usedRights.has(rid) && String(curRid) !== rid;
                    return (
                      <option key={rid} value={rid} disabled={isUsedByOther}>
                        {rtxt}
                        {isUsedByOther ? " (ya usada)" : ""}
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

  if (tipo === "ordenar") {
    const items = pickOrdenarItems(contenido);
    const curOrden = normalizeOrdenarInit(items, respuesta);
    const onMove = (from, to) => {
      if (disabled || to < 0 || to >= curOrden.length) return;
      onChange({ orden: moveInArray(curOrden, from, to) });
    };
    if (!items.length)
      return (
        <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-600">
          No hay elementos para ordenar.
        </div>
      );

    return (
      <div className="space-y-3">
        <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3">
          Usa los botones ↑ ↓ para ordenar los elementos de arriba a abajo
        </div>
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
                  disabled
                    ? "bg-slate-50 border-slate-200"
                    : "bg-white border-slate-200 hover:border-slate-300",
                ].join(" ")}
              >
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-brand-red to-brand-wine text-white text-sm font-bold shadow-sm">
                  {pos + 1}
                </span>
                <div className="flex-1 text-sm text-slate-900">
                  {String(label)}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={disabled || !canUp}
                    onClick={() => onMove(pos, pos - 1)}
                    className={[
                      "w-9 h-9 rounded-lg border-2 flex items-center justify-center text-sm font-bold transition-colors",
                      disabled || !canUp
                        ? "border-slate-200 text-slate-300 cursor-not-allowed"
                        : "border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-brand-red hover:text-brand-red",
                    ].join(" ")}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={disabled || !canDown}
                    onClick={() => onMove(pos, pos + 1)}
                    className={[
                      "w-9 h-9 rounded-lg border-2 flex items-center justify-center text-sm font-bold transition-colors",
                      disabled || !canDown
                        ? "border-slate-200 text-slate-300 cursor-not-allowed"
                        : "border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-brand-red hover:text-brand-red",
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

function ExamTimer({ tiempoRestante, duracionTotal }) {
  const porcentaje =
    duracionTotal > 0 ? (tiempoRestante / duracionTotal) * 100 : 0;
  const isLow = tiempoRestante <= 300;
  const isCritical = tiempoRestante <= 60;

  return (
    <div
      className={[
        "flex items-center gap-3 px-4 py-2 rounded-xl transition-colors",
        isCritical
          ? "bg-red-100 text-red-700 animate-pulse"
          : isLow
          ? "bg-amber-100 text-amber-700"
          : "bg-slate-100 text-slate-700",
      ].join(" ")}
    >
      <Timer size={20} className={isCritical ? "animate-bounce" : ""} />
      <div className="flex flex-col">
        <span className="text-lg font-bold font-mono">
          {formatTime(tiempoRestante)}
        </span>
        <div className="w-24 h-1.5 bg-white/50 rounded-full overflow-hidden">
          <div
            className={[
              "h-full rounded-full transition-all duration-1000",
              isCritical
                ? "bg-red-500"
                : isLow
                ? "bg-amber-500"
                : "bg-slate-500",
            ].join(" ")}
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function QuestionNav({ preguntas, respuestas, current, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {preguntas.map((p, idx) => {
        const pvId = p.pregunta_version_id;
        const tipo = String(p?.tipo || "").toLowerCase();
        const answered = isAnswered(tipo, respuestas[pvId], p?.contenido);
        const isCurrent = idx === current;
        return (
          <button
            key={pvId}
            type="button"
            onClick={() => onSelect(idx)}
            title={answered ? "Contestada" : "Sin contestar"}
            className={[
              "w-10 h-10 rounded-lg font-medium text-sm transition-all",
              isCurrent
                ? "bg-brand-red text-white shadow-lg scale-110"
                : answered
                ? "bg-green-100 text-green-700 border-2 border-green-300"
                : "bg-slate-100 text-slate-600 border-2 border-slate-200 hover:border-slate-300",
            ].join(" ")}
          >
            {idx + 1}
          </button>
        );
      })}
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
  const [intentosRealizados, setIntentosRealizados] = useState([]);
  const [intento, setIntento] = useState(null);
  const [preguntas, setPreguntas] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [tiempoRestante, setTiempoRestante] = useState(null);
  const [duracionTotal, setDuracionTotal] = useState(0);
  const [enviado, setEnviado] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [intentoAVer, setIntentoAVer] = useState(null);

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
        try {
          const intentosRes = await api.get(
            `/api/examenes/mis-intentos/${examenId}`
          );
          setIntentosRealizados(safeArray(unwrapResponse(intentosRes.data)));
        } catch {
          setIntentosRealizados([]);
        }
      } catch (e) {
        setError(
          e?.response?.data?.response || e?.message || "Error al cargar examen"
        );
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
      setCurrentQuestion(0);

      const inicial = {};
      for (const p of safeArray(data.preguntas)) {
        const pvId = p.pregunta_version_id;
        const tipo = String(p?.tipo || "").toLowerCase();
        if (tipo === "opcion_multiple") {
          inicial[pvId] = Boolean(p?.contenido?.multiple)
            ? { seleccion: [] }
            : { seleccion: null };
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
          inicial[pvId] = { orden: [] };
        } else {
          inicial[pvId] = null;
        }
      }
      setRespuestas(inicial);

      const duracionSeg = (data.examen?.duracion_min || 60) * 60;
      setDuracionTotal(duracionSeg);
      setTiempoRestante(duracionSeg);
      if (timerRef.current) clearInterval(timerRef.current);
      const finMs = Date.now() + duracionSeg * 1000;
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
      setError(
        e?.response?.data?.response ||
          e?.message ||
          "No se pudo iniciar el intento"
      );
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
        respuesta_json: valor,
      });
    } catch (e) {
      console.error("Error al guardar respuesta:", e);
    }
  };

  const finalizarIntento = async (auto = false) => {
    if (!intento?.id) return;
    if (
      !auto &&
      !enviado &&
      !window.confirm(
        "¿Estás seguro de enviar tu examen? Ya no podrás modificar tus respuestas."
      )
    )
      return;
    setSaving(true);
    setError("");
    try {
      await api.post(`/api/examenes/intento/${intento.id}/finalizar`);
      setEnviado(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } catch (e) {
      setError(
        e?.response?.data?.response || e?.message || "Error al enviar examen"
      );
    } finally {
      setSaving(false);
    }
  };

  const { progreso, contestadas, totalPreguntas } = useMemo(() => {
    if (!preguntas.length)
      return { progreso: 0, contestadas: 0, totalPreguntas: 0 };
    let count = 0;
    for (const p of preguntas) {
      if (
        isAnswered(
          String(p?.tipo || "").toLowerCase(),
          respuestas[p.pregunta_version_id],
          p?.contenido
        )
      )
        count++;
    }
    return {
      progreso: Math.round((count / preguntas.length) * 100),
      contestadas: count,
      totalPreguntas: preguntas.length,
    };
  }, [respuestas, preguntas]);

  const verIntentoAnterior = async (intentoId) => {
    try {
      const res = await api.get(`/api/examenes/intento/${intentoId}/detalle`);
      setIntentoAVer(unwrapResponse(res.data));
    } catch {
      setError("No se pudo cargar el detalle del intento");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-brand-red border-t-transparent animate-spin"></div>
          </div>
          <div className="text-slate-700 font-medium">Cargando examen...</div>
        </div>
      </div>
    );
  }

  if (error && !examenInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-red-200 bg-white p-8 text-center shadow-xl">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={32} className="text-red-600" />
          </div>
          <div className="text-lg font-semibold text-slate-900 mb-2">Error</div>
          <div className="text-sm text-slate-600 mb-6">{error}</div>
          <Button
            variant="outline_secondary"
            onClick={() => navigate("/alumno/examenes")}
          >
            Volver a mis exámenes
          </Button>
        </div>
      </div>
    );
  }

  if (intentoAVer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="outline_secondary"
            onClick={() => setIntentoAVer(null)}
            className="inline-flex items-center gap-2 mb-6"
          >
            <ArrowLeft size={16} />
            Volver
          </Button>
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-200">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Intento #{intentoAVer.intento?.intento_num || "?"}
                </h1>
                <div className="text-sm text-slate-600 mt-1">
                  Enviado: {formatMx(intentoAVer.intento?.fin_real)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-brand-red">
                  {Number(
                    intentoAVer.intento?.calif_final ??
                      intentoAVer.intento?.calif_auto ??
                      0
                  ).toFixed(2)}
                </div>
                <div className="text-xs text-slate-600">Calificación</div>
              </div>
            </div>
            <div className="space-y-6">
              {safeArray(intentoAVer.preguntas).map((p, idx) => (
                <div
                  key={p.pregunta_version_id || idx}
                  className="rounded-xl border border-slate-200 p-6"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-700 text-sm font-bold">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <div className="text-base text-slate-900">
                        {p.enunciado}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {p.puntos_obtenidos ?? 0} / {p.puntos_max ?? 1} puntos
                      </div>
                    </div>
                  </div>
                  <div className="ml-12 p-4 bg-slate-50 rounded-lg">
                    <div className="text-xs font-medium text-slate-500 mb-2">
                      Tu respuesta:
                    </div>
                    <div className="text-sm text-slate-700">
                      {JSON.stringify(p.respuesta_alumno, null, 2) ||
                        "Sin respuesta"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (enviado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            ¡Examen enviado!
          </h1>
          <p className="text-slate-600 mb-6">
            Tu examen ha sido recibido correctamente. Pronto podrás ver tus
            resultados.
          </p>
          <Button
            variant="primary"
            onClick={() => navigate("/alumno/examenes")}
            className="w-full"
          >
            Ver mis exámenes
          </Button>
        </div>
      </div>
    );
  }

  if (!intento && examenInfo) {
    const intentosUsados = intentosRealizados.length;
    const intentosDisponibles = Math.max(
      0,
      (examenInfo.intentos_max || 1) - intentosUsados
    );
    const ahora = new Date();
    const inicio = parseMysqlLocal(examenInfo.fecha_inicio);
    const durMin = Number(examenInfo.duracion_min || 60);
    const fin = inicio ? new Date(inicio.getTime() + durMin * 60 * 1000) : null;
    const yaInicio = ahora >= inicio;
    const yaTermino = ahora > fin;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="outline_secondary"
            onClick={() => navigate("/alumno/examenes")}
            className="inline-flex items-center gap-2 mb-6"
          >
            <ArrowLeft size={16} />
            Volver
          </Button>
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-red to-brand-wine flex items-center justify-center mx-auto mb-4">
                <FileText size={32} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                {examenInfo.tipo === "parcial"
                  ? `Parcial ${examenInfo.parcial_id || ""}`
                  : "Examen Final"}
              </h1>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-sm font-medium text-slate-700">
                Estado:{" "}
                <span className="font-semibold capitalize">
                  {examenInfo.estado}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="text-center p-4 bg-slate-50 rounded-xl">
                <div className="text-2xl font-bold text-slate-900">
                  {examenInfo.duracion_min}
                </div>
                <div className="text-xs text-slate-600 mt-1">minutos</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-xl">
                <div className="text-2xl font-bold text-slate-900">
                  {examenInfo.num_preguntas}
                </div>
                <div className="text-xs text-slate-600 mt-1">preguntas</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-xl">
                <div className="text-2xl font-bold text-slate-900">
                  {intentosUsados}
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  intentos usados
                </div>
              </div>
              <div className="text-center p-4 bg-brand-red/10 rounded-xl">
                <div className="text-2xl font-bold text-brand-red">
                  {intentosDisponibles}
                </div>
                <div className="text-xs text-slate-600 mt-1">disponibles</div>
              </div>
            </div>
            {intentosRealizados.length > 0 && (
              <div className="mb-8">
                <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Trophy size={20} className="text-amber-500" />
                  Tus intentos anteriores
                </h3>
                <div className="space-y-3">
                  {intentosRealizados.map((i) => (
                    <div
                      key={i.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                          <span className="text-sm font-bold text-slate-700">
                            #{i.intento_num}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            Intento {i.intento_num}
                          </div>
                          <div className="text-xs text-slate-500">
                            {i.fin_real ? formatMx(i.fin_real) : "En progreso"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-lg font-bold text-slate-900">
                            {Number(i.calif_final ?? i.calif_auto ?? 0).toFixed(
                              2
                            )}
                          </div>
                          <div className="text-xs text-slate-500">
                            calificación
                          </div>
                        </div>
                        <Button
                          variant="outline_secondary"
                          onClick={() => verIntentoAnterior(i.id)}
                          className="inline-flex items-center gap-2"
                        >
                          <Eye size={16} />
                          Ver
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-slate-500">Inicia</div>
                  <div className="font-medium text-slate-900">
                    {formatMxDate(inicio)}
                  </div>
                </div>

                <div>
                  <div className="text-slate-500">Termina</div>
                  <div className="font-medium text-slate-900">
                    {formatMxDate(fin)}
                  </div>
                </div>
              </div>
            </div>
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="flex flex-col gap-3">
              {yaTermino ? (
                <div className="text-center py-4 text-red-600 font-medium">
                  El tiempo para realizar este examen ha terminado
                </div>
              ) : !yaInicio ? (
                <div className="text-center py-4 text-amber-600 font-medium">
                  El examen aún no ha comenzado
                </div>
              ) : intentosDisponibles <= 0 ? (
                <div className="text-center py-4 text-slate-600 font-medium">
                  Has agotado todos tus intentos
                </div>
              ) : (
                <Button
                  variant="primary"
                  onClick={iniciarIntento}
                  disabled={saving}
                  className="w-full py-4 text-lg"
                >
                  {saving
                    ? "Iniciando..."
                    : `Iniciar intento ${intentosUsados + 1} de ${
                        examenInfo.intentos_max
                      }`}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const preguntaActual = preguntas[currentQuestion];

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-sm font-medium text-slate-900">
                {examenInfo?.tipo === "parcial"
                  ? `Parcial ${examenInfo?.parcial_id || ""}`
                  : "Final"}
              </div>
              <div className="hidden sm:block h-6 w-px bg-slate-200" />
              <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">
                  {contestadas}
                </span>
                <span>de</span>
                <span className="font-semibold text-slate-900">
                  {totalPreguntas}
                </span>
                <span>contestadas</span>
              </div>
            </div>
            <ExamTimer
              tiempoRestante={tiempoRestante}
              duracionTotal={duracionTotal}
            />
          </div>
          <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-red to-brand-wine rounded-full transition-all duration-500"
              style={{ width: `${progreso}%` }}
            />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="sticky top-32 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-medium text-slate-700 mb-3">
                Preguntas
              </div>
              <QuestionNav
                preguntas={preguntas}
                respuestas={respuestas}
                current={currentQuestion}
                onSelect={setCurrentQuestion}
              />
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                  <div className="w-4 h-4 rounded bg-green-100 border-2 border-green-300" />
                  <span>Contestada</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <div className="w-4 h-4 rounded bg-slate-100 border-2 border-slate-200" />
                  <span>Sin contestar</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 order-1 lg:order-2">
            {preguntaActual && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-4 mb-6">
                  <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-brand-red to-brand-wine text-white text-lg font-bold shadow-sm">
                    {currentQuestion + 1}
                  </span>
                  <div className="flex-1">
                    <div className="text-lg text-slate-900 leading-relaxed">
                      {preguntaActual.enunciado}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                      <span>
                        {preguntaActual.puntos || 1} punto
                        {(preguntaActual.puntos || 1) !== 1 ? "s" : ""}
                      </span>
                      <span>•</span>
                      <span className="capitalize">
                        {preguntaActual.tipo?.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mb-6">
                  <RenderizarPregunta
                    pregunta={preguntaActual}
                    respuesta={respuestas[preguntaActual.pregunta_version_id]}
                    onChange={(val) =>
                      guardarRespuesta(preguntaActual.pregunta_version_id, val)
                    }
                    disabled={false}
                  />
                </div>
                <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                  <Button
                    variant="outline_secondary"
                    onClick={() =>
                      setCurrentQuestion((prev) => Math.max(0, prev - 1))
                    }
                    disabled={currentQuestion === 0}
                    className="inline-flex items-center gap-2"
                  >
                    <ChevronLeft size={16} />
                    Anterior
                  </Button>
                  <div className="text-sm text-slate-500">
                    {currentQuestion + 1} / {preguntas.length}
                  </div>
                  {currentQuestion < preguntas.length - 1 ? (
                    <Button
                      variant="outline_secondary"
                      onClick={() =>
                        setCurrentQuestion((prev) =>
                          Math.min(preguntas.length - 1, prev + 1)
                        )
                      }
                      className="inline-flex items-center gap-2"
                    >
                      Siguiente
                      <ChevronRight size={16} />
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={() => finalizarIntento(false)}
                      disabled={saving}
                      className="inline-flex items-center gap-2"
                    >
                      <Send size={16} />
                      {saving ? "Enviando..." : "Enviar examen"}
                    </Button>
                  )}
                </div>
              </div>
            )}
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  {contestadas === totalPreguntas ? (
                    <span className="text-green-600 font-medium">
                      ✓ Todas las preguntas contestadas
                    </span>
                  ) : (
                    <span>
                      Faltan{" "}
                      <span className="font-semibold text-amber-600">
                        {totalPreguntas - contestadas}
                      </span>{" "}
                      preguntas por contestar
                    </span>
                  )}
                </div>
                <Button
                  variant="primary"
                  onClick={() => finalizarIntento(false)}
                  disabled={saving}
                  className="inline-flex items-center gap-2"
                >
                  <Send size={16} />
                  {saving ? "Enviando..." : "Enviar examen"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
