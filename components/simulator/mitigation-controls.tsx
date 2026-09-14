import { strategies, type StrategyId } from '@/lib/simulation/mitigation';
export function MitigationControls({
  selected,
  onSelect,
}: {
  selected: StrategyId;
  onSelect: (id: StrategyId) => void;
}) {
  const current = strategies.find((s) => s.id === selected)!;
  return (
    <section className="mitigation-controls" aria-label="Mitigation response">
      <fieldset>
        <legend>Choose a response</legend>
        {strategies.map((strategy) => (
          <label
            key={strategy.id}
            className={`strategy-option ${selected === strategy.id ? 'is-selected' : ''}`}
          >
            <input
              type="radio"
              name="mitigation"
              value={strategy.id}
              checked={selected === strategy.id}
              onChange={() => onSelect(strategy.id)}
            />
            <span>
              <strong>{strategy.name}</strong>
              <small>{strategy.description}</small>
            </span>
          </label>
        ))}
      </fieldset>
      <p className="strategy-tradeoff">{current.tradeoff}</p>
      <p className="strategy-summary" role="status">
        {current.summary}
      </p>
    </section>
  );
}
