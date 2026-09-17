import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4 gap-3">
      <div className="w-14 h-14 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground">
        <Icon size={28} />
      </div>
      <div className="text-base font-semibold text-foreground">
        {title}
      </div>
      {description && (
        <div className="text-sm text-muted-foreground max-w-[320px]">
          {description}
        </div>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};
