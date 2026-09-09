import { facilities, routes, type FacilityStatus } from './network.ts';
export interface KPIs {
  serviceLevel: number;
  leadTime: number;
  logisticsCost: number;
  facilitiesAtRisk: number;
}
export interface Scenario {
  id: string;
  name: string;
  durationDays: number;
  disruptedFacilityId: string;
  atRiskFacilityIds: string[];
  blockedRouteIds: string[];
  affectedRouteIds: string[];
  kpis: KPIs;
}
export const baseline: KPIs = {
  serviceLevel: 97,
  leadTime: 12,
  logisticsCost: 1200000,
  facilitiesAtRisk: 0,
};
export const shanghaiClosure: Scenario = {
  id: 'shanghai-14',
  name: 'Shanghai Port Closure',
  durationDays: 14,
  disruptedFacilityId: 'shanghai',
  atRiskFacilityIds: ['la', 'ontario', 'chicago', 'ny'],
  blockedRouteIds: ['r3', 'r4', 'r5'],
  affectedRouteIds: ['r6', 'r7', 'r8'],
  kpis: {
    serviceLevel: 84,
    leadTime: 19,
    logisticsCost: 1480000,
    facilitiesAtRisk: 4,
  },
};
// Explicit scenario membership is intentional in v0.1; no inferred propagation.
export function getNetworkState(active: boolean) {
  return {
    active,
    kpis: active ? shanghaiClosure.kpis : baseline,
    facilities: facilities.map((f) => ({
      ...f,
      status: (active && f.id === shanghaiClosure.disruptedFacilityId
        ? 'disrupted'
        : active && shanghaiClosure.atRiskFacilityIds.includes(f.id)
          ? 'at risk'
          : 'operational') as FacilityStatus,
    })),
    routes: routes.map((r) => ({
      ...r,
      status:
        active && shanghaiClosure.blockedRouteIds.includes(r.id)
          ? 'blocked'
          : active && shanghaiClosure.affectedRouteIds.includes(r.id)
            ? 'affected'
            : 'operational',
    })),
  };
}
