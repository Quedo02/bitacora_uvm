import { useRef, useState } from "react";
import api from "../../api/axios";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import { Upload, Trash2 } from "lucide-react";

export function ModalImportarSemestre({
  open,
  onClose,
  defaultPeriodo = "",
  onSuccess = () => {},
}) {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [codigoPeriodo, setCodigoPeriodo] = useState(defaultPeriodo);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const addFiles = (list) => {
    const incoming = Array.from(list || []);
    const onlyExcel = incoming.filter((f) =>
      /\.(xlsx|xls)$/i.test(f.name)
    );
    setFiles((prev) => {
      const map = new Map(prev.map((f) => [f.name + f.size, f]));
      onlyExcel.forEach((f) => map.set(f.name + f.size, f));
      return Array.from(map.values());
    });
  };

  const removeFile = (key) => {
    setFiles((prev) => prev.filter((f) => (f.name + f.size) !== key));
  };

  const handleImport = async () => {
    setErr("");
    const code = (codigoPeriodo || "").trim();
    if (!code) return setErr("Falta el código de periodo (ej. 2025-C1).");
    if (!fechaInicio || !fechaFin) return setErr("Faltan fechas de inicio/fin del periodo.");
    if (files.length === 0) return setErr("Adjunta al menos 1 archivo Excel.");

    const fd = new FormData();
    fd.append("codigo_periodo", code);
    fd.append("fecha_inicio", fechaInicio);
    fd.append("fecha_fin", fechaFin);
    files.forEach((f) => fd.append("files[]", f));

    setLoading(true);
    try {
      const { data } = await api.post("/api/coordinacion/import/semestre", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (!data?.ok) throw new Error(data?.message || "No se pudo importar.");
      onSuccess(data);
      onClose();
      setFiles([]);
    } catch (e) {
      setErr(e?.response?.data?.response || e?.message || "Error importando.");
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose} disabled={loading}>
        Cancelar
      </Button>
      <Button onClick={handleImport} disabled={loading}>
        {loading ? "Importando..." : "Importar"}
      </Button>
    </>
  );

  return (
    <Modal open={open} onClose={onClose} title="Importar datos desde Excel" size="lg" footer={footer}>
      <div className="space-y-4">
        {err && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {err}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-1">
            <label className="text-xs font-semibold text-slate-600">Código de periodo</label>
            <input
              value={codigoPeriodo}
              onChange={(e) => setCodigoPeriodo(e.target.value)}
              placeholder="2025-C1"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-1">
            <label className="text-xs font-semibold text-slate-600">Fecha inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-1">
            <label className="text-xs font-semibold text-slate-600">Fecha fin</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div
          className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-center"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            addFiles(e.dataTransfer.files);
          }}
        >
          <Upload className="mx-auto h-7 w-7 text-slate-400" />
          <p className="mt-2 text-sm text-slate-700">
            Arrastra tus Excel aquí o{" "}
            <button
              type="button"
              className="font-semibold text-brand-red hover:underline"
              onClick={() => inputRef.current?.click()}
            >
              selecciona archivos
            </button>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Puedes subir 1 archivo con hojas (Carreras, Materias, Alumnos, Secciones, Componentes, Inscripciones, Temas)
            o varios archivos separados.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>

        {files.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-2 text-xs font-semibold text-slate-600">
              Archivos seleccionados ({files.length})
            </div>
            <ul className="divide-y divide-slate-100">
              {files.map((f) => {
                const key = f.name + f.size;
                return (
                  <li key={key} className="flex items-center justify-between gap-3 px-4 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm text-slate-900">{f.name}</div>
                      <div className="text-xs text-slate-500">{Math.round(f.size / 1024)} KB</div>
                    </div>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                      onClick={() => removeFile(key)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Quitar
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <div className="font-semibold text-slate-700">Instrucciones rápidas</div>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>Alumnos: password se genera con la fecha de nacimiento en formato ddmmaaaa (hasheado en backend).</li>
            <li>Componentes: tipo debe ser continua | blackboard | examen.</li>
            <li>Inscripciones: “mixta” se guarda como modalidad de la sección; en inscripcion.metodo solo va presencial o linea.</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}
