import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: 'active' | 'expiring_soon' | 'expired' | 'not_certified' | 'pending' | 'validated';
  className?: string;
}

const statusConfig = {
  active: {
    label: 'Certified',
    className: 'bg-success/10 text-success border-success/20',
  },
  expiring_soon: {
    label: 'Expiring Soon',
    className: 'bg-warning/10 text-warning border-warning/20',
  },
  expired: {
    label: 'Expired',
    className: 'bg-danger/10 text-danger border-danger/20',
  },
  not_certified: {
    label: 'Not Certified',
    className: 'bg-muted text-muted-foreground border-muted',
  },
  pending: {
    label: 'Pending',
    className: 'bg-warning/10 text-warning border-warning/20',
  },
  validated: {
    label: 'Validated',
    className: 'bg-success/10 text-success border-success/20',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border",
        config.className,
        className
      )}
      data-testid={`status-badge-${status}`}
    >
      {config.label}
    </span>
  );
}
