import { getNetworkState, shanghaiClosure } from '@/lib/data/scenario';
import { facilityPoint } from '@/lib/map-projection';
import { Geography } from './basemap';
import { NetworkRoutes } from './network-routes';
import { typeIcons, typeColors } from './facility-marker';
import { severityColors } from './impact-display';

// A still view of the actual Demo result. No separate or invented simulation data.
const result = getNetworkState(true);

export function ProductPreview() {
  return (
    <figure className="product-preview" aria-labelledby="preview-caption">
      <div className="preview-toolbar">
        <span>
          Demo Network <span className="preview-separator">/</span> Scenario
          analysis
        </span>
        <span className="preview-live">Disruption active</span>
      </div>
      <div className="preview-scenario">
        <div>
          <span className="home-overline">PORT DISRUPTION</span>
          <h3>{shanghaiClosure.name}</h3>
        </div>
        <span>{shanghaiClosure.durationDays}-day closure</span>
      </div>
      <svg
        className="preview-map"
        viewBox="75 75 930 350"
        role="img"
        aria-label="TwinChain Demo map: Shanghai is disrupted, its Pacific route is blocked, and downstream North American facilities are exposed."
      >
        <defs>
          <pattern
            id="grid"
            width="91.6667"
            height="91.6667"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M91.6667 0H0V91.6667"
              fill="none"
              stroke="#314957"
              strokeWidth="0.5"
            />
          </pattern>
          <linearGradient id="ocean">
            <stop stopColor="#10232e" />
            <stop offset="1" stopColor="#112630" />
          </linearGradient>
        </defs>
        <Geography />
        <NetworkRoutes
          routes={result.routes}
          facilities={result.facilities}
          demoLayout={false}
        />
        {result.facilities.map((facility) => {
          const [x, y] = facilityPoint(facility);
          const Icon = typeIcons[facility.type];
          const color = facility.impact
            ? severityColors[facility.impact.severity]
            : typeColors[facility.type];
          return (
            <g key={facility.id} transform={`translate(${x} ${y})`}>
              {facility.status === 'disrupted' && (
                <circle
                  r="23"
                  fill="none"
                  stroke={color}
                  strokeWidth="1"
                  opacity="0.5"
                />
              )}
              <rect
                x="-12"
                y="-12"
                width="24"
                height="24"
                rx="5"
                fill="#142a34"
                stroke={color}
                strokeWidth="1.5"
              />
              <Icon x="-7" y="-7" width="14" height="14" color={color} />
            </g>
          );
        })}
        <g className="preview-map-labels">
          <text x="510" y="195" fill="#ffb5a5">
            Shanghai · closed
          </text>
          <text x="790" y="245">
            North America
          </text>
          <text x="343" y="288">
            Asia Pacific
          </text>
          <text x="128" y="105">
            Europe
          </text>
        </g>
      </svg>
      <div className="preview-insights">
        <div>
          <span>Service level</span>
          <strong>
            {result.kpis.serviceLevel}
            <small>%</small>
          </strong>
        </div>
        <div>
          <span>Additional lead time</span>
          <strong>
            +{result.kpis.leadTime - getNetworkState(false).kpis.leadTime}
            <small> days</small>
          </strong>
        </div>
        <div>
          <span>First projected stockout</span>
          <strong>Day {result.inventorySummary?.earliestStockoutDay}</strong>
        </div>
      </div>
      <figcaption id="preview-caption">
        Actual Demo scenario · Illustrative data{' '}
        <a
          href="https://www.naturalearthdata.com/about/terms-of-use/"
          target="_blank"
          rel="noreferrer"
        >
          Map: Natural Earth
        </a>
      </figcaption>
    </figure>
  );
}
