import { Priority } from '../types';

export const computePriority = (score: number): Priority => {
  if (score > 1400) return 1;
  if (score >= 601) return 2;
  if (score >= 200) return 3;
  if (score >= 1) return 4;
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
