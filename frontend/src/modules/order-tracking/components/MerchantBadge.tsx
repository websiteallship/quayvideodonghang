import React from 'react';
import { Store } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getMerchantBadgeColor } from '../constants';

interface MerchantBadgeProps {
  name?: string | null;
  className?: string;
}

export const MerchantBadge: React.FC<MerchantBadgeProps> = ({ name, className }) => {
  if (!name) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border shadow-none',
        getMerchantBadgeColor(name),
        className
      )}
    >
      <Store size={10} className="shrink-0 opacity-80" />
      <span className="truncate max-w-[120px]">{name}</span>
    </Badge>
  );
};
