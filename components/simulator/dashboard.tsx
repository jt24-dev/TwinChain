'use client';
import { useState } from 'react';
import { ArrowRight, Check, Network, Radio, TriangleAlert } from 'lucide-react';
import { getNetworkState } from '@/lib/data/scenario';
import { KpiCards } from './kpi-cards';
import { NetworkMap } from './network-map';
import { ScenarioControls } from './scenario-controls';
import { useScenarioTools } from '@/lib/use-scenario-tools';
export function Dashboard() {
  const [active, setActive] = useState(false);
  const state = getNetworkState(active);
  useScenarioTools(setActive);
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">
            <Network size={23} />
          </div>
          <div>
            <h1>Supply Chain Resilience Simulator</h1>
            <p>Global Network Digital Twin</p>
          </div>
        </div>
        <div className="header-meta">
          <span className="demo-badge">
            <span /> DEMO ENVIRONMENT
          </span>
          <span className="version">v0.1</span>
        </div>
      </header>
      <main>
        <div className="overview-heading">
          <div>
            <div className="eyebrow">NETWORK INTELLIGENCE</div>
            <h2>Every connection has a consequence.</h2>
            <p>
              Explore your network. Introduce a disruption. Understand the
              impact.
            </p>
          </div>
          <div className={`state-badge ${active ? 'disrupted' : ''}`}>
            {active ? <TriangleAlert size={15} /> : <Radio size={15} />}{' '}
            {active ? 'Disruption active' : 'All systems operational'}
          </div>
        </div>
        <KpiCards kpis={state.kpis} active={active} />
        <div className="workspace">
          <div className="network-column">
            <NetworkMap active={active} />
            <section
              className={`impact-strip ${active ? 'active' : ''}`}
              aria-live="polite"
            >
              <div className="impact-title">
                {active ? <TriangleAlert size={19} /> : <Check size={19} />}
                <div>
                  <h3>
                    {active
                      ? 'The downstream effect'
                      : 'One gateway. A connected network.'}
                  </h3>
                  <p>
                    {active
                      ? 'Shanghai-dependent flows are interrupted across North America.'
                      : 'Shanghai connects Asian production to four downstream facilities.'}
                  </p>
                </div>
              </div>
              <div className="impact-chain">
                <span className={active ? 'closed' : ''}>Shanghai</span>
                <ArrowRight size={13} />
                <span>Los Angeles</span>
                <ArrowRight size={13} />
                <span>Ontario</span>
                <ArrowRight size={13} />
                <span>Chicago</span>
                <ArrowRight size={13} />
                <span>New York</span>
              </div>
            </section>
          </div>
          <ScenarioControls
            active={active}
            onActivate={() => setActive(true)}
            onReset={() => setActive(false)}
          />
        </div>
        <footer>
          <span>
            <span className="footer-dot" /> Client-side demo · Illustrative
            network & business impact
          </span>
          <span>RESILIENCE STARTS WITH VISIBILITY</span>
        </footer>
      </main>
    </div>
  );
}
