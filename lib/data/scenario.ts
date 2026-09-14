import { facilities, routes } from './network.ts';
import { simulateDisruption } from '../simulation/propagate-disruption.ts';
import { runFacilityShutdown } from '../simulation/facility-shutdown.ts';
import {
  compareStrategies,
  type StrategyId,
} from '../simulation/mitigation.ts';
export { baseline, type KPIs } from '../simulation/model.ts';

export interface Scenario {
  id: string;
  name: string;
  durationDays: number;
  disruptedFacilityId: string;
}
export const shanghaiClosure: Scenario = {
  id: 'shanghai-14',
  name: 'Shanghai Port Closure',
  durationDays: 14,
  disruptedFacilityId: 'shanghai',
};
// Calculate once for this fixed demo network; UI rendering and camera motion do not run the simulation.
const normalState = simulateDisruption(
  facilities,
  routes,
  shanghaiClosure.disruptedFacilityId,
  0,
);
const disruptedState = runFacilityShutdown(
  facilities,
  routes,
  {
    type: 'facility-shutdown',
    facilityId: shanghaiClosure.disruptedFacilityId,
    durationDays: shanghaiClosure.durationDays,
  },
  'demo',
);
export const shanghaiComparison = compareStrategies(disruptedState);
export function getNetworkState(
  active: boolean,
  strategy: StrategyId = 'do-nothing',
) {
  return active
    ? shanghaiComparison.results.find((item) => item.strategy.id === strategy)!
        .result
    : normalState;
}
