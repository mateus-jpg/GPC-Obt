import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import clsx from 'clsx';

export const Status = ({
  className,
  status,
  ...props
}) => (
  <Badge
    className={cn('flex items-center gap-2', 'group', status, className)}
    variant="secondary"
    {...props} />
);

export const StatusIndicator = ({
  className,
  ...props
}) => (
  <span className={clsx("relative flex  ", className)} {...props}>
    <span
      className={cn(
        'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
        'group-[.online]:bg-emerald-500',
        'group-[.offline]:bg-red-500',
        'group-[.maintenance]:bg-blue-500',
        'group-[.degraded]:bg-amber-500', 
        className
      )} />
    <span
      className={cn(
        'relative inline-flex h-2 w-2 rounded-full',
        'group-[.online]:bg-emerald-500',
        'group-[.offline]:bg-red-500',
        'group-[.maintenance]:bg-blue-500',
        'group-[.degraded]:bg-amber-500',
        className
      )} />
  </span>
);

export const StatusLabel = ({
  className,
  children,
  ...props
}) => (
  <span className={cn('text-muted-foreground', className)} {...props}>
    {children ?? (
      <>
        <span className="hidden group-[.online]:block">Online</span>
        <span className="hidden group-[.offline]:block">Offline</span>
        <span className="hidden group-[.maintenance]:block">Maintenance</span>
        <span className="hidden group-[.degraded]:block">Degraded</span>
      </>
    )}
  </span>
);
