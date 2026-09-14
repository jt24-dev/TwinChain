import {
  Activity,
  Clock3,
  CircleDollarSign,
  ShieldAlert,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
} from 'lucide-react';
import type { KPIs } from '@/lib/data/scenario';
import { useAnimatedKpis } from '@/lib/use-animated-kpis';
import { baseline as demoBaseline, kpiChanges } from '@/lib/simulation/model';
import { facilities } from '@/lib/data/network';
export function KpiCards({
  kpis,
  active,
  baseline = demoBaseline,
  facilityCount = facilities.length,
}: {
  kpis: KPIs;
  active: boolean;
  baseline?: KPIs;
  facilityCount?: number;
}) {
  const displayed = useAnimatedKpis(kpis);
  const changes = kpiChanges(kpis, baseline);
  const cards = [
    {
      name: 'Service level',
      value: Math.round(displayed.serviceLevel),
      unit: '%',
      icon: Activity,
      delta: `${changes.serviceDrop} pp`,
      down: true,
      baseline: `${baseline.serviceLevel}%`,
      note: 'Orders delivered on time',
    },
    {
      name: 'Average lead time',
      value: Math.round(displayed.leadTime),
      unit: 'days',
      icon: Clock3,
      delta: `${changes.additionalLeadDays} days`,
      baseline: `${baseline.leadTime} days`,
      note: 'End-to-end fulfillment',
    },
    {
      name: 'Logistics cost',
      value:
        displayed.logisticsCost < 1000000
          ? `$${(displayed.logisticsCost / 1000).toFixed(1)}`
          : `$${(displayed.logisticsCost / 1000000).toFixed(displayed.logisticsCost === baseline.logisticsCost ? 1 : 2)}`,
      unit: displayed.logisticsCost < 1000000 ? 'K' : 'M',
      icon: CircleDollarSign,
      delta: `${changes.costIncreasePercent.toFixed(1)}%`,
      baseline:
        baseline.logisticsCost < 1000000
          ? `$${(baseline.logisticsCost / 1000).toFixed(1)}K`
          : `$${(baseline.logisticsCost / 1000000).toFixed(1)}M`,
      note: 'Total scenario-period cost',
    },
    {
      name: 'Facilities at risk',
      value: Math.round(displayed.facilitiesAtRisk),
      unit: `/ ${facilityCount}`,
      icon: ShieldAlert,
      delta: `${changes.additionalAtRisk} ${changes.additionalAtRisk === 1 ? 'facility' : 'facilities'}`,
      baseline: String(baseline.facilitiesAtRisk),
      note: 'Downstream exposure',
    },
  ];
  return (
    <section className="kpi-grid" aria-label="Network performance">
      {cards.map((c) => (
        <article className={`kpi-card ${active ? 'changed' : ''}`} key={c.name}>
          <div className="kpi-heading">
            <span>{c.name}</span>
            <c.icon size={18} />
          </div>
          <div className="kpi-value">
            {c.value}
            <span
              className={c.unit === '%' || c.unit === 'M' ? 'attached' : ''}
            >
              {c.unit}
            </span>
          </div>
          <div className="kpi-bottom">
            <span className={`delta ${active ? 'negative' : ''}`}>
              {active ? (
                c.down ? (
                  <ArrowDownRight size={14} />
                ) : (
                  <ArrowUpRight size={14} />
                )
              ) : (
                <Minus size={14} />
              )}{' '}
              {active ? c.delta : 'Baseline'}
            </span>
            <span>{active ? `from ${c.baseline}` : c.note}</span>
          </div>
        </article>
      ))}
    </section>
  );
}
