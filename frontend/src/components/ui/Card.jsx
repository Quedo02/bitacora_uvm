// components/ui/Card.jsx
export default function Card({
  children,
  className = '',
  hover = false,
  onClick,
  ...props
}) {
  const baseClasses = 'rounded-xl border border-slate-200 bg-white shadow-sm';
  const hoverClasses = hover
    ? 'transition-all duration-200 hover:border-brand-red/40 hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
    : '';
  
  const Component = onClick ? 'button' : 'div';
  const interactiveProps = onClick ? { type: 'button', onClick } : {};

  return (
    <Component
      className={[baseClasses, hoverClasses, className].filter(Boolean).join(' ')}
      {...interactiveProps}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={['border-b border-slate-100 px-4 py-3', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = '' }) {
  return (
    <div className={['px-4 py-3', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={['border-t border-slate-100 px-4 py-3', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}

// Card específica para materias con grupos
export function MateriaCard({
  materia,
  grupos = [],
  onGroupClick,
  className = ''
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {(materia?.codigo_materia || materia?.codigo) && (
                <span className="inline-flex rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-mono text-white">
                  {materia.codigo_materia || materia.codigo}
                </span>
              )}
              <h3 className="text-sm font-semibold text-slate-900">
                {materia?.nombre_materia ?? materia?.nombre ?? 'Materia'}
              </h3>
            </div>
            {materia?.tipo_evaluacion && (
              <p className="text-xs text-slate-500 mt-1 capitalize">
                {materia.tipo_evaluacion}
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardBody className="p-0">
        {grupos.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-slate-500">
            No hay grupos registrados
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {grupos.map((grupo, idx) => (
              <button
                key={grupo.id || idx}
                type="button"
                onClick={() => onGroupClick?.(grupo)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left group"
              >
                {grupo.content || (
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="inline-flex items-center justify-center rounded-full bg-brand-red/10 px-2.5 py-1 text-xs font-bold text-brand-red min-w-[60px]">
                      {grupo.grupo || grupo.label || '—'}
                    </span>
                    {grupo.description && (
                      <span className="text-xs text-slate-600 truncate">
                        {grupo.description}
                      </span>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}