// src/components/examenes/ModalNuevoExamen.jsx
import Modal from "../ui/Modal";
import Button from "../ui/Button";

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

export default function ModalNuevoExamen({
  open,
  onClose,
  clases = [],
  seccionParaCrear = "",
  setSeccionParaCrear = () => {},
  saving = false,
  onCreate = () => {},
}) {
  const handleClose = () => {
    setSeccionParaCrear("");
    onClose?.();
  };

  return (
    <Modal
      open={open}
      title="Crear nuevo examen"
      onClose={handleClose}
      size="md"
      staticBackdrop={false}
      footer={
        <>
          <Button
            variant="outline_secondary"
            onClick={handleClose}
            disabled={saving}
          >
            Cancelar
          </Button>

          <Button
            variant="primary"
            onClick={onCreate}
            disabled={!seccionParaCrear || saving}
          >
            {saving ? "Creando..." : "Crear examen"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Selecciona la clase
          </label>

          <select
            value={seccionParaCrear || ""}
            onChange={(e) => setSeccionParaCrear(e.target.value)}
            className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
            disabled={saving}
          >
            <option value="">Selecciona una clase.</option>
            {safeArray(clases).map((c) => (
              <option key={c?.seccion_id} value={c?.seccion_id}>
                {c?.materia?.nombre || `Materia ${c?.materia_id}`}
                {c?.grupo ? ` - Grupo ${c.grupo}` : ""}
                {c?.periodo ? ` (${c.periodo})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <div className="text-xs text-blue-800">
            Se creará un examen en borrador con valores por defecto. Podrás
            editar todos los detalles después.
          </div>
        </div>
      </div>
    </Modal>
  );
}
