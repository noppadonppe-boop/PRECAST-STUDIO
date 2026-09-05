import { EmptyState, Surface } from '@precast/ui';

export function Placeholder({ title, detail }: { title: string; detail: string }) {
  return <><div className="page-heading"><div><p className="eyebrow">M0 WORKSPACE</p><h1>{title}</h1></div></div><Surface><EmptyState icon="◇" title="Scaffolded for the next milestone" detail={detail} /></Surface></>;
}

