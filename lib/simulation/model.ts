import type { Facility, Route } from '../data/network.ts';
import type { InventoryImpact, InventorySummary } from './inventory.ts';

export interface KPIs {
  serviceLevel: number;
  leadTime: number;
  logisticsCost: number;
  facilitiesAtRisk: number;
}
export const baseline: KPIs = {
  serviceLevel: 97,
  leadTime: 12,
  logisticsCost: 1200000,
  facilitiesAtRisk: 0,
};

// Illustrative business assumptions, centralized for explanation and calibration.
export const IMPACT_MODEL = {
  delayRetentionPerHop: 0.65,
  severityWeight: { high: 3, medium: 2, low: 1, normal: 0 },
  servicePenaltyPointsPerWeight: 2,
  referenceDurationDays: 14,
  serviceLevelFloor: 50,
  blockedRouteCostPerDay: 4000,
  affectedRouteCostPerDay: 2000,
  atRiskFacilityCostPerDay: 500,
} as const;

export type Severity = 'disrupted' | 'high' | 'medium' | 'low' | 'normal';
export interface FacilityImpact {
  severity: Severity;
  hops: number;
  additionalDelayDays: number;
  sourceFacilityId: string;
  sourceName: string;
}
export interface ImpactedFacility extends Facility {
  inventory?: InventoryImpact;
  impact: FacilityImpact | null;
  mitigation?: {
    name: string;
    originalDelayDays: number;
    emergencyProtection: boolean;
    supplyAvailability?: number;
  };
}
export interface ImpactedRoute extends Route {
  status: 'operational' | 'affected' | 'blocked';
  alternate?: boolean;
}
export interface SimulationResult {
  inventorySummary?: InventorySummary;
  active: boolean;
  facilities: ImpactedFacility[];
  routes: ImpactedRoute[];
  atRiskFacilityIds: string[];
  blockedRouteIds: string[];
  affectedRouteIds: string[];
  kpis: KPIs;
}

export function kpiChanges(kpis: KPIs, reference: KPIs = baseline) {
  return {
    serviceDrop: reference.serviceLevel - kpis.serviceLevel,
    additionalLeadDays: kpis.leadTime - reference.leadTime,
    costIncreasePercent: reference.logisticsCost
      ? ((kpis.logisticsCost - reference.logisticsCost) /
          reference.logisticsCost) *
        100
      : 0,
    additionalAtRisk: kpis.facilitiesAtRisk - reference.facilitiesAtRisk,
  };
}
