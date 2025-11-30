import { Priority } from '../types';
import { formatPriority } from '../utils/score';

type Props = {
  priority: Priority;
};

export const PriorityBadge = ({ priority }: Props) => {
  const data = formatPriority(priority);
  return (
    <span className={`pill ${data.className}`} title={`Priorité ${priority}`}>
      {data.label}
    </span>
  );
};
