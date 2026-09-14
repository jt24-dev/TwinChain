import { shanghaiComparison } from '@/lib/data/scenario';
import type { StrategyId } from '@/lib/simulation/mitigation';
import type { KPIs } from '@/lib/simulation/model';
const metrics: {
  key: keyof KPIs;
  label: string;
  format: (value: number) => string;
}[] = [
  { key: 'serviceLevel', label: 'Service level', format: (v) => `${v}%` },
  { key: 'leadTime', label: 'Average lead time', format: (v) => `${v} days` },
  {
    key: 'logisticsCost',
    label: 'Logistics cost',
    format: (v) => `$${v.toLocaleString('en-US')}`,
  },
  { key: 'facilitiesAtRisk', label: 'Facilities at risk', format: String },
];
export function StrategyComparison({ selected }: { selected: StrategyId }) {
  return (
    <details className="strategy-comparison">
      <summary>
        Compare all three responses <span>Service, delay, cost & risk</span>
      </summary>
      <div className="comparison-scroll">
        <table>
          <caption>
            Same 14-day Shanghai closure. Highlighted values lead each metric;
            there is no universal best response.
          </caption>
          <thead>
            <tr>
              <th scope="col">Response</th>
              {metrics.map((m) => (
                <th scope="col" key={m.key}>
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shanghaiComparison.results.map(({ strategy, result }) => (
              <tr
                key={strategy.id}
                className={
                  strategy.id === selected ? 'comparison-selected' : ''
                }
              >
                <th scope="row">
                  {strategy.name}
                  {strategy.id === selected && <small>Selected</small>}
                </th>
                {metrics.map((m) => (
                  <td
                    key={m.key}
                    className={
                      result.kpis[m.key] === shanghaiComparison.best[m.key]
                        ? 'metric-best'
                        : ''
                    }
                  >
                    {m.format(result.kpis[m.key])}
                    {result.kpis[m.key] === shanghaiComparison.best[m.key] && (
                      <span className="metric-label">
                        {m.key === 'serviceLevel' ? 'Highest' : 'Lowest'}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
