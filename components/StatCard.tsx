'use client';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  compact?: boolean;
}

const colorClasses = {
  blue: {
    card: 'border-pmmg-khaki-300 bg-gradient-to-br from-white to-pmmg-khaki-50',
    icon: 'bg-pmmg-khaki-100 text-pmmg-khaki-700 border-pmmg-khaki-300',
    accent: 'bg-pmmg-khaki-500',
  },
  green: {
    card: 'border-pmmg-gray-300 bg-gradient-to-br from-white to-pmmg-gray-50',
    icon: 'bg-pmmg-gray-100 text-pmmg-gray-700 border-pmmg-gray-300',
    accent: 'bg-pmmg-gray-500',
  },
  yellow: {
    card: 'border-pmmg-gold-300 bg-gradient-to-br from-white to-pmmg-gold-50',
    icon: 'bg-pmmg-gold-100 text-pmmg-gold-800 border-pmmg-gold-300',
    accent: 'bg-pmmg-gold-400',
  },
  red: {
    card: 'border-pmmg-khaki-400 bg-gradient-to-br from-white to-pmmg-khaki-100',
    icon: 'bg-pmmg-khaki-200 text-pmmg-khaki-800 border-pmmg-khaki-400',
    accent: 'bg-pmmg-khaki-600',
  },
  purple: {
    card: 'border-pmmg-gold-200 bg-gradient-to-br from-white to-pmmg-gold-50/50',
    icon: 'bg-pmmg-gold-50 text-pmmg-gold-700 border-pmmg-gold-200',
    accent: 'bg-pmmg-gold-500',
  },
};

export default function StatCard({ title, value, subtitle, icon, color = 'blue', compact }: StatCardProps) {
  const styles = colorClasses[color];

  return (
    <div className={`relative overflow-hidden rounded-xl border shadow-pmmg ${styles.card} ${compact ? 'p-4' : 'p-5'}`}>
      <div className={`absolute top-0 left-0 right-0 h-1 ${styles.accent}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-pmmg-gray-600 truncate">{title}</p>
          <p className={`font-bold text-pmmg-black mt-1 ${compact ? 'text-xl' : 'text-2xl sm:text-3xl'}`}>{value}</p>
          {subtitle && <p className="text-xs mt-1 text-pmmg-gray-500">{subtitle}</p>}
        </div>
        {icon && (
          <div className={`shrink-0 rounded-xl border p-2.5 ${styles.icon}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
