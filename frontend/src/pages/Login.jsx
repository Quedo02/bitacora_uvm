import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';

export default function Login({ onLogin }) {
  const nav = useNavigate();
  const loc = useLocation();
  const from = loc.state?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [shaking, setShaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msEnabled, setMsEnabled] = useState(false);

  useEffect(() => {
    api
      .get('/api/config')
      .then((r) => setMsEnabled(!!r.data.microsoftEnabled))
      .catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      await onLogin(email, pass);
      nav(from, { replace: true });
    } catch {
      setErrorMsg('Credenciales inválidas. Intenta de nuevo.');
      setShaking(true);
      setTimeout(() => setShaking(false), 600);
      setTimeout(() => setErrorMsg(''), 3500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-black via-brand-red/10 to-brand-white px-4">
      <div
        className={[
          'w-full max-w-md rounded-2xl bg-white px-6 py-6 shadow-2xl',
          'border border-slate-200',
          shaking ? 'shake' : '',
        ]
          .filter(Boolean)
          .join(' ')}
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

        {/* Error */}
        {errorMsg && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <span className="mt-[2px] text-sm">⚠️</span>
            <div>{errorMsg}</div>
          </div>
        )}

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
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>

            {/* Botón Microsoft */}
            <Button
              type="button"
              full
              variant="outline_primary"
              disabled={!msEnabled || loading}
              onClick={() => {
                if (!msEnabled) return;
                window.location.href = '/api/auth/microsoft';
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
    </div>
  );
}
