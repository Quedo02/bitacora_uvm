// src/pages/NotFound.jsx
import { useNavigate } from "react-router-dom";
import { Home, ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-rose-50 to-red-50 flex items-center justify-center p-6 overflow-hidden relative">
      {/* Efectos de fondo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-brand-red/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-brand-wine/15 blur-3xl" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,0,0,.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,.08) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <div className="relative max-w-lg w-full text-center">
        {/* Número 404 grande con efecto */}
        <div className="relative mb-8">
          <div className="text-[180px] md:text-[220px] font-black leading-none select-none">
            <span className="bg-gradient-to-b from-slate-900/15 to-slate-900/5 bg-clip-text text-transparent">
              404
            </span>
          </div>

          {/* Texto superpuesto */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="text-[180px] md:text-[220px] font-black leading-none bg-gradient-to-r from-brand-red via-rose-100 to-brand-wine bg-clip-text text-transparent animate-pulse"
              style={{ animationDuration: "3s" }}
            >
              404
            </span>
          </div>
        </div>

        {/* Icono y mensaje */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/70 backdrop-blur-sm border border-brand-red/20 mb-6 shadow-sm">
            <Search className="w-8 h-8 text-brand-red/70" />
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
            Página no encontrada
          </h1>

          <p className="text-slate-600 text-base md:text-lg max-w-md mx-auto leading-relaxed">
            Lo sentimos, la página que buscas no existe o ha sido movida a otra
            ubicación.
          </p>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-white/70 backdrop-blur-sm border border-brand-red/20 text-slate-900 font-medium transition-all hover:bg-white hover:border-brand-red/30"
          >
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            Volver atrás
          </button>

          <button
            onClick={() => navigate("/")}
            className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-red to-brand-wine text-white font-medium shadow-lg shadow-brand-red/25 transition-all hover:shadow-xl hover:shadow-brand-red/30 hover:scale-105"
          >
            <Home className="w-5 h-5" />
            Ir al inicio
          </button>
        </div>

        {/* Logo UVM */}
        <div className="mt-12">
          <img
            src="/app/uvm-logo-blanco.png"
            alt="UVM"
            className="h-10 w-auto mx-auto opacity-40"
          />
        </div>
      </div>

      {/* Partículas flotantes decorativas */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-brand-red/35"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animation: `float ${3 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
}
