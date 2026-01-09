// src/pages/examenes/MisExamenesAlumno.jsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import Button from "../components/ui/Button";
import { Calendar, Clock, FileText, RefreshCw } from "lucide-react";

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
  return `${dd}/${mm}/${yyyy} ${hhmm}`;
}

function badgeClass(estado) {
  const e = String(estado || "").toLowerCase();
  if (e === "programado") return "bg-green-100 text-green-700";
  if (e === "activo") return "bg-blue-100 text-blue-700";
  if (e === "cerrado") return "bg-slate-100 text-slate-700";
  return "bg-slate-100 text-slate-700";
}

export default function MisExamenesAlumno({ currentUser }) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [examenes, setExamenes] = useState([]);

  const loadExamenes = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/examenes/mis-examenes");
      setExamenes(safeArray(unwrapResponse(res.data)));
    } catch (e) {
      setError(e?.response?.data?.response || e?.message || "Error al cargar exámenes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExamenes();
  }, []);

  const disponibles = useMemo(() => {
    return safeArray(examenes).filter((e) => {
      const estado = String(e.estado || "").toLowerCase();
      return estado === "programado" || estado === "activo";
    });
  }, [examenes]);

  const completados = useMemo(() => {
    return safeArray(examenes).filter((e) => String(e.estado || "").toLowerCase() === "cerrado");
  }, [examenes]);

  const ExamenCard = ({ ex, esDisponible }) => {
    const tipo = ex.tipo === "parcial" ? `Parcial ${ex.parcial_id || ""}` : "Examen Final";
    const ahora = new Date();
    const inicio = new Date(ex.fecha_inicio);
    const fin = new Date(inicio.getTime() + ex.duracion_min * 60 * 1000);
    
    const yaInicio = ahora >= inicio;
    const yaTermino = ahora > fin;

    const estado = yaTermino ? "Expirado" : yaInicio ? "Disponible ahora" : "Próximamente";

    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-semibold text-slate-900 truncate">{tipo}</h3>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(ex.estado)}`}>
                {String(ex.estado || "–")}
              </span>
            </div>
            <div className="text-sm text-slate-600">Grupo {ex.grupo}</div>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar size={16} className="text-slate-400" />
            {formatMx(ex.fecha_inicio)}
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Clock size={16} className="text-slate-400" />
            Duración: {ex.duracion_min} minutos
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-600">
            <FileText size={16} className="text-slate-400" />
            {ex.num_preguntas} preguntas · {ex.intentos_max} intento{ex.intentos_max !== 1 ? "s" : ""}
          </div>
        </div>

        {esDisponible ? (
          <Button
            variant={yaInicio && !yaTermino ? "primary" : "outline_secondary"}
            onClick={() => navigate(`/alumno/examen/${ex.id}`)}
            disabled={yaTermino}
            className="w-full"
          >
            {yaTermino ? "Expirado" : yaInicio ? "Realizar examen" : "Ver detalles"}
          </Button>
        ) : (
          <Button variant="outline_secondary" onClick={() => navigate(`/alumno/examen/${ex.id}/resultados`)} className="w-full">
            Ver resultados
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mis Exámenes</h1>
          <p className="text-sm text-slate-600 mt-1">Exámenes programados y completados</p>
        </div>

        <Button variant="outline_secondary" onClick={loadExamenes} disabled={loading} className="inline-flex items-center gap-2">
          <RefreshCw size={16} />
          Actualizar
        </Button>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-xl bg-slate-100 animate-pulse"></div>
          ))}
        </div>
      ) : (
        <>
          {/* Exámenes disponibles */}
          {disponibles.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <div className="w-1 h-6 bg-green-500 rounded-full"></div>
                Exámenes disponibles
                <span className="text-sm font-normal text-slate-600">({disponibles.length})</span>
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {disponibles.map((ex) => (
                  <ExamenCard key={ex.id} ex={ex} esDisponible={true} />
                ))}
              </div>
            </section>
          )}

          {/* Exámenes completados */}
          {completados.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <div className="w-1 h-6 bg-slate-400 rounded-full"></div>
                Exámenes completados
                <span className="text-sm font-normal text-slate-600">({completados.length})</span>
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {completados.map((ex) => (
                  <ExamenCard key={ex.id} ex={ex} esDisponible={false} />
                ))}
              </div>
            </section>
          )}

          {/* Estado vacío */}
          {disponibles.length === 0 && completados.length === 0 && (
            <div className="text-center py-16">
              <FileText size={64} className="mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No tienes exámenes</h3>
              <p className="text-sm text-slate-600">Los exámenes programados aparecerán aquí</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}