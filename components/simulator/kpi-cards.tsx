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
export function KpiCards({ kpis, active }: { kpis: KPIs; active: boolean }) {
  const cards = [
    {
      name: 'Service level',
      value: kpis.serviceLevel,
      unit: '%',
      icon: Activity,
      delta: '13 pp',
      down: true,
      baseline: '97%',
      note: 'Orders delivered on time',
    },
    {
      name: 'Average lead time',
      value: kpis.leadTime,
      unit: 'days',
      icon: Clock3,
      delta: '7 days',
      baseline: '12 days',
      note: 'End-to-end fulfillment',
    },
    {
      name: 'Logistics cost',
      value: `$${(kpis.logisticsCost / 1000000).toFixed(active ? 2 : 1)}`,
      unit: 'M',
      icon: CircleDollarSign,
      delta: '23.3%',
      baseline: '$1.2M',
      note: 'Total scenario-period cost',
    },
    {
      name: 'Facilities at risk',
      value: kpis.facilitiesAtRisk,
      unit: '/ 14',
      icon: ShieldAlert,
      delta: '4 facilities',
      baseline: '0',
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
