// src/pages/examenes/ExamenResultados.jsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import Button from "../components/ui/Button";
import Table from "../components/ui/Table";
import { ArrowLeft, Eye, BarChart3, Download } from "lucide-react";

function unwrapResponse(data) {
  if (!data) return null;
  if (typeof data === "object" && data !== null && "response" in data) return data.response;
  return data;
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function formatMx(mysqlDt) {
  if (!mysqlDt) return "-";
  const [d, t] = String(mysqlDt).split(" ");
  if (!d) return String(mysqlDt);
  const [yyyy, mm, dd] = d.split("-");
  const hhmm = (t || "").slice(0, 5);
  return `${dd}/${mm}/${yyyy}${hhmm ? " " + hhmm : ""}`;
}

function badgeClass(estado) {
  const e = String(estado || "").toLowerCase();
  if (e === "enviado") return "bg-blue-100 text-blue-700";
  if (e === "revisado") return "bg-green-100 text-green-700";
  if (e === "en_progreso") return "bg-amber-100 text-amber-800";
  if (e === "anulado") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-700";
}

export default function ExamenResultados({ currentUser }) {
  const { seccionId, examenId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [examen, setExamen] = useState(null);
  const [intentos, setIntentos] = useState([]);

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
        const [exRes, intRes] = await Promise.all([
          api.get(`/api/examenes/examen/${examenId}`),
          api.get(`/api/examenes/examen/${examenId}/intentos`),
        ]);

        setExamen(unwrapResponse(exRes.data)?.examen);
        setIntentos(safeArray(unwrapResponse(intRes.data)));
      } catch (e) {
        setError(e?.response?.data?.response || e?.message || "Error al cargar resultados");
      } finally {
        setLoading(false);
      }
    })();
  }, [examenId]);

  const estadisticas = useMemo(() => {
    if (!intentos.length) return null;

    const calificaciones = intentos
      .map((i) => Number(i.calif_final ?? i.calif_auto ?? 0))
      .filter((c) => c > 0);

    if (!calificaciones.length) return null;

    const promedio = calificaciones.reduce((a, b) => a + b, 0) / calificaciones.length;
    const max = Math.max(...calificaciones);
    const min = Math.min(...calificaciones);

    return {
      total: intentos.length,
      completados: intentos.filter((i) => i.estado === "revisado" || i.estado === "enviado").length,
      promedio: promedio.toFixed(2),
      max: max.toFixed(2),
      min: min.toFixed(2),
    };
  }, [intentos]);

  const columns = useMemo(() => {
    return [
      { header: "ID", accessor: "id", width: "80px" },
      { header: "Inscripción", accessor: "inscripcion_id", width: "110px" },
      { header: "Intento", accessor: "intento_num", width: "90px" },
      {
        header: "Estado",
        accessor: "estado",
        width: "120px",
        cell: (r) => (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(r?.estado)}`}>
            {String(r?.estado || "–")}
          </span>
        ),
      },
      { header: "Calif. auto", accessor: "calif_auto", width: "110px", cell: (r) => Number(r?.calif_auto ?? 0).toFixed(2) },
      { header: "Calif. final", accessor: "calif_final", width: "110px", cell: (r) => Number(r?.calif_final ?? 0).toFixed(2) },
      { header: "Enviado", accessor: "fin_real", cell: (r) => formatMx(r?.fin_real) },
      {
        header: "",
        key: "__actions",
        sortable: false,
        width: "140px",
        cell: (r) => (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => navigate(`/docente/examenes/${seccionId}/intento/${r.id}`)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              <Eye size={14} />
              Ver
            </button>
          </div>
        ),
      },
    ];
  }, [seccionId, navigate]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !examen) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error || "No se pudo cargar el examen"}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline_secondary"
            onClick={() => navigate(`/docente/examenes/${seccionId}`)}
            className="inline-flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Volver
          </Button>

          <div>
            <h1 className="text-xl font-semibold text-slate-900">Resultados del Examen #{examen.id}</h1>
            <div className="text-sm text-slate-600 mt-0.5">
              {examen.tipo === "parcial" ? `Parcial ${examen.parcial_id || ""}` : "Final"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline_secondary" className="inline-flex items-center gap-2">
            <Download size={16} />
            Exportar
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      {estadisticas && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5 mb-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-600 mb-1">Total intentos</div>
            <div className="text-2xl font-bold text-slate-900">{estadisticas.total}</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-600 mb-1">Completados</div>
            <div className="text-2xl font-bold text-green-600">{estadisticas.completados}</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-600 mb-1">Promedio</div>
            <div className="text-2xl font-bold text-blue-600">{estadisticas.promedio}</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-600 mb-1">Máxima</div>
            <div className="text-2xl font-bold text-emerald-600">{estadisticas.max}</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-600 mb-1">Mínima</div>
            <div className="text-2xl font-bold text-amber-600">{estadisticas.min}</div>
          </div>
        </div>
      )}

      {/* Tabla de intentos */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">Intentos de alumnos</h2>
          <div className="text-sm text-slate-600">{intentos.length} registro{intentos.length !== 1 ? "s" : ""}</div>
        </div>

        {intentos.length === 0 ? (
          <div className="py-12 text-center text-slate-600">
            <BarChart3 size={48} className="mx-auto mb-3 text-slate-400" />
            <div className="text-base font-medium mb-1">Sin intentos aún</div>
            <div className="text-sm">Los intentos de los alumnos aparecerán aquí</div>
          </div>
        ) : (
          <Table columns={columns} rows={intentos} defaultSort={{ accessor: "created_at", direction: "desc" }} actions={{ show: false }} />
        )}
      </div>
    </div>
  );
}