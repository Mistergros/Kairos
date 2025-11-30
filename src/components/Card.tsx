import { ReactNode } from 'react';

type Props = {
  title?: string;
  subtitle?: string;
  corner?: ReactNode;
  children: ReactNode;
};

export const Card = ({ title, subtitle, corner, children }: Props) => (
  <div className="glass rounded-2xl p-5">
    <div className="flex items-start justify-between gap-3">
      <div>
        {title && <h3 className="text-lg font-semibold text-slate">{title}</h3>}
        {subtitle && <p className="text-sm text-slate/70">{subtitle}</p>}
      </div>
      {corner}
    </div>
    <div className="mt-4">{children}</div>
  </div>
);
