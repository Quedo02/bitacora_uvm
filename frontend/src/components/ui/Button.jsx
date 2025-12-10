// components/ui/Button.jsx
export default function Button({
  children,
  variant = 'primary',   // primary | secondary | danger | outline_* | outline_white
  size = 'md',           // sm | md | lg
  full = false,
  className = '',
  type = 'button',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-red disabled:opacity-60 disabled:cursor-not-allowed';

  const variants = {
    primary:           'bg-brand-red text-brand-white hover:bg-brand-wine',
    secondary:         'bg-brand-wine text-brand-white hover:bg-brand-black',
    danger:            'bg-red-600 text-white hover:bg-red-700',

    outline_primary:   'border border-brand-red text-brand-red bg-transparent hover:bg-brand-red/10',
    outline_secondary: 'border border-brand-wine text-brand-wine bg-transparent hover:bg-brand-wine/10',
    outline_danger:    'border border-red-600 text-red-600 bg-transparent hover:bg-red-50',
    outline_white:     'border border-brand-white text-brand-white bg-transparent hover:bg-brand-white/10',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5',
    md: 'text-sm px-3.5 py-2',
    lg: 'text-base px-4.5 py-2.5'
  };

  const classes = [
    base,
    variants[variant] ?? variants.primary,
    sizes[size] ?? sizes.md,
    full ? 'w-full' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
