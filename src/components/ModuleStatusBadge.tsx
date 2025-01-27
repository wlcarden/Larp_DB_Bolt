import { ModuleApprovalStatus } from '../lib/types';
import { AlertCircle, CheckCircle2, Clock, Send } from 'lucide-react';
import { clsx } from 'clsx';

interface ModuleStatusBadgeProps {
  status: ModuleApprovalStatus;
  className?: string;
}

const STATUS_CONFIG = {
  in_progress: {
    icon: Clock,
    text: 'In Progress',
    classes: 'bg-blue-100 text-blue-800'
  },
  submitted: {
    icon: Send,
    text: 'Submitted',
    classes: 'bg-yellow-100 text-yellow-800'
  },
  approved: {
    icon: CheckCircle2,
    text: 'Approved',
    classes: 'bg-green-100 text-green-800'
  },
  returned: {
    icon: AlertCircle,
    text: 'Returned',
    classes: 'bg-red-100 text-red-800'
  }
} as const;

export function ModuleStatusBadge({ status, className }: ModuleStatusBadgeProps) {
  const config = STATUS_CONFIG[status || 'in_progress'];
  const Icon = config.icon;

  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medieval font-medium',
      config.classes,
      className
    )}>
      <Icon className="w-3.5 h-3.5 mr-1" />
      {config.text}
    </span>
  );
}