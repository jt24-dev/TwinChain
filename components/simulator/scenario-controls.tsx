import {
  Anchor,
  ArrowRight,
  CircleCheck,
  Info,
  Play,
  RotateCcw,
  TriangleAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { shanghaiClosure } from '@/lib/data/scenario';
export function ScenarioControls({
  active,
  onActivate,
  onReset,
  blockedRouteCount,
  atRiskCount,
}: {
  active: boolean;
  onActivate: () => void;
  onReset: () => void;
  blockedRouteCount: number;
  atRiskCount: number;
}) {
  return (
    <aside className="scenario-panel">
      <div className="panel-eyebrow">
        <span>SCENARIO CONTROL</span>
        <span>01</span>
      </div>
      <div className={`scenario-symbol ${active ? 'active' : ''}`}>
        <Anchor size={26} />
      </div>
      <div className="scenario-tags">
        <span>PORT DISRUPTION</span>
        <span>PREDEFINED</span>
      </div>
      <h2>
        Shanghai <br />
        Port Closure
      </h2>
      <p className="scenario-description">
        Close a critical gateway and trace the impact downstream.
      </p>
      <div className="duration">
        <span>Disruption duration</span>
        <strong>
          {shanghaiClosure.durationDays} <span>days</span>
        </strong>
      </div>
      <div className="scenario-scope">
        <span>Origin</span>
        <strong>
          Shanghai, China <span>CN</span>
        </strong>
      </div>
      <div className="scenario-scope">
        <span>Primary exposure</span>
        <strong>North America</strong>
      </div>
      <Button
        className="activate-button"
        onClick={onActivate}
        disabled={active}
      >
        {active ? <TriangleAlert size={17} /> : <Play size={16} />}{' '}
        {active ? 'Disruption active' : 'Activate disruption'}
        {!active && <ArrowRight size={17} />}
      </Button>
      <Button
        variant="outline"
        className="reset-button"
        onClick={onReset}
        disabled={!active}
      >
        <RotateCcw size={15} />
        Reset to baseline
      </Button>
      <div
        className={`scenario-feedback ${active ? 'active' : ''}`}
        role="status"
      >
        {active ? <TriangleAlert size={17} /> : <CircleCheck size={17} />}
        <div>
          <strong>
            {active
              ? 'Shanghai gateway unavailable'
              : 'Network operating normally'}
          </strong>
          <p>
            {active
              ? `${blockedRouteCount} blocked routes. ${atRiskCount} downstream facilities at risk.`
              : 'Activate to reveal downstream dependencies.'}
          </p>
        </div>
      </div>
      <div className="model-note">
        <Info size={14} />
        <span>
          Calculated from network dependencies using illustrative assumptions.
        </span>
      </div>
    </aside>
  );
}
