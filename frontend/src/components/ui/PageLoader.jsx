// src/components/ui/PageLoader.jsx
import { useState, useEffect } from "react";

export default function PageLoader({ message = "Cargando" }) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Patrón de fondo sutil */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23E30613' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative flex flex-col items-center">
        {/* Logo UVM con efecto de brillo */}
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-full bg-brand-red/20 blur-xl animate-pulse" />
          <img
            src="/app/uvm-logo.svg"
            alt="UVM"
            className="relative h-20 w-auto object-contain drop-shadow-lg"
          />
        </div>

        {/* Spinner principal */}
        <div className="relative w-16 h-16 mb-6">
          {/* Círculo exterior */}
          <div className="absolute inset-0 rounded-full border-4 border-slate-200" />

          {/* Círculo animado primario */}
          <div
            className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-red animate-spin"
            style={{ animationDuration: "1s" }}
          />

          {/* Círculo animado secundario (más lento, opuesto) */}
          <div
            className="absolute inset-1 rounded-full border-4 border-transparent border-b-brand-wine animate-spin"
            style={{ animationDuration: "1.5s", animationDirection: "reverse" }}
          />

          {/* Punto central pulsante */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-brand-red to-brand-wine animate-pulse" />
          </div>
        </div>

        {/* Texto de carga */}
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-slate-600 tracking-wide">
            {message}
          </span>
          <span className="text-sm font-medium text-brand-red w-6">{dots}</span>
        </div>

        {/* Barra de progreso animada */}
        <div className="mt-4 w-48 h-1 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-brand-red to-brand-wine rounded-full animate-loading-bar" />
        </div>
      </div>

      {/* Estilos de animación personalizados */}
      <style>{`
        @keyframes loading-bar {
          0% {
            width: 0%;
            margin-left: 0%;
          }
          50% {
            width: 70%;
            margin-left: 15%;
          }
          100% {
            width: 0%;
            margin-left: 100%;
          }
        }
        .animate-loading-bar {
          animation: loading-bar 1.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
