import { Priority } from '../types';
import { formatPriority, priorityLabel } from '../utils/score';
import { Tooltip } from './Tooltip';

type Props = {
  priority: Priority;
};

const THRESHOLDS: Record<Priority, string> = {
  1: "score ≥ 80 — à traiter en urgence",
  2: "score ≥ 50",
  3: "score ≥ 25",
  4: "score < 25 — à surveiller",
};

export const PriorityBadge = ({ priority }: Props) => {
  const data = formatPriority(priority);
  return (
    <Tooltip text={`${priorityLabel(priority)} (${THRESHOLDS[priority]})`}>
      <span className={`pill ${data.className}`}>{data.label}</span>
    </Tooltip>
  );
};
