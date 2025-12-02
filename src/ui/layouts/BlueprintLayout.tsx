import type { PropsWithChildren, ReactNode } from "react";

interface BlueprintLayoutProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function BlueprintLayout({ title, subtitle, actions, children }: BlueprintLayoutProps) {
  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 rounded-2xl bg-white/80 px-6 py-4 shadow-sm ring-1 ring-slate-100 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
            {subtitle ? <p className="text-sm text-slate-600">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex gap-2">{actions}</div> : null}
        </div>
      </header>
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}
