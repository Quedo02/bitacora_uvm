// src/components/ui/Skeleton.jsx

// Skeleton básico
export default function Skeleton({
  height = 16,
  width = "100%",
  radius = 10,
  className = "",
  variant = "default",
  style,
}) {
  const baseClass = "animate-pulse";

  const variantClasses = {
    default: "bg-slate-200",
    dark: "bg-slate-300",
    light: "bg-slate-100",
    shimmer:
      "bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-shimmer",
  };

  return (
    <div
      className={[
        baseClass,
        variantClasses[variant] || variantClasses.default,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ height, width, borderRadius: radius, ...style }}
    />
  );
}

// Skeleton para texto con múltiples líneas
export function SkeletonText({
  lines = 3,
  lastLineWidth = "70%",
  className = "",
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {[...Array(lines)].map((_, i) => (
        <Skeleton
          key={i}
          height={14}
          width={i === lines - 1 ? lastLineWidth : "100%"}
          radius={4}
        />
      ))}
    </div>
  );
}

// Skeleton para avatar circular
export function SkeletonAvatar({ size = 40, className = "" }) {
  return (
    <Skeleton height={size} width={size} radius="50%" className={className} />
  );
}

// Skeleton para tarjetas
export function SkeletonCard({ className = "" }) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-4 ${className}`}
    >
      <div className="flex items-center gap-3 mb-4">
        <SkeletonAvatar size={40} />
        <div className="flex-1">
          <Skeleton height={14} width="60%" className="mb-2" />
          <Skeleton height={12} width="40%" />
        </div>
      </div>
      <SkeletonText lines={2} />
      <div className="mt-4 flex gap-2">
        <Skeleton height={32} width={80} radius={8} />
        <Skeleton height={32} width={80} radius={8} />
      </div>
    </div>
  );
}

// Skeleton para tablas
export function SkeletonTable({ rows = 5, columns = 4, className = "" }) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
        <div className="flex gap-4">
          {[...Array(columns)].map((_, i) => (
            <Skeleton
              key={i}
              height={14}
              width={`${100 / columns}%`}
              radius={4}
            />
          ))}
        </div>
      </div>
      {/* Rows */}
      <div className="divide-y divide-slate-100">
        {[...Array(rows)].map((_, rowIndex) => (
          <div key={rowIndex} className="px-4 py-3">
            <div className="flex gap-4">
              {[...Array(columns)].map((_, colIndex) => (
                <Skeleton
                  key={colIndex}
                  height={14}
                  width={`${100 / columns}%`}
                  radius={4}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Skeleton para formularios
export function SkeletonForm({ fields = 4, className = "" }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {[...Array(fields)].map((_, i) => (
        <div key={i}>
          <Skeleton height={12} width={100} className="mb-2" radius={4} />
          <Skeleton height={40} width="100%" radius={8} />
        </div>
      ))}
      <Skeleton height={44} width={120} radius={8} className="mt-6" />
    </div>
  );
}

// Skeleton para estadísticas/dashboard
export function SkeletonStats({ count = 4, className = "" }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          <Skeleton height={12} width="60%" className="mb-2" radius={4} />
          <Skeleton height={32} width="40%" radius={4} />
        </div>
      ))}
    </div>
  );
}

// Componente de página completa con loading
export function SkeletonPage({ variant = "dashboard" }) {
  if (variant === "table") {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <Skeleton height={32} width={200} radius={8} />
          <Skeleton height={40} width={120} radius={8} />
        </div>
        <SkeletonTable rows={8} columns={5} />
      </div>
    );
  }

  if (variant === "form") {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Skeleton height={32} width={250} className="mb-6" radius={8} />
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <SkeletonForm fields={5} />
        </div>
      </div>
    );
  }

  // Default: dashboard
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Skeleton height={32} width={200} radius={8} />
        <div className="flex gap-2">
          <Skeleton height={40} width={100} radius={8} />
          <Skeleton height={40} width={100} radius={8} />
        </div>
      </div>
      <SkeletonStats count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonTable rows={5} columns={4} />
    </div>
  );
}
