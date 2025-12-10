// components/ui/Skeleton.jsx
export default function Skeleton({
  height = 16,
  width = '100%',
  radius = 10,
  className = '',
  style
}) {
  return (
    <div
      className={['animate-pulse bg-slate-200', className].filter(Boolean).join(' ')}
      style={{ height, width, borderRadius: radius, ...style }}
    />
  );
}
