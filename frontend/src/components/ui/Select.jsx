// components/ui/Select.jsx
export default function Select({ label, className = '', children, ...props }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label && (
        <span className="text-xs font-medium text-slate-600">
          {label}
        </span>
      )}
      <select
        className={[
          'w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 shadow-sm',
          'focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red',
          className
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
