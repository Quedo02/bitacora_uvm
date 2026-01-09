// src/pages/Login.jsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api/axios";
import Button from "../components/ui/Button.jsx";
import Input from "../components/ui/Input.jsx";

export default function Login({ onLogin }) {
  const nav = useNavigate();
  const loc = useLocation();
  const from = loc.state?.from?.pathname || "/";

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [shaking, setShaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msEnabled, setMsEnabled] = useState(false);

  useEffect(() => {
    api
      .get("/api/config")
      .then((r) => setMsEnabled(!!r.data.microsoftEnabled))
      .catch(() => {});
  }, []);

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 650);
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      await onLogin(email, pass);
      nav(from, { replace: true });
    } catch {
      setErrorMsg("Credenciales inválidas. Intenta de nuevo.");
      triggerShake();
      setTimeout(() => setErrorMsg(""), 4000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-black via-brand-red/10 to-brand-white px-4 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-brand-red/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-brand-wine/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23E30613' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div
        className={`
          relative w-full max-w-md rounded-2xl bg-white px-6 py-6 shadow-2xl
          border border-slate-200 transform transition-transform
          ${shaking ? "animate-shake" : ""}
        `}
      >
        {/* Logo + título */}
        <div className="mb-4 text-center">
          <img
            src="/app/uvm-logo.svg"
            alt="Logo de la Universidad del Valle de México"
            className="mx-auto mb-2 h-20 w-auto object-contain"
          />
          <div className="text-base font-semibold tracking-wide text-brand-red">
            Universidad del Valle de México
          </div>
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            Banco de preguntas universitario
          </div>
        </div>

        {/* Error con animación de entrada */}
        <div
          className={`
            overflow-hidden transition-all duration-300 ease-out
            ${errorMsg ? "max-h-20 opacity-100 mb-3" : "max-h-0 opacity-0 mb-0"}
          `}
        >
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <span className="mt-[2px] text-sm">⚠️</span>
            <div>{errorMsg}</div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">
              Email institucional
            </label>
            <Input
              type="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full"
              placeholder="nombre.apellido@uvmnet.edu"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">
              Contraseña
            </label>
            <Input
              type="password"
              required
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="w-full"
              placeholder="********"
            />
          </div>

          <div className="mt-2 space-y-2">
            {/* Botón principal */}
            <Button type="submit" full disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Entrando…
                </span>
              ) : (
                "Entrar"
              )}
            </Button>

            {/* Botón Microsoft */}
            <Button
              type="button"
              full
              variant="outline_primary"
              disabled={!msEnabled || loading}
              onClick={() => {
                if (!msEnabled) return;
                window.location.href = "/api/auth/microsoft";
              }}
              className="flex items-center justify-center gap-2 text-sm"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-[3px] bg-brand-red text-[10px] font-bold text-brand-white">
                MS
              </span>
              <span>Entrar con Microsoft</span>
            </Button>
          </div>
        </form>
      </div>

      {/* Estilos de animación shake */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
          20%, 40%, 60%, 80% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.6s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }
      `}</style>
    </div>
  );
}
