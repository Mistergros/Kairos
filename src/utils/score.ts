import { Priority } from '../types';

export const computePriority = (score: number): Priority => {
  if (score >= 150) return 1;
  if (score >= 80) return 2;
  if (score >= 40) return 3;
  return 4;
};

export const formatPriority = (priority: Priority) => {
  const colors: Record<Priority, string> = {
    1: 'bg-sunset text-white',
    2: 'bg-orange-400 text-white',
    3: 'bg-amber-200 text-slate',
    4: 'bg-lime text-slate-900',
  };
  return { label: `P${priority}`, className: colors[priority] };
};

export const priorityLabel = (priority: Priority) => {
  switch (priority) {
    case 1:
      return 'Critique';
    case 2:
      return 'Haute';
    case 3:
      return 'Modérée';
    default:
      return 'Surveiller';
  }
};
