import Link from 'next/link';
import { cn } from '@/lib/utils';

interface PaywallBadgeProps {
  className?: string;
  size?: 'xs' | 'sm';
}

/** Tiny inline "PRO" pill. Links to /pricing. */
export function PaywallBadge({ className, size = 'xs' }: PaywallBadgeProps): JSX.Element {
  return (
    <Link
      href="/pricing"
      className={cn(
        'inline-flex items-center font-mono font-bold uppercase tracking-wider rounded-[3px] no-underline transition-all duration-100',
        'bg-gradient-to-r from-amber to-green text-black hover:brightness-110',
        size === 'xs' ? 'text-[8px] px-1.5 py-[2px]' : 'text-[10px] px-2 py-0.5',
        className,
      )}
    >
      PRO
    </Link>
  );
}
