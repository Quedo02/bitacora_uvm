// src/components/banco/ModalNuevaPregunta.jsx
import { useEffect, useMemo, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import api from '../../api/axios';

function unwrapResponse(data) {
  if (!data) return null;
  if (typeof data === 'object' && data !== null && 'response' in data) return data.response;
  return data;
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function toLinesArray(text) {
  return String(text || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function clamp(n, min, max) {
  const x = Number(n);
  if (Number.isNaN(x)) return min;
  return Math.min(max, Math.max(min, x));
}

const TIPO_OPTIONS = [
  { value: 'opcion_multiple', label: 'Opción múltiple' },
  { value: 'verdadero_falso', label: 'Verdadero / Falso' },
  { value: 'abierta', label: 'Abierta (respuesta libre)' },
  { value: 'completar', label: 'Completar espacios' },
  { value: 'relacionar', label: 'Relacionar columnas' },
  { value: 'ordenar', label: 'Ordenar pasos' },
  { value: 'numerica', label: 'Numérica' },
];

export default function ModalNuevaPregunta({ open, onClose, materiaId, materiaNombre, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [temas, setTemas] = useState([]);

  const title = materiaNombre
    ? `Nueva pregunta para la materia "${materiaNombre}"`
    : 'Nueva pregunta';

  // ======= Campos comunes =======
  const [formData, setFormData] = useState({
    materia_id: '',
    tipo: 'opcion_multiple',
    enunciado: '',
    dificultad: 5,
    scope: 'parcial', // 'parcial' | 'final'
    parcial_id: 1,
    tema_ids: [],
  });

  // ======= Campos por tipo =======
  const [omMultiple, setOmMultiple] = useState(false);
  const [omOpciones, setOmOpciones] = useState(['', '']);
  const [omCorrectas, setOmCorrectas] = useState([0]); // índices

  const [vfCorrecta, setVfCorrecta] = useState(false);

  const [compBlanks, setCompBlanks] = useState([{ id: 1, placeholder: '___', tipo: 'texto', valor: '' }]);

  // Relacionar (v2): dos columnas por líneas + mapeo correcto
  const [relIzqText, setRelIzqText] = useState('');
  const [relDerText, setRelDerText] = useState('');
  const [relMap, setRelMap] = useState({}); // { [idxIzq]: idxDer }
  const [relLens, setRelLens] = useState({ izq: 0, der: 0 });

  const [ordItems, setOrdItems] = useState(['', '']);

  const [numUnidad, setNumUnidad] = useState('');
  const [numValor, setNumValor] = useState('');
  const [numTol, setNumTol] = useState('0');

  const [abRubrica, setAbRubrica] = useState(['']);
  const [abKeywords, setAbKeywords] = useState(['']);
  const [abMinHits, setAbMinHits] = useState(1);

  // ======= Efectos =======
  useEffect(() => {
    if (open && materiaId) {
      setFormData((prev) => ({
        ...prev,
        materia_id: String(materiaId),
      }));
      loadTemas(materiaId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, materiaId]);

  // Cuando cambia el tipo, limpia el error y asegura mínimos
  useEffect(() => {
    setError('');

    if (formData.tipo === 'opcion_multiple') {
      if (omOpciones.length < 2) setOmOpciones(['', '']);
      if (!Array.isArray(omCorrectas) || omCorrectas.length === 0) setOmCorrectas([0]);
    }

    if (formData.tipo === 'ordenar') {
      if (ordItems.length < 2) setOrdItems(['', '']);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.tipo]);

  // Relacionar (v2): si cambia el número de líneas, resetea relaciones para evitar desfases
  useEffect(() => {
    if (formData.tipo !== 'relacionar') return;

    const izq = toLinesArray(relIzqText);
    const der = toLinesArray(relDerText);

    // Si cambia el conteo de líneas, limpiamos el mapeo (evita “corrimientos” cuando insertas/quitas renglones)
    if (izq.length !== relLens.izq || der.length !== relLens.der) {
      setRelMap({});
      setRelLens({ izq: izq.length, der: der.length });
      return;
    }

    // Si no cambió el conteo, solo “podamos” valores fuera de rango
    setRelMap((prev) => {
      const next = {};
      for (let i = 0; i < izq.length; i++) {
        const v = prev[i];
        if (v === undefined || v === null || v === '') continue;
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0 || n >= der.length) continue;
        next[i] = n;
      }
      return next;
    });
  }, [formData.tipo, relIzqText, relDerText, relLens.izq, relLens.der]);


  async function loadTemas(mId) {
    try {
      const { data } = await api.get(`/api/banco/materia/${mId}/temas`);
      const resp = unwrapResponse(data);
      setTemas(safeArray(resp));
    } catch (err) {
      console.error('Error cargando temas:', err);
      setTemas([]);
    }
  }

  const handleCommonChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTemasChange = (temaId, checked) => {
    setFormData((prev) => {
      const current = safeArray(prev.tema_ids);
      const tid = Number(temaId);
      if (!tid) return prev;
      if (checked) return { ...prev, tema_ids: Array.from(new Set([...current, tid])) };
      return { ...prev, tema_ids: current.filter((id) => id !== tid) };
    });
  };

  const partialIsEnabled = formData.scope === 'parcial';
  useEffect(() => {
    if (!partialIsEnabled) {
      setFormData((prev) => ({ ...prev, parcial_id: null }));
    } else {
      setFormData((prev) => ({ ...prev, parcial_id: prev.parcial_id ?? 1 }));
    }
  }, [partialIsEnabled]);

  // ======= Construir payload por tipo =======
  const builtJson = useMemo(() => {
    const tipo = formData.tipo;

    if (tipo === 'opcion_multiple') {
      const opciones = omOpciones.map((s) => String(s || '').trim());
      const correctas = safeArray(omCorrectas)
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n));

      return {
        contenido_json: { opciones, multiple: !!omMultiple },
        respuesta_json: { correcta: correctas },
      };
    }

    if (tipo === 'verdadero_falso') {
      // No hace falta “enunciado_corto”. El enunciado ya está en el campo principal.
      // Mandamos contenido_json vacío para mantener consistencia.
      return {
        contenido_json: {},
        respuesta_json: { correcta: !!vfCorrecta },
      };
    }

    if (tipo === 'completar') {
      const blanks = compBlanks
        .map((b, idx) => ({
          id: Number(b.id || idx + 1),
          placeholder: String(b.placeholder || '___').trim(),
          tipo: String(b.tipo || 'texto'),
          valor: b.valor,
        }))
        .filter((b) => b.id > 0);

      return {
        contenido_json: {
          blanks: blanks.map(({ id, placeholder, tipo }) => ({ id, placeholder, tipo })),
        },
        respuesta_json: {
          blanks: blanks.map(({ id, valor }) => ({ id, valor: String(valor ?? '').trim() })),
        },
      };
    }

    if (tipo === 'relacionar') {
      // v2: dos columnas (1 opción por renglón) + mapeo de relación correcta
      const izqLines = toLinesArray(relIzqText);
      const derLines = toLinesArray(relDerText);

      const izq = izqLines.map((texto, idx) => ({ id: `L${idx + 1}`, texto }));
      const der = derLines.map((texto, idx) => ({ id: `R${idx + 1}`, texto }));

      const matches = izq.map((l, idxIzq) => {
        const idxDer = Number(relMap?.[idxIzq]);
        const r = der[idxDer];
        return { izq_id: l.id, der_id: r ? r.id : null };
      });

      return {
        contenido_json: { version: 2, izq, der, one_to_one: true },
        respuesta_json: { version: 2, matches },
      };
    }

    if (tipo === 'ordenar') {
      const items = ordItems.map((s) => String(s || '').trim()).filter(Boolean);
      return {
        contenido_json: { items },
        // Convención: el orden correcto es el orden en que los escribes aquí
        respuesta_json: { orden: items.map((_, idx) => idx) },
      };
    }

    if (tipo === 'numerica') {
      return {
        contenido_json: { unidad: String(numUnidad || '').trim() },
        respuesta_json: {
          valor: Number(numValor),
          tolerancia: Number(numTol),
        },
      };
    }

    // abierta
    const rubrica = abRubrica.map((s) => String(s || '').trim()).filter(Boolean);
    const kw = abKeywords.map((s) => String(s || '').trim()).filter(Boolean);
    const minHits = clamp(abMinHits, 0, 999);

    return {
      contenido_json: { rubrica, keywords: kw },
      respuesta_json: { keywords: kw, min_hits: minHits },
    };
  }, [
    formData.tipo,
    omOpciones,
    omCorrectas,
    omMultiple,
    vfCorrecta,
    compBlanks,
    relIzqText,
    relDerText,
    relMap,
    ordItems,
    numUnidad,
    numValor,
    numTol,
    abRubrica,
    abKeywords,
    abMinHits,
  ]);

  // ======= Validaciones mínimas por tipo =======
  const validateByTipo = () => {
    const tipo = formData.tipo;

    if (!String(formData.enunciado || '').trim()) return 'Escribe el enunciado de la pregunta';
    if (!materiaId && !formData.materia_id) return 'Selecciona una materia primero';

    if (tipo === 'opcion_multiple') {
      const opciones = omOpciones.map((s) => String(s || '').trim()).filter(Boolean);
      if (opciones.length < 2) return 'Opción múltiple: agrega mínimo 2 opciones';
      const correctas = safeArray(omCorrectas);
      if (correctas.length < 1) return 'Opción múltiple: marca la respuesta correcta';
      if (!omMultiple && correctas.length !== 1) return 'Opción múltiple: solo debe haber 1 respuesta correcta (o activa “múltiples correctas”)';
      return '';
    }

    if (tipo === 'verdadero_falso') {
      return '';
    }

    if (tipo === 'completar') {
      const filled = compBlanks.filter((b) => String(b.placeholder || '').trim());
      if (filled.length < 1) return 'Completar: agrega al menos 1 espacio';
      const missing = filled.find((b) => String(b.valor || '').trim() === '');
      if (missing) return 'Completar: falta la respuesta correcta de un espacio';
      return '';
    }

    if (tipo === 'relacionar') {
      const izq = toLinesArray(relIzqText);
      const der = toLinesArray(relDerText);

      if (izq.length < 2) return 'Relacionar: escribe mínimo 2 opciones del lado izquierdo (1 por renglón)';
      if (der.length < 2) return 'Relacionar: escribe mínimo 2 opciones del lado derecho (1 por renglón)';
      if (der.length < izq.length) return 'Relacionar: el lado derecho debe tener al menos tantas opciones como el izquierdo';

      const used = new Set();
      for (let i = 0; i < izq.length; i++) {
        const v = relMap?.[i];
        if (v === undefined || v === null || v === '') {
          return 'Relacionar: define la relación correcta para cada elemento de la izquierda';
        }
        const idxDer = Number(v);
        if (!Number.isFinite(idxDer) || idxDer < 0 || idxDer >= der.length) {
          return 'Relacionar: hay una relación inválida (vuelve a seleccionar)';
        }
        if (used.has(idxDer)) return 'Relacionar: no se puede repetir la misma opción del lado derecho';
        used.add(idxDer);
      }
      return '';
    }

    if (tipo === 'ordenar') {
      const items = ordItems.map((s) => String(s || '').trim()).filter(Boolean);
      if (items.length < 2) return 'Ordenar: agrega mínimo 2 pasos';
      return '';
    }

    if (tipo === 'numerica') {
      if (String(numValor || '').trim() === '') return 'Numérica: escribe el valor correcto';
      if (Number.isNaN(Number(numValor))) return 'Numérica: el valor correcto debe ser un número';
      if (String(numTol || '').trim() === '') return 'Numérica: escribe la tolerancia (usa 0 si aplica)';
      if (Number.isNaN(Number(numTol))) return 'Numérica: la tolerancia debe ser un número';
      return '';
    }

    // abierta
    return '';
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setError('');

    const v = validateByTipo();
    if (v) {
      setError(v);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        materia_id: Number(materiaId || formData.materia_id),
        dificultad: clamp(formData.dificultad, 1, 10),
        parcial_id: formData.scope === 'parcial' ? (formData.parcial_id ? Number(formData.parcial_id) : null) : null,
        contenido_json: builtJson.contenido_json,
        respuesta_json: builtJson.respuesta_json,
      };

      const { data } = await api.post('/api/banco/preguntas', payload);
      const resp = unwrapResponse(data);

      if (resp) {
        onSuccess?.(resp);
        handleClose();
      }
    } catch (err) {
      const msg = err?.response?.data?.response || err?.response?.data?.message || 'Error al crear pregunta';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setFormData({
      materia_id: '',
      tipo: 'opcion_multiple',
      enunciado: '',
      dificultad: 5,
      scope: 'parcial',
      parcial_id: 1,
      tema_ids: [],
    });

    setOmMultiple(false);
    setOmOpciones(['', '']);
    setOmCorrectas([0]);

    setVfCorrecta(false);

    setCompBlanks([{ id: 1, placeholder: '___', tipo: 'texto', valor: '' }]);

    setRelIzqText('');
    setRelDerText('');
    setRelMap({});
    setRelLens({ izq: 0, der: 0 });

    setOrdItems(['', '']);

    setNumUnidad('');
    setNumValor('');
    setNumTol('0');

    setAbRubrica(['']);
    setAbKeywords(['']);
    setAbMinHits(1);

    setError('');
  };

  const handleClose = () => {
    resetAll();
    onClose?.();
  };

  // ======= UI por tipo =======
  const renderTipoFields = () => {
    const tipo = formData.tipo;

    if (tipo === 'opcion_multiple') {
      const setCorrectSingle = (idx) => setOmCorrectas([idx]);

      const toggleCorrectMulti = (idx) => {
        setOmCorrectas((prev) => {
          const cur = new Set(safeArray(prev).map(Number));
          if (cur.has(idx)) cur.delete(idx);
          else cur.add(idx);
          return Array.from(cur).sort((a, b) => a - b);
        });
      };

      const addOpcion = () => setOmOpciones((prev) => [...prev, '']);
      const removeOpcion = (idx) => {
        setOmOpciones((prev) => prev.filter((_, i) => i !== idx));
        setOmCorrectas((prev) =>
          safeArray(prev)
            .map(Number)
            .filter((i) => i !== idx)
            .map((i) => (i > idx ? i - 1 : i))
        );
      };

      return (
        <div className="rounded-lg border border-slate-200 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-700">Opciones</div>
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={omMultiple}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setOmMultiple(checked);
                  if (!checked) {
                    setOmCorrectas((prev) => (safeArray(prev).length ? [Number(safeArray(prev)[0])] : [0]));
                  }
                }}
              />
              Permitir más de una respuesta correcta
            </label>
          </div>

          <div className="space-y-2">
            {omOpciones.map((opt, idx) => (
              <div key={idx} className="grid grid-cols-[28px_1fr_88px] items-center gap-2">
                <div className="flex items-center justify-center">
                  {omMultiple ? (
                    <input
                      type="checkbox"
                      checked={safeArray(omCorrectas).map(Number).includes(idx)}
                      onChange={() => toggleCorrectMulti(idx)}
                      title="Correcta"
                    />
                  ) : (
                    <input
                      type="radio"
                      name="om_correcta"
                      checked={safeArray(omCorrectas).map(Number)[0] === idx}
                      onChange={() => setCorrectSingle(idx)}
                      title="Correcta"
                    />
                  )}
                </div>

                <input
                  value={opt}
                  onChange={(e) => {
                    const v = e.target.value;
                    setOmOpciones((prev) => prev.map((x, i) => (i === idx ? v : x)));
                  }}
                  placeholder={`Opción ${idx + 1}`}
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 shadow-sm focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
                />

                <div className="flex justify-end">
                  <Button
                    variant="outline_secondary"
                    size="sm"
                    onClick={() => removeOpcion(idx)}
                    disabled={omOpciones.length <= 2}
                    type="button"
                  >
                    Quitar
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex justify-end">
            <Button variant="outline_primary" size="sm" onClick={addOpcion} type="button">
              + Agregar opción
            </Button>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            Marca la(s) respuesta(s) correcta(s) usando el círculo/cuadro a la izquierda.
          </p>
        </div>
      );
    }

    if (tipo === 'verdadero_falso') {
      return (
        <div className="rounded-lg border border-slate-200 p-3">
          <div className="text-xs font-semibold text-slate-700">Respuesta correcta</div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800">
              <input
                type="radio"
                name="vf_correcta"
                checked={vfCorrecta === true}
                onChange={() => setVfCorrecta(true)}
              />
              Verdadero
            </label>
            <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800">
              <input
                type="radio"
                name="vf_correcta"
                checked={vfCorrecta === false}
                onChange={() => setVfCorrecta(false)}
              />
              Falso
            </label>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Tip: en el enunciado trata de usar una afirmación clara (que pueda ser verdadera o falsa).
          </p>
        </div>
      );
    }

    if (tipo === 'completar') {
      const addBlank = () => {
        setCompBlanks((prev) => {
          const nextId = Math.max(...prev.map((b) => Number(b.id || 0)), 0) + 1;
          return [...prev, { id: nextId, placeholder: '___', tipo: 'texto', valor: '' }];
        });
      };
      const removeBlank = (idx) => setCompBlanks((prev) => prev.filter((_, i) => i !== idx));

      return (
        <div className="rounded-lg border border-slate-200 p-3">
          <div className="mb-2 text-xs font-semibold text-slate-700">Espacios a completar</div>

          <div className="space-y-2">
            {compBlanks.map((b, idx) => (
              <div
                key={b.id ?? idx}
                className="grid grid-cols-1 gap-2 rounded-md border border-slate-100 bg-slate-50 p-2 md:grid-cols-[1fr_140px_1fr_88px] md:items-end"
              >
                <Input
                  label="Cómo se verá el espacio (opcional)"
                  value={b.placeholder}
                  onChange={(e) =>
                    setCompBlanks((prev) => prev.map((x, i) => (i === idx ? { ...x, placeholder: e.target.value } : x)))
                  }
                  placeholder="___"
                />

                <Select
                  label="Tipo"
                  value={b.tipo}
                  onChange={(e) => setCompBlanks((prev) => prev.map((x, i) => (i === idx ? { ...x, tipo: e.target.value } : x)))}
                >
                  <option value="texto">Texto</option>
                  <option value="numero">Número</option>
                </Select>

                <Input
                  label="Respuesta correcta"
                  value={b.valor}
                  onChange={(e) => setCompBlanks((prev) => prev.map((x, i) => (i === idx ? { ...x, valor: e.target.value } : x)))}
                  placeholder="Escribe la respuesta…"
                />

                <div className="flex justify-end">
                  <Button
                    variant="outline_secondary"
                    size="sm"
                    onClick={() => removeBlank(idx)}
                    disabled={compBlanks.length <= 1}
                    type="button"
                  >
                    Quitar
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex justify-end">
            <Button variant="outline_primary" size="sm" onClick={addBlank} type="button">
              + Agregar espacio
            </Button>
          </div>
        </div>
      );
    }

    if (tipo === 'relacionar') {
      const izq = toLinesArray(relIzqText);
      const der = toLinesArray(relDerText);

      const autoByOrder = () => {
        if (izq.length === 0 || der.length === 0) return;
        const n = Math.min(izq.length, der.length);
        const m = {};
        for (let i = 0; i < n; i++) m[i] = i;
        setRelMap(m);
      };

      const clearMap = () => setRelMap({});

      return (
        <div className="rounded-lg border border-slate-200 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-700">Relacionar (dos columnas)</div>

            <div className="flex gap-2">
              <Button
                variant="outline_secondary"
                size="sm"
                onClick={clearMap}
                type="button"
                disabled={!relMap || Object.keys(relMap).length === 0}
              >
                Limpiar relaciones
              </Button>

              <Button
                variant="outline_primary"
                size="sm"
                onClick={autoByOrder}
                type="button"
                disabled={izq.length === 0 || der.length === 0 || der.length < izq.length}
              >
                Auto (por orden)
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Lado izquierdo (1 por renglón)</span>
              <textarea
                value={relIzqText}
                onChange={(e) => setRelIzqText(e.target.value)}
                placeholder={'Ej: A\nB\nC\nD'}
                rows={6}
                className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 shadow-sm focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
              />
            </div>

            <div className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Lado derecho (1 por renglón)</span>
              <textarea
                value={relDerText}
                onChange={(e) => setRelDerText(e.target.value)}
                placeholder={'Ej: 2\n4\n3\n1'}
                rows={6}
                className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 shadow-sm focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
              />
            </div>
          </div>

          <div className="mt-3 rounded-md border border-slate-100 bg-slate-50 p-2">
            <div className="text-xs font-semibold text-slate-700">Define la relación correcta</div>
            <p className="mt-1 text-xs text-slate-500">
              Selecciona con qué opción del lado derecho se relaciona cada elemento del lado izquierdo. (Si cambias el número de renglones, se
              reinician las relaciones.)
            </p>

            {izq.length === 0 || der.length === 0 ? (
              <div className="mt-2 text-sm text-slate-600">Escribe opciones en ambos lados para poder relacionar.</div>
            ) : (
              <div className="mt-2 grid grid-cols-1 gap-2">
                {izq.map((l, idx) => {
                  const current = relMap?.[idx];

                  const usedByOthers = new Set(
                    Object.entries(relMap || {})
                      .filter(([k, v]) => Number(k) !== idx && v !== undefined && v !== null && v !== '')
                      .map(([_, v]) => Number(v))
                      .filter((n) => Number.isFinite(n))
                  );

                  return (
                    <div key={idx} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr] md:items-end">
                      <div className="text-sm text-slate-800">
                        <span className="font-semibold">{idx + 1}.</span> {l}
                      </div>

                      <Select
                        label="Se relaciona con"
                        value={current ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setRelMap((prev) => {
                            const next = { ...(prev || {}) };
                            if (v === '') delete next[idx];
                            else next[idx] = Number(v);
                            return next;
                          });
                        }}
                      >
                        <option value="">Selecciona…</option>
                        {der.map((r, j) => (
                          <option key={j} value={j} disabled={usedByOthers.has(j) && Number(current) !== j}>
                            {r}
                          </option>
                        ))}
                      </Select>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (tipo === 'ordenar') {
      const addItem = () => setOrdItems((prev) => [...prev, '']);
      const removeItem = (idx) => setOrdItems((prev) => prev.filter((_, i) => i !== idx));

      const move = (idx, dir) => {
        setOrdItems((prev) => {
          const next = [...prev];
          const j = idx + dir;
          if (j < 0 || j >= next.length) return prev;
          [next[idx], next[j]] = [next[j], next[idx]];
          return next;
        });
      };

      return (
        <div className="rounded-lg border border-slate-200 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-700">Pasos en el orden correcto</div>
            <Button variant="outline_primary" size="sm" onClick={addItem} type="button">
              + Agregar paso
            </Button>
          </div>

          <div className="space-y-2">
            {ordItems.map((it, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_120px] gap-2 md:grid-cols-[1fr_180px] md:items-center">
                <input
                  value={it}
                  onChange={(e) => setOrdItems((prev) => prev.map((x, i) => (i === idx ? e.target.value : x)))}
                  placeholder={`Paso ${idx + 1}`}
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 shadow-sm focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
                />

                <div className="flex justify-end gap-2">
                  <Button variant="outline_secondary" size="sm" onClick={() => move(idx, -1)} disabled={idx === 0} type="button">
                    ↑
                  </Button>
                  <Button
                    variant="outline_secondary"
                    size="sm"
                    onClick={() => move(idx, +1)}
                    disabled={idx === ordItems.length - 1}
                    type="button"
                  >
                    ↓
                  </Button>
                  <Button
                    variant="outline_secondary"
                    size="sm"
                    onClick={() => removeItem(idx)}
                    disabled={ordItems.length <= 2}
                    type="button"
                  >
                    Quitar
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-2 text-xs text-slate-500">Aquí el orden en que escribes los pasos es el orden correcto.</p>
        </div>
      );
    }

    if (tipo === 'numerica') {
      return (
        <div className="rounded-lg border border-slate-200 p-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input
              label="Unidad (opcional)"
              value={numUnidad}
              onChange={(e) => setNumUnidad(e.target.value)}
              placeholder="Ej: %, kg, m, puntos"
            />

            <Input
              label="Valor correcto *"
              value={numValor}
              onChange={(e) => setNumValor(e.target.value)}
              placeholder="Ej: 24"
              inputMode="decimal"
            />

            <Input
              label="Tolerancia *"
              value={numTol}
              onChange={(e) => setNumTol(e.target.value)}
              placeholder="Ej: 0.5 (o 0 si debe ser exacto)"
              inputMode="decimal"
            />
          </div>

          <p className="mt-2 text-xs text-slate-500">
            La tolerancia es el “margen de error”. Por ejemplo: valor 10 con tolerancia 0.5 acepta 9.5 a 10.5.
          </p>
        </div>
      );
    }

    // abierta
    const addRub = () => setAbRubrica((prev) => [...prev, '']);
    const addKw = () => setAbKeywords((prev) => [...prev, '']);
    const removeRub = (idx) => setAbRubrica((prev) => prev.filter((_, i) => i !== idx));
    const removeKw = (idx) => setAbKeywords((prev) => prev.filter((_, i) => i !== idx));

    return (
      <div className="rounded-lg border border-slate-200 p-3">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-700">Criterios a calificar (opcional)</div>
              <Button variant="outline_primary" size="sm" onClick={addRub} type="button">
                + Agregar
              </Button>
            </div>

            <div className="space-y-2">
              {abRubrica.map((r, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_88px] gap-2">
                  <input
                    value={r}
                    onChange={(e) => setAbRubrica((prev) => prev.map((x, i) => (i === idx ? e.target.value : x)))}
                    placeholder={`Ej. "Justificar su respuesta" ${idx + 1}`}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 shadow-sm focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
                  />
                  <div className="flex justify-end">
                    <Button variant="outline_secondary" size="sm" onClick={() => removeRub(idx)} disabled={abRubrica.length <= 1} type="button">
                      Quitar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-700">Palabras clave esperadas (opcional)</div>
              <Button variant="outline_primary" size="sm" onClick={addKw} type="button">
                + Agregar
              </Button>
            </div>

            <div className="space-y-2">
              {abKeywords.map((k, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_88px] gap-2">
                  <input
                    value={k}
                    onChange={(e) => setAbKeywords((prev) => prev.map((x, i) => (i === idx ? e.target.value : x)))}
                    placeholder={`Palabra ${idx + 1}`}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 shadow-sm focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
                  />
                  <div className="flex justify-end">
                    <Button variant="outline_secondary" size="sm" onClick={() => removeKw(idx)} disabled={abKeywords.length <= 1} type="button">
                      Quitar
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3">
              <Input
                label="Mínimo de palabras clave (opcional)"
                type="number"
                min={0}
                value={abMinHits}
                onChange={(e) => setAbMinHits(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">Si lo dejas en 0, no se usa esta validación.</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Modal
      open={open}
      title={title}
      onClose={handleClose}
      size="xl"
      scrollable
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creando…' : 'Crear pregunta'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{error}</div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select label="Tipo de pregunta *" value={formData.tipo} onChange={(e) => handleCommonChange('tipo', e.target.value)}>
            {TIPO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>

          <Input
            label="Dificultad (1 fácil - 10 difícil)"
            type="number"
            min={1}
            max={10}
            value={formData.dificultad}
            onChange={(e) => handleCommonChange('dificultad', e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-slate-600">Enunciado *</span>
          <textarea
            value={formData.enunciado}
            onChange={(e) => handleCommonChange('enunciado', e.target.value)}
            rows={3}
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 shadow-sm focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
            placeholder="Escribe aquí la pregunta…"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select label="Se usará en" value={formData.scope} onChange={(e) => handleCommonChange('scope', e.target.value)}>
            <option value="parcial">Examen parcial</option>
            <option value="final">Examen final</option>
          </Select>

          <Input
            label="Número de parcial (si aplica)"
            type="number"
            min={1}
            max={10}
            value={formData.parcial_id ?? ''}
            onChange={(e) => handleCommonChange('parcial_id', e.target.value ? Number(e.target.value) : null)}
            disabled={!partialIsEnabled}
            placeholder={partialIsEnabled ? '1' : '—'}
          />
        </div>

        {/* Campos por tipo */}
        {renderTipoFields()}

        {/* Temas */}
        {temas.length > 0 && (
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="text-xs font-semibold text-slate-700">Tema(s) de la pregunta (opcional)</div>
            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
              {temas.map((tema) => (
                <label key={tema.id} className="flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={safeArray(formData.tema_ids).includes(Number(tema.id))}
                    onChange={(e) => handleTemasChange(tema.id, e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    {tema.parcial_id ? `P${tema.parcial_id} · ` : ''}
                    {tema.nombre}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <strong>Nota:</strong> La pregunta se creará en <em>pendiente</em> y deberá ser aprobada antes de usarse en exámenes.
        </div>
      </form>
    </Modal>
  );
}
