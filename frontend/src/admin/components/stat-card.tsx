import type { LucideIcon } from 'lucide-react';

export function StatCard({
  icon: Icon,
  label,
  value,
  tone = 'default',
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: 'default' | 'warning' | 'danger';
}) {
  const toneClasses = {
    default: 'bg-brand-light text-brand',
    warning: 'bg-flash/15 text-flash-dark',
    danger: 'bg-destructive/10 text-destructive',
  }[tone];

  return (
    <div className="rounded-lg border border-border bg-white p-5">
      <span className={`flex h-10 w-10 items-center justify-center rounded-md ${toneClasses}`}>
        <Icon size={18} />
      </span>
      <p className="mt-3 font-mono text-2xl font-bold text-ink">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
