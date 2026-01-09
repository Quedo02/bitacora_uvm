// src/pages/Unauthorized.jsx
import { useNavigate } from "react-router-dom";
import { ShieldX, Home, ArrowLeft, Lock } from "lucide-react";
import Button from "../components/ui/Button";

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Efectos de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-64 h-64 rounded-full bg-red-100/50 blur-3xl" />
        <div className="absolute bottom-20 left-20 w-80 h-80 rounded-full bg-amber-100/50 blur-3xl" />
      </div>

      <div className="relative max-w-md w-full text-center">
        {/* Icono principal */}
        <div className="mb-8">
          <div className="relative inline-flex items-center justify-center">
            {/* Círculos decorativos */}
            <div className="absolute w-32 h-32 rounded-full bg-red-100 animate-pulse" />
            <div className="absolute w-24 h-24 rounded-full bg-red-50" />

            {/* Icono */}
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30">
              <ShieldX className="w-10 h-10 text-white" />
            </div>
          </div>
        </div>

        {/* Mensaje */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
            Acceso no autorizado
          </h1>
          <p className="text-slate-600 text-base leading-relaxed max-w-sm mx-auto">
            No tienes permisos para acceder a esta sección. Si crees que esto es
            un error, contacta al administrador.
          </p>
        </div>

        {/* Información adicional */}
        <div className="mb-8 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <div className="flex items-center justify-center gap-2 text-amber-700 text-sm">
            <Lock className="w-4 h-4" />
            <span>Esta área requiere permisos especiales</span>
          </div>
        </div>

        {/* Botones */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="outline_secondary"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver atrás
          </Button>

          <Button
            variant="primary"
            onClick={() => navigate("/")}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Ir al inicio
          </Button>
        </div>

        {/* Footer */}
        <div className="mt-12">
          <img
            src="/app/uvm-logo.svg"
            alt="UVM"
            className="h-8 w-auto mx-auto opacity-30"
          />
        </div>
      </div>
    </div>
  );
}
