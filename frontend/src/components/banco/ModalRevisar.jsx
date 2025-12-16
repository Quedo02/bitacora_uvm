// src/components/banco/ModalRevisar.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Skeleton from '../ui/Skeleton';
import api from '../../api/axios';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

function unwrapResponse(data) {
  if (!data) return null;
  if (typeof data === 'object' && data !== null && 'response' in data) return data.response;
  return data;
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function parseMaybeJson(v) {
  if (v == null) return null;
  if (typeof v === 'object') return v;
  const s = String(v || '').trim();
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

const TIPO_LABEL = {
  opcion_multiple: 'Opción múltiple',
  verdadero_falso: 'Verdadero / Falso',
  abierta: 'Abierta (respuesta libre)',
  completar: 'Completar',
  relacionar: 'Relacionar',
  ordenar: 'Ordenar',
  numerica: 'Numérica',
};

export default function ModalRevisar({ open, onClose, preguntaVersionId, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [loadingVoto, setLoadingVoto] = useState(false);
  const [submitting, setSubmitting] = useState('');
  const [error, setError] = useState('');

  const [version, setVersion] = useState(null);
  const [pregunta, setPregunta] = useState(null);
  const [temas, setTemas] = useState([]);
  const [areas, setAreas] = useState([]);
  const [votos, setVotos] = useState([]);
  const [materiasMap, setMateriasMap] = useState(new Map());

  const [comentario, setComentario] = useState('');

  // ✅ esto controla si el comentario se vuelve obligatorio (se activa al darle click a Revisión/Rechazar)
  const [action, setAction] = useState('aprobar'); // 'aprobar' | 'revision' | 'rechazar'
  const needsComment = action === 'revision' || action === 'rechazar';

  // (opcional) por si el backend exige area_id
  const [areaId, setAreaId] = useState('');

  const commentRef = useRef(null);
  const commentWrapRef = useRef(null);

  useEffect(() => {
    if (!open || !preguntaVersionId) return;

    setError('');
    setLoading(true);
    setLoadingVoto(false);
    setSubmitting('');

    setAction('aprobar');
    setComentario('');
    setAreaId('');

    setVersion(null);
    setPregunta(null);
    setTemas([]);
    setAreas([]);
    setVotos([]);

    loadAll(preguntaVersionId).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preguntaVersionId]);

  // ✅ cuando la acción requiere comentario, enfocamos y hacemos scroll hacia el campo
  useEffect(() => {
    if (!open) return;
    if (!needsComment) return;

    setTimeout(() => {
      try {
        commentWrapRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      } catch {}
      commentRef.current?.focus?.();
    }, 50);
  }, [needsComment, open]);

  async function loadAll(pvId) {
    try {
      const [matRes, votosRes, pendRes] = await Promise.all([
        api.get('/api/banco/materias').catch(() => ({ data: null })),
        api.get(`/api/banco/version/${pvId}/votos`).catch(() => ({ data: null })),
        api.get('/api/banco/aprobaciones/pendientes').catch(() => ({ data: null })),
      ]);

      // materias (para nombre)
      const matList = safeArray(unwrapResponse(matRes?.data));
      const map = new Map();
      matList.forEach((m) => map.set(String(m?.id), m));
      setMateriasMap(map);

      // votos anteriores
      setVotos(safeArray(unwrapResponse(votosRes?.data)));

      // tomar la versión desde pendientes (suele traer enunciado, tipo, etc.)
      const pendList = safeArray(unwrapResponse(pendRes?.data));
      const row = pendList.find((r) => String(r?.id) === String(pvId)) || null;

      if (row) setVersion(row);

      const pid = row?.pregunta_id ?? row?.preguntaId ?? null;

      // detalle de pregunta (temas/áreas)
        if (pid) {
            const { data } = await api.get(`/api/banco/pregunta/${pid}`);
            const resp = unwrapResponse(data);

            if (resp) {
                setPregunta(resp.pregunta || null);
                setTemas(safeArray(resp.temas));
                setAreas(safeArray(resp.areas));
                const areaList = safeArray(resp.areas);
                setAreas(areaList);

                if (areaList.length === 1) {
                const onlyId = areaList[0]?.area_id ?? areaList[0]?.id;
                if (onlyId) setAreaId(String(onlyId));
}

            // si version_actual coincide, la mezclamos (por si pendientes no trae algo)
                const va = resp.version_actual || null;
                if (va && String(va?.id) === String(pvId)) {
                    setVersion((prev) => ({ ...(prev || {}), ...(va || {}) }));
                }
            }
        }

      // default de área si solo hay una
      const aIds = safeArray(row?.areas ?? null).length
        ? safeArray(row.areas).map((a) => a?.area_id ?? a?.id).filter(Boolean)
        : [];

      if (aIds.length === 1) setAreaId(String(aIds[0]));
    } catch (err) {
      const msg = err?.response?.data?.response || err?.response?.data?.message || 'Error al cargar información';
      setError(msg);
    }
  }

  const materiaText = useMemo(() => {
    const mid = version?.materia_id ?? pregunta?.materia_id ?? null;
    if (!mid) return '—';
    const m = materiasMap.get(String(mid));
    if (!m) return `Materia #${mid}`;

    const codigo = m?.codigo ?? m?.codigo_materia ?? m?.codigoMateria ?? '';
    const nombre = m?.nombre ?? m?.nombre_materia ?? m?.nombreMateria ?? '';
    return [codigo, nombre].filter(Boolean).join(' — ') || `Materia #${mid}`;
  }, [materiasMap, pregunta, version]);

  const tipoText = useMemo(() => {
    const t = String(version?.tipo || '').toLowerCase();
    return TIPO_LABEL[t] || (t ? t : '—');
  }, [version]);

  const scopeText = useMemo(() => {
    const s = String(version?.scope || '').toLowerCase();
    if (s === 'final') return 'Examen final';
    if (s === 'parcial') return `Parcial ${version?.parcial_id || '—'}`;
    return s ? s : '—';
  }, [version]);

  const contenido = useMemo(() => parseMaybeJson(version?.contenido_json), [version?.contenido_json]);
  const respuesta = useMemo(() => parseMaybeJson(version?.respuesta_json), [version?.respuesta_json]);

  const badge = (value) => {
    const v = String(value ?? '').toLowerCase();
    const cls =
      v === 'aprobada'
        ? 'bg-emerald-100 text-emerald-800'
        : v === 'rechazada'
        ? 'bg-rose-100 text-rose-800'
        : v === 'revision'
        ? 'bg-amber-100 text-amber-800'
        : v === 'pendiente'
        ? 'bg-sky-100 text-sky-800'
        : 'bg-slate-100 text-slate-800';

    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
        {value ?? '—'}
      </span>
    );
  };

  const getVotoIcon = (dec) => {
    if (dec === 'aprobar') return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    if (dec === 'rechazar') return <XCircle className="h-4 w-4 text-rose-600" />;
    if (dec === 'revision') return <Clock className="h-4 w-4 text-amber-600" />;
    return null;
  };

  const decisionLabel = (dec) => {
    if (dec === 'aprobar') return 'Aprobó';
    if (dec === 'revision') return 'Solicitó revisión';
    if (dec === 'rechazar') return 'Rechazó';
    return dec || '—';
  };

  async function submitVote(dec) {
    setError('');
    setAction(dec);

    const mustComment = dec === 'revision' || dec === 'rechazar';
    if (mustComment && !comentario.trim()) {
      setError('Escribe un comentario para poder solicitar revisión o rechazar.');
      return;
    }

    setLoadingVoto(true);
    setSubmitting(dec);

    try {
      const payload = {
        decision: dec,
        comentario: mustComment ? comentario.trim() : (comentario.trim() || null),
      };
        if (String(areaId || '').trim()) payload.area_id = Number(areaId);
      const { data } = await api.post(`/api/banco/version/${preguntaVersionId}/voto`, payload);
      const resp = unwrapResponse(data);

      if (resp || data) {
        onSuccess?.();
        handleClose();
      }
    } catch (err) {
      const msg = err?.response?.data?.response || err?.response?.data?.message || 'Error al registrar voto';
      setError(msg);
    } finally {
      setLoadingVoto(false);
      setSubmitting('');
    }
  }

  const handleClose = () => {
    setAction('aprobar');
    setComentario('');
    setAreaId('');
    setError('');
    setVersion(null);
    setPregunta(null);
    setTemas([]);
    setAreas([]);
    setVotos([]);
    onClose?.();
  };

  const AnswerCard = ({ title, children }) => (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-2">
        <div className="text-xs font-semibold text-slate-700">{title}</div>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );

  // ====== Mostrar respuestas “humanas” (sin JSON) ======
  const renderRespuestas = () => {
    const tipo = String(version?.tipo || '').toLowerCase();

    if (tipo === 'opcion_multiple') {
      const opciones = safeArray(contenido?.opciones).map((x) => String(x ?? '').trim());
      const correctasIdx = safeArray(respuesta?.correcta).map((n) => Number(n)).filter((n) => Number.isFinite(n));
      return (
        <AnswerCard title="Opciones (marcando la(s) correcta(s))">
          <div className="space-y-2">
            {opciones.map((op, idx) => {
              const isCorrect = correctasIdx.includes(idx);
              return (
                <div key={idx} className={`flex items-start gap-2 rounded-md border p-2 ${isCorrect ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="mt-0.5">{isCorrect ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-xs text-slate-600">{idx + 1}</span>}</div>
                  <div className="text-sm text-slate-800">{op || '—'}</div>
                </div>
              );
            })}
          </div>
        </AnswerCard>
      );
    }

    if (tipo === 'verdadero_falso') {
      const correcta = !!respuesta?.correcta;
      return (
        <AnswerCard title="Respuesta correcta">
          <div className="text-sm text-slate-800">
            Correcta: <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${correcta ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{correcta ? 'Verdadero' : 'Falso'}</span>
          </div>
        </AnswerCard>
      );
    }

    if (tipo === 'completar') {
      const blanks = safeArray(contenido?.blanks);
      const resBlanks = safeArray(respuesta?.blanks);
      const map = new Map(resBlanks.map((b) => [Number(b?.id), String(b?.valor ?? '').trim()]));
      return (
        <AnswerCard title="Respuestas correctas">
          {blanks.length ? (
            <div className="space-y-2">
              {blanks.map((b, idx) => {
                const id = Number(b?.id ?? idx + 1);
                const placeholder = String(b?.placeholder ?? '___');
                const valor = map.get(id) ?? '—';
                return (
                  <div key={id} className="rounded-md border border-slate-200 bg-slate-50 p-2 text-sm">
                    <div className="text-slate-700">
                      <span className="font-medium text-slate-900">{placeholder}</span>
                    </div>
                    <div className="mt-1 text-slate-700">
                      Correcta: <span className="font-medium text-slate-900">{valor}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-slate-600">Sin espacios configurados.</div>
          )}
        </AnswerCard>
      );
    }

    if (tipo === 'relacionar') {
      const pares = safeArray(contenido?.pares);
      const correctas = safeArray(respuesta?.correctas);
      return (
        <AnswerCard title="Relaciones correctas">
          {pares.length ? (
            <div className="space-y-2">
              {pares.map((p, idx) => {
                const izq = String(p?.izq ?? '').trim() || `Elemento ${idx + 1}`;
                const corr = correctas.find((c) => String(c?.izq ?? '').trim() === String(p?.izq ?? '').trim());
                const derOk = String(corr?.der ?? '').trim();
                return (
                  <div key={idx} className="rounded-md border border-slate-200 bg-slate-50 p-2">
                    <div className="text-sm font-medium text-slate-900">{izq}</div>
                    <div className="mt-1 text-sm text-slate-700">
                      Correcta: <span className="font-medium text-slate-900">{derOk || '—'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-slate-600">Sin pares configurados.</div>
          )}
        </AnswerCard>
      );
    }

    if (tipo === 'ordenar') {
      const items = safeArray(contenido?.items).map((x) => String(x ?? '').trim()).filter(Boolean);
      return (
        <AnswerCard title="Orden correcto">
          {items.length ? (
            <ol className="list-decimal pl-5 text-sm text-slate-800 space-y-1">
              {items.map((it, idx) => (
                <li key={idx}>{it}</li>
              ))}
            </ol>
          ) : (
            <div className="text-sm text-slate-600">Sin items configurados.</div>
          )}
        </AnswerCard>
      );
    }

    if (tipo === 'numerica') {
      const unidad = String(contenido?.unidad ?? '').trim();
      const valor = respuesta?.valor;
      const tol = respuesta?.tolerancia;
      return (
        <AnswerCard title="Respuesta correcta">
          <div className="text-sm text-slate-800">
            Valor: <span className="font-medium text-slate-900">{String(valor ?? '—')}</span>
            {unidad ? <span className="text-slate-600"> {unidad}</span> : null}
          </div>
          <div className="mt-1 text-xs text-slate-600">Tolerancia: {String(tol ?? '0')}</div>
        </AnswerCard>
      );
    }

    // abierta (guía)
    const rubrica = safeArray(contenido?.rubrica).map((x) => String(x ?? '').trim()).filter(Boolean);
    const keywords = safeArray(contenido?.keywords).map((x) => String(x ?? '').trim()).filter(Boolean);
    const minHits = respuesta?.min_hits;

    return (
      <AnswerCard title="Guía de evaluación">
        {rubrica.length ? (
          <div className="mb-3">
            <div className="text-xs font-semibold text-slate-700">Rúbrica</div>
            <ul className="mt-1 list-disc pl-5 text-sm text-slate-800 space-y-1">
              {rubrica.map((r, idx) => (
                <li key={idx}>{r}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {keywords.length ? (
          <div>
            <div className="text-xs font-semibold text-slate-700">Keywords sugeridas</div>
            <div className="mt-1 flex flex-wrap gap-2">
              {keywords.map((k, idx) => (
                <span key={idx} className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                  {k}
                </span>
              ))}
            </div>
            {minHits != null ? <div className="mt-2 text-xs text-slate-600">Mínimo de coincidencias: {String(minHits)}</div> : null}
          </div>
        ) : (
          <div className="text-sm text-slate-600">Sin rúbrica/keywords configuradas.</div>
        )}
      </AnswerCard>
    );
  };

  const showAreaSelect = safeArray(areas).length > 1;

  return (
    <Modal
      open={open}
      title="Revisar pregunta"
      onClose={handleClose}
      size="xl"
      scrollable
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={loadingVoto}>
            Cancelar
          </Button>

          <Button
            onClick={() => submitVote('aprobar')}
            disabled={loadingVoto}
            className="bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-600"
          >
            {submitting === 'aprobar' ? 'Aprobando...' : 'Aprobar'}
          </Button>

          <Button
            onClick={() => submitVote('revision')}
            disabled={loadingVoto}
            className="bg-amber-500 hover:bg-amber-600 focus:ring-amber-500"
          >
            {submitting === 'revision' ? 'Enviando...' : 'Solicitar revisión'}
          </Button>

          <Button
            variant="danger"
            onClick={() => submitVote('rechazar')}
            disabled={loadingVoto}
          >
            {submitting === 'rechazar' ? 'Rechazando...' : 'Rechazar'}
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {error}
        </div>
      ) : version ? (
        <div className="space-y-4">
          {/* Resumen */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-xs font-medium text-slate-600">Materia</div>
                <div className="text-sm font-semibold text-slate-900">{materiaText}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600">Estado</span>
                {badge(version?.estado ?? pregunta?.estado)}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <div className="text-xs font-medium text-slate-600">Tema(s)</div>
                {temas.length ? (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {temas.map((t) => (
                      <span
                        key={t.id}
                        className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800"
                      >
                        {t.parcial_id ? `P${t.parcial_id} · ` : ''}{t.nombre ?? 'Tema'}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="mt-1 text-sm text-slate-500">Sin tema asignado</div>
                )}
              </div>

              <div>
                <div className="text-xs font-medium text-slate-600">Alcance</div>
                <div className="mt-1 text-sm text-slate-800">{scopeText}</div>
              </div>

              <div>
                <div className="text-xs font-medium text-slate-600">Tipo y dificultad</div>
                <div className="mt-1 text-sm text-slate-800">
                  {tipoText} · {version?.dificultad ?? '—'}/10
                </div>
              </div>
            </div>

            {showAreaSelect ? (
              <div className="mt-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-slate-600">Área (si aplica)</span>
                  <select
                    value={areaId}
                    onChange={(e) => setAreaId(e.target.value)}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
                  >
                    <option value="">Selecciona...</option>
                    {areas.map((a, idx) => (
                      <option key={idx} value={String(a?.area_id ?? a?.id ?? '')}>
                        Área #{a?.area_id ?? a?.id ?? idx + 1}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}
          </div>

          {/* Enunciado */}
          <div>
            <div className="text-xs font-medium text-slate-600 mb-1">Enunciado</div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
              {version?.enunciado ?? '—'}
            </div>
          </div>

          {/* ✅ Comentario (siempre visible; obligatorio solo si solicitas revisión/rechazas) */}
          <div ref={commentWrapRef} className={`rounded-xl border p-4 ${needsComment ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">Comentario</div>
              <div className="text-xs text-slate-600">
                {needsComment ? 'Obligatorio para revisión/rechazo' : 'Opcional (si apruebas)'}
              </div>
            </div>

            <div className="mt-2">
              <textarea
                ref={commentRef}
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                rows={3}
                placeholder={needsComment ? (action === 'rechazar' ? 'Explica por qué se rechaza...' : '¿Qué debe corregir el docente?') : 'Comentario opcional...'}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red resize-none"
              />
              {!needsComment ? (
                <div className="mt-2 text-xs text-slate-500">
                  Si eliges <strong>Solicitar revisión</strong> o <strong>Rechazar</strong>, el comentario será requerido.
                </div>
              ) : null}
            </div>
          </div>

          {/* Respuestas (UI friendly) */}
          {renderRespuestas()}

          {/* Votos anteriores */}
          {votos.length > 0 ? (
            <div>
              <div className="text-xs font-medium text-slate-600 mb-2">Historial de revisiones</div>
              <div className="space-y-2">
                {votos.map((v) => (
                  <div key={v.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center gap-2">
                      {getVotoIcon(v.decision)}
                      <div className="text-xs font-semibold text-slate-900">{decisionLabel(v.decision)}</div>
                      <div className="text-xs text-slate-500">
                        · {v.area_id ? `Área #${v.area_id}` : 'Admin'}
                      </div>
                    </div>
                    {v.comentario ? (
                      <div className="mt-1 text-xs text-slate-700">
                        <span className="font-medium">Comentario:</span> {v.comentario}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          No se encontró la versión a revisar. Intenta refrescar la lista de pendientes.
        </div>
      )}
    </Modal>
  );
}
