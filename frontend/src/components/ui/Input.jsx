// src/components/ui/Input.jsx
import { useState, useEffect } from 'react';

export default function Input({ 
  label, 
  className = '', 
  type = 'text',
  value,
  onChange,
  onBlur,
  ...props 
}) {
  // Estado local para manejar el valor mientras el usuario escribe
  const [localValue, setLocalValue] = useState(value ?? '');

  // Sincronizar cuando el valor externo cambia
  useEffect(() => {
    setLocalValue(value ?? '');
  }, [value]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    // Para números, solo llamar onChange si es un número válido o vacío
    if (type === 'number') {
      // Permitir campo vacío o números válidos
      if (newValue === '' || !isNaN(Number(newValue))) {
        onChange?.(e);
      }
    } else {
      onChange?.(e);
    }
  };

  const handleBlur = (e) => {
    // Al perder el foco, asegurar que el valor sea válido
    if (type === 'number' && localValue !== '') {
      const num = Number(localValue);
      if (isNaN(num)) {
        // Si no es un número válido, restaurar el valor previo
        setLocalValue(value ?? '');
      }
    }
    onBlur?.(e);
  };

  return (
    <label className="flex flex-col gap-1 text-sm">
      {label && (
        <span className="text-xs font-medium text-slate-600">
          {label}
        </span>
      )}
      <input
        type={type}
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className={[
          'w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 shadow-sm',
          'placeholder:text-slate-400',
          'focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red',
          'disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed',
          'transition-colors',
          className
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
    </label>
  );
}