// src/pages/DocenteClaseDetalle.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";

import Skeleton from "../components/ui/Skeleton";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

import BitacoraImportWizard from "../components/bitacora/BitacoraImportWizard";

import {
  ArrowLeft,
  FileSpreadsheet,
  Users,
  AlertCircle,
  Download,
  Upload,
  Pencil,
  Check,
  X,
  Save,
} from "lucide-react";

function unwrapResponse(data) {
  if (!data) return null;
  if (typeof data === "object" && data && "response" in data)
    return data.response;
  return data;
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function fmt10(v) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(2);
}

function isReprobado10(v) {
  const n = Number(v);
  return Number.isFinite(n) && n < 6;
}

function calcularPromedioPonderado(items) {
  const validos = items.filter(
    (it) => it.calificacion != null && Number.isFinite(Number(it.calificacion))
  );
  if (validos.length === 0) return null;

  const sumaPesos = validos.reduce(
    (acc, it) => acc + (Number(it.peso) || 0),
    0
  );
  if (sumaPesos === 0) return null;

  const suma = validos.reduce(
    (acc, it) => acc + Number(it.calificacion) * (Number(it.peso) || 0),
    0
  );
  return suma / sumaPesos;
}

export default function DocenteClaseDetalle() {
  const { seccionId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("Parcial 1");

  // Import wizard
  const [importOpen, setImportOpen] = useState(false);
  const [importComponente, setImportComponente] = useState("blackboard");

  // Modo edición
  const [editMode, setEditMode] = useState(false);
  const [editedCalifs, setEditedCalifs] = useState({}); // { `${inscripcionId}-${actividadId}`: valor }
  const [saving, setSaving] = useState(false);

  const TABS = ["Parcial 1", "Parcial 2", "Parcial 3", "Final Semestral"];

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/api/docente/clase/${seccionId}`);
      if (res.data && res.data.ok) setData(res.data);
      else setError(unwrapResponse(res.data) || "Error desconocido");
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.response || "Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (seccionId) fetchData();
  }, [seccionId]);

  const clase = data?.clase;
  const alumnos = safeArray(clase?.alumnos);
  const componentes = safeArray(clase?.componentes);
  const tipoEvaluacion = clase?.materia?.tipo_evaluacion || "teorica";

  const pesosComponente = useMemo(() => {
    const bbComp = componentes.find((c) => c.tipo === "blackboard");
    const ecComp = componentes.find((c) => c.tipo === "continua");
    const exComp = componentes.find((c) => c.tipo === "examen");

    return {
      blackboard: bbComp?.peso || (tipoEvaluacion === "practica" ? 50 : 50),
      continua: ecComp?.peso || (tipoEvaluacion === "practica" ? 40 : 20),
      examen: exComp?.peso || (tipoEvaluacion === "practica" ? 10 : 30),
    };
  }, [componentes, tipoEvaluacion]);

  const parcialId = useMemo(() => {
    const m = String(activeTab).match(/Parcial\s+(\d+)/i);
    return m ? Number(m[1]) : null;
  }, [activeTab]);

  const isParcialTab = activeTab.startsWith("Parcial");
  const isFinalTab = activeTab === "Final Semestral";

  const filteredAlumnos = useMemo(() => {
    if (!search) return alumnos;
    const s = search.toLowerCase();
    return alumnos.filter(
      (a) =>
        (a.nombre || "").toLowerCase().includes(s) ||
        String(a.matricula || "").includes(s)
    );
  }, [alumnos, search]);

  const existingActividadIndex = useMemo(() => {
    const out = { blackboard: {}, continua: {} };
    const estructura = clase?.estructura_bitacora || {};
    for (const [parcialLabel, comps] of Object.entries(estructura)) {
      for (const compKey of ["blackboard", "continua"]) {
        const acts = safeArray(comps?.[compKey]);
        for (const a of acts) {
          if (a?.nombre_actividad)
            out[compKey][a.nombre_actividad] = parcialLabel;
        }
      }
    }
    return out;
  }, [clase]);

  // =====================================================
  // CÁLCULOS DE CALIFICACIONES
  // =====================================================

  const getCalifValue = useCallback(
    (inscripcionId, actividadId, originalValue) => {
      const key = `${inscripcionId}-${actividadId}`;
      if (editMode && editedCalifs.hasOwnProperty(key)) {
        return editedCalifs[key];
      }
      return originalValue;
    },
    [editMode, editedCalifs]
  );

  const calcularCalificacionesParcial = useCallback(
    (alum, parcialKey) => {
      const bitacoraParcial = alum.bitacora?.[parcialKey];
      if (!bitacoraParcial)
        return { blackboard: null, continua: null, examen: null, final: null };

      const actsBB = safeArray(bitacoraParcial?.blackboard);
      const itemsBB = actsBB.map((a) => ({
        calificacion: getCalifValue(
          alum.inscripcion_id,
          a.actividad_id,
          a.calificacion_alumno
        ),
        peso: a.peso_actividad,
      }));
      const califBB =
        actsBB.length > 0 ? calcularPromedioPonderado(itemsBB) : null;

      const actsEC = safeArray(bitacoraParcial?.continua);
      const itemsEC = actsEC.map((a) => ({
        calificacion: getCalifValue(
          alum.inscripcion_id,
          a.actividad_id,
          a.calificacion_alumno
        ),
        peso: a.peso_actividad,
      }));
      const califEC =
        actsEC.length > 0 ? calcularPromedioPonderado(itemsEC) : null;

      const califEX = bitacoraParcial?.examen?.[0]?.calificacion_alumno ?? null;

      let finalParcial = null;
      const tieneAlgo = califBB != null || califEC != null || califEX != null;

      if (tieneAlgo) {
        const bb = califBB ?? 0;
        const ec = califEC ?? 0;
        const ex = califEX ?? 0;

        finalParcial =
          bb * (pesosComponente.blackboard / 100) +
          ec * (pesosComponente.continua / 100) +
          ex * (pesosComponente.examen / 100);
      }

      return {
        blackboard: califBB,
        continua: califEC,
        examen: califEX,
        final: finalParcial,
      };
    },
    [pesosComponente, getCalifValue]
  );

  const calcularFinalSemestral = useCallback(
    (alum) => {
      const p1 = calcularCalificacionesParcial(alum, "Parcial 1");
      const p2 = calcularCalificacionesParcial(alum, "Parcial 2");
      const p3 = calcularCalificacionesParcial(alum, "Parcial 3");

      const parciales = [p1.final, p2.final, p3.final];
      const parcialesValidos = parciales.filter((p) => p != null);

      let promedioParciales = null;
      if (parcialesValidos.length > 0) {
        promedioParciales = parcialesValidos.reduce((a, b) => a + b, 0) / 3;
      }

      const examenFinal = null;

      let finalSemestral = null;
      if (promedioParciales != null) {
        if (examenFinal != null) {
          finalSemestral = promedioParciales * 0.5 + examenFinal * 0.5;
        } else {
          finalSemestral = promedioParciales;
        }
      }

      return {
        parcial1: p1.final,
        parcial2: p2.final,
        parcial3: p3.final,
        promedioParciales,
        examenFinal,
        finalSemestral,
      };
    },
    [calcularCalificacionesParcial]
  );

  // =====================================================
  // ESTRUCTURA DE LA TABLA
  // =====================================================

  const tableStructure = useMemo(() => {
    const estructuraMap = clase?.estructura_bitacora || {};
    const currentStructure = estructuraMap[activeTab];

    if (isFinalTab) {
      return {
        type: "final",
        columns: [
          { key: "parcial1", label: "Parcial 1", sublabel: "Final" },
          { key: "parcial2", label: "Parcial 2", sublabel: "Final" },
          { key: "parcial3", label: "Parcial 3", sublabel: "Final" },
          {
            key: "promedioParciales",
            label: "Promedio",
            sublabel: "Parciales",
          },
          { key: "examenFinal", label: "Examen", sublabel: "Final" },
          { key: "finalSemestral", label: "Final", sublabel: "Semestral" },
        ],
      };
    }

    const componentMap = {
      blackboard: { label: "Blackboard", abbr: "BB" },
      continua: { label: "Evaluación Continua", abbr: "EC" },
      examen: { label: "Examen", abbr: "EX" },
    };

    const groups = [];
    ["blackboard", "continua", "examen"].forEach((compKey) => {
      const compInfo = componentMap[compKey];
      const peso = pesosComponente[compKey] || 0;
      const actividades = safeArray(currentStructure?.[compKey]);

      groups.push({
        component: compKey,
        label: compInfo.label,
        abbr: compInfo.abbr,
        peso,
        actividades,
        hasActivities: actividades.length > 0,
      });
    });

    groups.push({
      component: "finalParcial",
      label: "Final",
      abbr: "FP",
      peso: 100,
      actividades: [],
      hasActivities: false,
      isFinalColumn: true,
    });

    return { type: "parcial", groups };
  }, [clase, activeTab, isFinalTab, pesosComponente]);

  // =====================================================
  // FILAS DE LA TABLA
  // =====================================================

  const rows = useMemo(() => {
    return filteredAlumnos.map((alum) => {
      const row = {
        id: alum.id,
        inscripcion_id: alum.inscripcion_id,
        nombre: alum.nombre ?? "Sin nombre",
        matricula: alum.matricula ?? "—",
        correo: alum.correo ?? "—",
      };

      if (isFinalTab) {
        row.finalData = calcularFinalSemestral(alum);
      } else {
        const parcialKey = activeTab;
        const calcs = calcularCalificacionesParcial(alum, parcialKey);
        const bitacoraParcial = alum.bitacora?.[parcialKey];

        row.parcialCalcs = calcs;
        row.components = {};

        tableStructure.groups?.forEach((group) => {
          if (group.isFinalColumn) {
            row.components.finalParcial = { total: calcs.final };
            return;
          }

          const compKey = group.component;
          const actividadesData = safeArray(bitacoraParcial?.[compKey]);

          row.components[compKey] = {
            actividades: {},
            total: calcs[compKey],
          };

          actividadesData.forEach((item) => {
            row.components[compKey].actividades[item.actividad_id] = {
              valor: getCalifValue(
                alum.inscripcion_id,
                item.actividad_id,
                item.calificacion_alumno
              ),
              original: item.calificacion_alumno,
            };
          });
        });
      }

      return row;
    });
  }, [
    filteredAlumnos,
    activeTab,
    tableStructure,
    isFinalTab,
    calcularCalificacionesParcial,
    calcularFinalSemestral,
    getCalifValue,
  ]);

  // =====================================================
  // HANDLERS
  // =====================================================

  const openImport = (comp) => {
    setImportComponente(comp);
    setImportOpen(true);
  };

  const buildFilas = (payload) => {
    const { parsed, actividades, componente, fuente, manualFilas } = payload;

    // Si viene de modo manual, usar las filas ya construidas
    if (fuente === "manual" && manualFilas) {
      return manualFilas;
    }

    if (fuente === "manual" || !parsed?.alumnos?.length) {
      return [];
    }

    if (componente === "blackboard" && parsed?.fuente === "blackboard") {
      return parsed.alumnos.map((al) => ({
        identificador: al.matricula || al.email || "",
        calificaciones: actividades.map((act) => {
          const val = al.calificaciones?.[act.key];
          return val != null ? val : null;
        }),
      }));
    }

    if (fuente === "teams" && parsed?.fuente === "teams") {
      return parsed.alumnos.map((al) => ({
        identificador: al.matricula || al.email || "",
        calificaciones: [al.calificacion10 ?? null],
      }));
    }

    return [];
  };

  const handleImportConfirm = async (payload) => {
    const body = {
      parcial_id: payload.parcial,
      componente: payload.componente,
      origen: payload.fuente,
      actividades: payload.actividades.map((a) => ({
        nombre: a.nombre,
        peso_en_componente: a.peso,
        referencia_externa: a.key !== a.nombre ? a.key : null,
      })),
      filas: buildFilas(payload),
    };

    console.log("[Import] Payload enviado:", body);

    const res = await api.post(
      `/api/docente/clase/${seccionId}/bitacora/import`,
      body
    );

    if (!res.data?.ok) {
      throw new Error(res.data?.response || "Error al importar bitácora");
    }

    const { actividades_upserted, calificaciones_upserted, alumnos_sin_match } =
      res.data;
    console.log(
      `[Import] Resultado: ${actividades_upserted} actividades, ${calificaciones_upserted} calificaciones`
    );

    if (alumnos_sin_match > 0) {
      console.warn(`[Import] ${alumnos_sin_match} alumnos no encontrados`);
    }

    await fetchData();
  };

  // =====================================================
  // EDICIÓN INLINE
  // =====================================================

  const toggleEditMode = () => {
    if (editMode) {
      // Cancelar edición
      setEditedCalifs({});
    }
    setEditMode(!editMode);
  };

  const handleCalifChange = (inscripcionId, actividadId, value) => {
    const key = `${inscripcionId}-${actividadId}`;
    setEditedCalifs((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const hasChanges = Object.keys(editedCalifs).length > 0;

  const saveChanges = async () => {
    if (!hasChanges) return;

    setSaving(true);
    try {
      // Agrupar cambios por actividad
      const changes = Object.entries(editedCalifs).map(([key, value]) => {
        const [inscripcionId, actividadId] = key.split("-").map(Number);
        return {
          inscripcion_id: inscripcionId,
          actividad_id: actividadId,
          calificacion: value,
        };
      });

      // Enviar al backend
      const res = await api.post(
        `/api/docente/clase/${seccionId}/bitacora/update`,
        {
          calificaciones: changes,
        }
      );

      if (!res.data?.ok) {
        throw new Error(res.data?.response || "Error al guardar cambios");
      }

      console.log(`[Edit] Guardados ${changes.length} cambios`);

      // Recargar datos y salir de modo edición
      await fetchData();
      setEditedCalifs({});
      setEditMode(false);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Error al guardar cambios");
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <Skeleton height={40} width="30%" />
        <Skeleton height={200} />
      </div>
    );
  }

  const getColSpan = (group) => {
    if (group.isFinalColumn) return 1;
    return group.hasActivities ? group.actividades.length + 1 : 1;
  };

  // Componente para celda editable
  const EditableCell = ({ inscripcionId, actividadId, value, original }) => {
    const displayValue = value ?? "";
    const numVal = displayValue !== "" ? Number(displayValue) : null;
    const isReprobado = numVal != null && numVal < 6;
    const isModified =
      editMode &&
      editedCalifs.hasOwnProperty(`${inscripcionId}-${actividadId}`);

    if (editMode) {
      return (
        <input
          type="number"
          min="0"
          max="10"
          step="0.1"
          value={displayValue}
          onChange={(e) =>
            handleCalifChange(inscripcionId, actividadId, e.target.value)
          }
          className={`w-16 px-1 py-0.5 text-center text-sm border rounded focus:outline-none focus:ring-1 focus:ring-brand-red ${
            isModified ? "border-brand-red bg-red-50" : "border-slate-300"
          } ${isReprobado ? "text-red-600" : ""}`}
        />
      );
    }

    return (
      <span
        className={`font-medium ${
          isReprobado ? "text-red-600" : "text-slate-700"
        }`}
      >
        {fmt10(value)}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-[98%] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline_secondary"
            size="sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {clase?.materia?.nombre || "Detalle de Clase"}
            </h1>
            <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
              <span className="font-medium bg-brand-wine/10 text-brand-wine px-2 py-0.5 rounded">
                {clase?.grupo}
              </span>
              <span>•</span>
              <span>{clase?.carrera?.nombre}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" /> {clase?.alumnos_count} Alumnos
              </span>
              <span>•</span>
              <span className="capitalize">{tipoEvaluacion}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {editMode && (
            <>
              <Button
                variant="outline_secondary"
                size="sm"
                onClick={toggleEditMode}
                disabled={saving}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={saveChanges}
                disabled={!hasChanges || saving}
              >
                {saving ? (
                  "Guardando..."
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar ({Object.keys(editedCalifs).length})
                  </>
                )}
              </Button>
            </>
          )}
          <Button variant="outline_primary" size="sm">
            <Download className="h-4 w-4 mr-2" /> Exportar
          </Button>
        </div>
      </div>

      {/* Tabs, buscador y acciones */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setEditMode(false);
                  setEditedCalifs({});
                }}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 whitespace-nowrap
                  ${
                    activeTab === tab
                      ? "border-brand-red text-brand-red bg-red-50"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="w-full sm:w-72">
            <Input
              placeholder="Buscar alumno..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Acciones por parcial */}
        {isParcialTab && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline_secondary"
              size="sm"
              onClick={() => openImport("blackboard")}
              disabled={editMode}
            >
              <Upload className="h-4 w-4 mr-2" />
              Importar Blackboard
            </Button>

            <Button
              variant="outline_secondary"
              size="sm"
              onClick={() => openImport("continua")}
              disabled={editMode}
            >
              <Upload className="h-4 w-4 mr-2" />
              Importar Eval. Continua
            </Button>

            <div className="flex-1" />

            {!editMode && (
              <Button
                variant="outline_primary"
                size="sm"
                onClick={toggleEditMode}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Editar calificaciones
              </Button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Banner de modo edición */}
      {editMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <Pencil className="h-5 w-5 text-amber-600" />
          <div className="flex-1">
            <div className="text-sm font-medium text-amber-800">
              Modo edición activo
            </div>
            <div className="text-xs text-amber-600">
              Haz clic en cualquier calificación para modificarla. Los cambios
              se guardan al presionar "Guardar".
            </div>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              {/* TABLA FINAL SEMESTRAL */}
              {isFinalTab ? (
                <>
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 border-r border-slate-200">
                        Matrícula
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 border-r border-slate-200">
                        Alumno
                      </th>
                      {tableStructure.columns.map((col) => (
                        <th
                          key={col.key}
                          className={`px-3 py-2 text-center text-xs font-semibold border-r border-slate-200 ${
                            col.key === "finalSemestral"
                              ? "bg-brand-wine/10 text-brand-wine"
                              : "text-slate-600"
                          }`}
                        >
                          <div className="flex flex-col items-center">
                            <span>{col.label}</span>
                            <span className="text-[10px] font-normal text-slate-500">
                              {col.sublabel}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <td className="px-3 py-2.5 border-r border-slate-100 font-mono text-xs">
                          {row.matricula}
                        </td>
                        <td className="px-3 py-2.5 border-r border-slate-200">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900">
                              {row.nombre}
                            </span>
                            <span className="text-xs text-slate-500">
                              {row.correo}
                            </span>
                          </div>
                        </td>
                        {tableStructure.columns.map((col) => {
                          const val = row.finalData?.[col.key];
                          return (
                            <td
                              key={col.key}
                              className={`px-3 py-2.5 text-center border-r border-slate-200 ${
                                col.key === "finalSemestral"
                                  ? "bg-brand-wine/5"
                                  : ""
                              }`}
                            >
                              <span
                                className={`font-semibold ${
                                  isReprobado10(val)
                                    ? "text-red-600"
                                    : col.key === "finalSemestral"
                                    ? "text-brand-wine"
                                    : "text-slate-700"
                                }`}
                              >
                                {fmt10(val)}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </>
              ) : (
                /* TABLA PARCIAL 1-3 */
                <>
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th
                        rowSpan={2}
                        className="px-3 py-2 text-left text-xs font-semibold text-slate-600 border-r border-slate-200"
                      >
                        Matrícula
                      </th>
                      <th
                        rowSpan={2}
                        className="px-3 py-2 text-left text-xs font-semibold text-slate-600 border-r border-slate-200"
                      >
                        Alumno
                      </th>

                      {tableStructure.groups?.map((group, idx) => {
                        const colspan = getColSpan(group);
                        return (
                          <th
                            key={group.component}
                            colSpan={colspan}
                            className={`px-3 py-2 text-center text-xs font-bold border-r border-slate-200 ${
                              group.isFinalColumn
                                ? "bg-brand-wine/10 text-brand-wine"
                                : "text-slate-700"
                            } ${
                              idx < tableStructure.groups.length - 1
                                ? "border-r-2"
                                : ""
                            }`}
                          >
                            <div className="flex flex-col items-center">
                              <span>{group.label}</span>
                              {!group.isFinalColumn && (
                                <span className="text-[10px] font-normal text-slate-500">
                                  {group.peso}% del parcial
                                </span>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>

                    <tr className="border-b-2 border-slate-300 bg-slate-100">
                      {tableStructure.groups?.map((group) => {
                        if (group.isFinalColumn) {
                          return (
                            <th
                              key="finalParcial-sub"
                              className="px-2 py-2 text-center text-xs font-medium text-brand-wine border-r border-slate-200 bg-brand-wine/5"
                            >
                              <div className="flex flex-col items-center">
                                <span>Calif.</span>
                                <span className="text-[9px] text-brand-wine/70">
                                  Parcial
                                </span>
                              </div>
                            </th>
                          );
                        }

                        if (!group.hasActivities) {
                          return (
                            <th
                              key={`${group.component}-promedio`}
                              className="px-2 py-2 text-center text-xs font-medium text-slate-600 border-r border-slate-200"
                            >
                              <div className="flex flex-col items-center">
                                <span>Promedio</span>
                                <span className="text-[9px] text-slate-400">
                                  {group.abbr}
                                </span>
                              </div>
                            </th>
                          );
                        }

                        return (
                          <>
                            {group.actividades.map((act) => (
                              <th
                                key={act.actividad_id}
                                className="px-2 py-2 text-center text-xs font-medium text-slate-600 border-r border-slate-200"
                                title={act.nombre_actividad}
                              >
                                <div className="flex flex-col items-center">
                                  <span className="max-w-[100px] truncate">
                                    {act.nombre_actividad}
                                  </span>
                                  <span className="text-[9px] text-slate-400">
                                    {act.peso_actividad?.toFixed(1)}%
                                  </span>
                                </div>
                              </th>
                            ))}
                            <th
                              key={`${group.component}-total`}
                              className="px-2 py-2 text-center text-xs font-semibold text-slate-700 border-r border-slate-200 bg-slate-200/50"
                            >
                              <div className="flex flex-col items-center">
                                <span>Total</span>
                                <span className="text-[9px] text-slate-500">
                                  {group.abbr}
                                </span>
                              </div>
                            </th>
                          </>
                        );
                      })}
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <td className="px-3 py-2.5 border-r border-slate-100 font-mono text-xs">
                          {row.matricula}
                        </td>
                        <td className="px-3 py-2.5 border-r border-slate-200">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900">
                              {row.nombre}
                            </span>
                            <span className="text-xs text-slate-500">
                              {row.correo}
                            </span>
                          </div>
                        </td>

                        {tableStructure.groups?.map((group) => {
                          if (group.isFinalColumn) {
                            const val = row.components?.finalParcial?.total;
                            return (
                              <td
                                key="finalParcial-val"
                                className="px-2 py-2.5 text-center border-r border-slate-200 bg-brand-wine/5"
                              >
                                <span
                                  className={`font-bold ${
                                    isReprobado10(val)
                                      ? "text-red-600"
                                      : "text-brand-wine"
                                  }`}
                                >
                                  {fmt10(val)}
                                </span>
                              </td>
                            );
                          }

                          const compData = row.components?.[group.component];

                          if (!group.hasActivities) {
                            const promedio = compData?.total;
                            return (
                              <td
                                key={`${group.component}-promedio`}
                                className="px-2 py-2.5 text-center border-r border-slate-200"
                              >
                                <span
                                  className={`font-medium ${
                                    isReprobado10(promedio)
                                      ? "text-red-600"
                                      : "text-slate-700"
                                  }`}
                                >
                                  {fmt10(promedio)}
                                </span>
                              </td>
                            );
                          }

                          return (
                            <>
                              {group.actividades.map((act) => {
                                const califData =
                                  compData?.actividades?.[act.actividad_id];
                                const valor = califData?.valor;
                                const original = califData?.original;

                                return (
                                  <td
                                    key={act.actividad_id}
                                    className="px-2 py-2.5 text-center border-r border-slate-200"
                                  >
                                    <EditableCell
                                      inscripcionId={row.inscripcion_id}
                                      actividadId={act.actividad_id}
                                      value={valor}
                                      original={original}
                                    />
                                  </td>
                                );
                              })}
                              <td
                                key={`${group.component}-total-val`}
                                className="px-2 py-2.5 text-center border-r border-slate-200 bg-slate-100/50"
                              >
                                <span
                                  className={`font-semibold ${
                                    isReprobado10(compData?.total)
                                      ? "text-red-600"
                                      : "text-slate-800"
                                  }`}
                                >
                                  {fmt10(compData?.total)}
                                </span>
                              </td>
                            </>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </>
              )}
            </table>
          </div>
        ) : (
          <div className="text-center py-16 text-slate-500">
            <FileSpreadsheet className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            <p>
              {search
                ? "No se encontraron alumnos."
                : "No hay alumnos inscritos."}
            </p>
          </div>
        )}
      </div>

      <div className="text-xs text-slate-500 space-y-1">
        <p>* Calificaciones en base 10. Reprobado: menor a 6.00</p>
        <p>
          * Fórmula ({tipoEvaluacion}): Final Parcial = (BB ×{" "}
          {pesosComponente.blackboard}%) + (EC × {pesosComponente.continua}%) +
          (EX × {pesosComponente.examen}%)
        </p>
        <p>
          * Final Semestral = (Promedio Parciales × 50%) + (Examen Final × 50%)
        </p>
      </div>

      {/* Wizard */}
      <BitacoraImportWizard
        open={importOpen}
        onClose={() => setImportOpen(false)}
        componente={importComponente}
        defaultParcial={parcialId || 1}
        alumnos={alumnos}
        onConfirm={handleImportConfirm}
      />
    </div>
  );
}
