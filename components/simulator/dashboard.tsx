'use client';
import { Fragment, useState, useCallback, useEffect, useMemo } from 'react';
import { ArrowRight, Check, Network, Radio, TriangleAlert } from 'lucide-react';
import { getNetworkState } from '@/lib/data/scenario';
import { KpiCards } from './kpi-cards';
import { NetworkMap } from './network-map';
import { ScenarioControls } from './scenario-controls';
import { useScenarioTools } from '@/lib/use-scenario-tools';
import type { StrategyId } from '@/lib/simulation/mitigation';
import { StrategyComparison } from './strategy-comparison';
import { useNetworks } from '@/lib/use-networks';
import { useNetworkBuilder } from '@/lib/use-network-builder';
import { normalNetworkView } from '@/lib/networks';
import { NetworkBuilderPanel, NetworkName } from './network-builder';
import { Button } from '@/components/ui/button';
import { CustomShutdownControls } from './custom-shutdown-controls';
import { NetworkImport } from './network-import';
import { operationalCompleteness } from '@/lib/operations';
import { InventorySummary } from './inventory-impact';
import { ProductHome, AboutProduct, PrivacyNote } from './product-home';
import { exportNetwork } from '@/lib/network-backup';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  customBaselineState,
  runFacilityShutdown,
  type FacilityShutdown,
} from '@/lib/simulation/facility-shutdown';
export function Dashboard() {
  const library = useNetworks();
  const [homeOverride, setHome] = useState<boolean | null>(null);
  const home = homeOverride ?? !library.hasSavedSession;
  const [about, setAbout] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [productError, setProductError] = useState('');
  const [importing, setImporting] = useState(false);
  const network = library.network;
  const enriched = operationalCompleteness(network);
  const [mode, setMode] = useState<'build' | 'simulate'>('simulate');
  const demoSimulation = network.kind === 'demo' && mode === 'simulate';
  const builder = useNetworkBuilder(
    network,
    library.edit,
    mode === 'build' && network.kind === 'custom',
  );
  const [active, setActive] = useState(false);
  const [customSelected, setCustomSelected] = useState<string | null>(null);
  const [shutdown, setShutdown] = useState<FacilityShutdown | null>(null);
  const [strategy, setStrategy] = useState<StrategyId>('do-nothing');
  const setDisruption = useCallback((next: boolean) => {
    setActive(next);
    setShutdown(null);
    setStrategy('do-nothing');
  }, []);
  useEffect(() => {
    setDisruption(false);
    setMode(network.kind === 'demo' ? 'simulate' : 'build');
    setCustomSelected(null);
  }, [network.id, setDisruption]);
  const normalView = useMemo(() => normalNetworkView(network), [network]);
  const simulation = getNetworkState(active, strategy);
  const customBase = useMemo(
    () => customBaselineState(network.facilities, network.routes),
    [network],
  );
  const customSimulation = useMemo(
    () =>
      shutdown && network.kind === 'custom' && mode === 'simulate'
        ? runFacilityShutdown(network.facilities, network.routes, shutdown)
        : customBase,
    [network, shutdown, mode, customBase],
  );
  const state =
    mode === 'build'
      ? normalView
      : demoSimulation
        ? simulation
        : customSimulation;
  const changeMode = (next: 'build' | 'simulate') => {
    setDisruption(false);
    setMode(next);
  };
  const create = () => {
    setHome(false);
    library.create();
    setDisruption(false);
    setMode('build');
  };
  const cascade = getNetworkState(true)
    .facilities.filter((f) => f.impact)
    .sort((a, b) => a.impact!.hops - b.impact!.hops);
  useScenarioTools(setDisruption, demoSimulation);
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
            <span />{' '}
            {network.kind === 'demo' ? 'DEMO NETWORK' : 'LOCAL NETWORK'}
          </span>
          <Button
            variant="ghost"
            onClick={() => {
              setHome(true);
              setDisruption(false);
            }}
          >
            Home
          </Button>
          <Button variant="ghost" onClick={() => setAbout(true)}>
            About
          </Button>
          <span className="version">v0.10</span>
        </div>
      </header>
      {!library.ready ? (
        <main>
          <p role="status">Opening your workspace…</p>
        </main>
      ) : home ? (
        <ProductHome
          networks={library.networks}
          onDemo={() => {
            library.open('demo');
            setHome(false);
            setMode('simulate');
            setDisruption(false);
          }}
          onBuild={create}
          onImport={() => setImporting(true)}
          onOpen={(id) => {
            library.open(id);
            setHome(false);
          }}
        />
      ) : (
        <main>
          <section className="network-toolbar" aria-label="Network and mode">
            <label className="builder-field">
              Open network
              <select
                aria-label="Open network"
                value={network.id}
                disabled={!library.ready}
                onChange={(event) => {
                  library.open(event.target.value);
                  setDisruption(false);
                }}
              >
                <option value="demo">Demo Network</option>
                {library.networks.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="outline"
              onClick={create}
              disabled={!library.ready}
            >
              Create New Network
            </Button>
            <Button
              variant="outline"
              disabled={!library.ready}
              onClick={() => setImporting(true)}
            >
              Import Network
            </Button>
            <div
              className="mode-switch"
              role="group"
              aria-label="Workspace mode"
            >
              <Button
                aria-pressed={mode === 'build'}
                variant="ghost"
                onClick={() => changeMode('build')}
              >
                Build
              </Button>
              <Button
                aria-pressed={mode === 'simulate'}
                variant="ghost"
                onClick={() => changeMode('simulate')}
              >
                Simulate
              </Button>
            </div>
            {network.kind === 'custom' && mode === 'build' && (
              <NetworkName
                key={network.id}
                network={network}
                onRename={(name) => builder.apply({ type: 'rename', name })}
              />
            )}
            <span className="save-state">
              {!library.ready
                ? 'Loading saved networks…'
                : network.kind === 'demo'
                  ? 'Read-only example'
                  : library.storageError
                    ? 'Not saved'
                    : 'Saved in this browser'}
            </span>
            {network.kind === 'custom' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    try {
                      const url = URL.createObjectURL(
                        new Blob([exportNetwork(network)], {
                          type: 'application/json',
                        }),
                      );
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${network.name.replace(/[^a-z0-9_-]/gi, '-') || 'network'}.json`;
                      a.click();
                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                      setProductError('');
                    } catch {
                      setProductError(
                        'The backup could not be exported. Keep this page open and try again.',
                      );
                    }
                  }}
                >
                  Export Network
                </Button>
                <Button variant="ghost" onClick={() => setDeleting(true)}>
                  Delete Network
                </Button>
              </>
            )}
          </section>
          {network.kind === 'demo' && (
            <p className="privacy-note">
              Demo Network · Illustrative sample data, not real company
              measurements. Explore Shanghai’s closure, inspect stockouts, then
              compare responses.
            </p>
          )}
          {productError && (
            <p role="alert" className="builder-error">
              {productError}
            </p>
          )}
          <p className="operations-summary">
            Operational data: {enriched.facilities} of{' '}
            {network.facilities.length} facilities · {enriched.routes} of{' '}
            {network.routes.length} routes enriched · inventory data informs
            shutdown projections
          </p>
          {library.storageError && (
            <p className="builder-error" role="alert">
              {library.storageError}
            </p>
          )}
          <div className="overview-heading">
            <div>
              <div className="eyebrow">NETWORK INTELLIGENCE</div>
              <h2>
                {mode === 'build'
                  ? 'Build your supply chain.'
                  : 'Every connection has a consequence.'}
              </h2>
              <p>
                {mode === 'build'
                  ? 'Place facilities and connect directional routes on the map.'
                  : demoSimulation
                    ? 'Explore your network. Introduce a disruption. Understand the impact.'
                    : 'Select a facility. Run a shutdown. Trace the downstream impact.'}
              </p>
            </div>
            <div className={`state-badge ${state.active ? 'disrupted' : ''}`}>
              {state.active ? <TriangleAlert size={15} /> : <Radio size={15} />}{' '}
              {mode === 'build'
                ? 'Build mode'
                : state.active
                  ? 'Disruption active'
                  : 'Simulate mode'}
            </div>
          </div>
          {demoSimulation && (
            <KpiCards kpis={simulation.kpis} active={active} />
          )}
          {mode === 'simulate' && network.kind === 'custom' && (
            <KpiCards
              key={network.id}
              kpis={customSimulation.kpis}
              active={customSimulation.active}
              baseline={customBase.kpis}
              facilityCount={network.facilities.length}
            />
          )}
          {demoSimulation && active && (
            <StrategyComparison selected={strategy} />
          )}
          {mode === 'simulate' && (
            <InventorySummary
              result={demoSimulation ? simulation : customSimulation}
            />
          )}
          <div
            className={`workspace ${mode === 'build' ? 'builder-workspace' : ''}`}
          >
            <div className="network-column">
              <NetworkMap
                key={network.id}
                state={state}
                name={network.name}
                demoLayout={network.kind === 'demo'}
                selectedId={
                  network.kind === 'custom' ? customSelected : undefined
                }
                onSelectionChange={
                  network.kind === 'custom' ? setCustomSelected : undefined
                }
                builder={
                  mode === 'build' && network.kind === 'custom'
                    ? builder
                    : undefined
                }
              />
              {demoSimulation && (
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
                          : `Shanghai connects Asian production to ${cascade.length - 1} downstream facilities.`}
                      </p>
                    </div>
                  </div>
                  <div className="impact-chain">
                    {cascade.map((facility, index) => (
                      <Fragment key={facility.id}>
                        {index > 0 && <ArrowRight size={13} />}
                        <span
                          className={
                            active && facility.impact?.hops === 0
                              ? 'closed'
                              : ''
                          }
                        >
                          {facility.city}
                        </span>
                      </Fragment>
                    ))}
                  </div>
                </section>
              )}
            </div>
            {mode === 'build' ? (
              <NetworkBuilderPanel
                network={network}
                builder={builder}
                onCreate={create}
              />
            ) : demoSimulation ? (
              <ScenarioControls
                active={active}
                blockedRouteCount={simulation.blockedRouteIds.length}
                atRiskCount={simulation.atRiskFacilityIds.length}
                strategy={strategy}
                onStrategy={setStrategy}
                onActivate={() => setDisruption(true)}
                onReset={() => setDisruption(false)}
              />
            ) : (
              <CustomShutdownControls
                key={network.id}
                facilities={network.facilities}
                selected={customSelected}
                onSelect={setCustomSelected}
                result={customSimulation}
                running={shutdown}
                onRun={setShutdown}
                onReset={() => setShutdown(null)}
              />
            )}
          </div>
          <footer>
            <span>
              <span className="footer-dot" /> Client-side demo · Illustrative
              network & business impact
            </span>
            <span>RESILIENCE STARTS WITH VISIBILITY</span>
          </footer>
          <PrivacyNote />
        </main>
      )}
      {home && library.storageError && (
        <p className="builder-error" role="alert">
          {library.storageError}
        </p>
      )}
      {about && <AboutProduct onClose={() => setAbout(false)} />}
      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete {network.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the Custom Network from this browser. Export a JSON
            backup first if you want to keep it. This cannot be undone.
          </AlertDialogDescription>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              library.remove(network.id);
              setDeleting(false);
              setDisruption(false);
              setHome(true);
            }}
          >
            Delete Custom Network
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
      {importing && (
        <NetworkImport
          onClose={() => setImporting(false)}
          onImport={(next) => {
            library.importNetwork(next);
            setHome(false);
            setDisruption(false);
            setMode('build');
          }}
        />
      )}
    </div>
  );
}
