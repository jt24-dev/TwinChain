'use client';
import { useEffect } from 'react';
import { flushSync } from 'react-dom';
import { getNetworkState } from './data/scenario';
type ModelTool = {
  name: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => unknown;
};
type ModelContext = {
  registerTool: (
    tool: ModelTool,
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
export function useScenarioTools(setActive: (active: boolean) => void) {
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: 'set_shanghai_disruption',
            description:
              'Activate the predefined 14-day Shanghai Port Closure or reset the simulator to baseline. Updates the map and KPIs.',
            inputSchema: {
              type: 'object',
              properties: { active: { type: 'boolean' } },
              required: ['active'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: false },
            execute(input) {
              if (
                !input ||
                typeof input !== 'object' ||
                !('active' in input) ||
                typeof input.active !== 'boolean' ||
                Object.keys(input).length !== 1
              )
                throw new Error('Expected exactly { active: boolean }.');
              flushSync(() => setActive(input.active as boolean));
              const state = getNetworkState(input.active);
              return {
                active: state.active,
                kpis: state.kpis,
                disruptedFacilities: state.facilities
                  .filter((f) => f.status === 'disrupted')
                  .map((f) => f.name),
                atRiskFacilities: state.facilities
                  .filter((f) => f.status === 'at risk')
                  .map((f) => f.name),
              };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch((error) =>
        console.warn('Scenario tool registration unavailable', error),
      );
    } catch (error) {
      console.warn('Scenario tool registration unavailable', error);
    }
    return () => lifecycle.abort();
  }, [setActive]);
}
