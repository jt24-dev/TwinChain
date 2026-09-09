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
export function ScenarioControls({
  active,
  onActivate,
  onReset,
}: {
  active: boolean;
  onActivate: () => void;
  onReset: () => void;
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
        Shanghai
        <br />
        Port Closure
      </h2>
      <p className="scenario-description">
        A critical gateway goes offline.
        <br />
        See how the impact travels downstream.
      </p>
      <div className="duration">
        <span>Disruption duration</span>
        <strong>
          14 <span>days</span>
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
              ? '3 blocked routes. 4 downstream facilities at risk.'
              : 'Activate the scenario to reveal network dependencies.'}
          </p>
        </div>
      </div>
      <div className="model-note">
        <Info size={14} />
        <span>
          Illustrative scenario. Fixed assumptions, not a live forecast.
        </span>
      </div>
    </aside>
  );
}
