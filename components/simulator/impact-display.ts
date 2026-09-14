import type { ImpactedFacility, Severity } from '@/lib/simulation/model';
export const severityLabels: Record<Severity, string> = {
  normal: 'Normal risk',
  disrupted: 'Disrupted',
  high: 'High risk',
  medium: 'Medium risk',
  low: 'Low risk',
};
export const severityColors: Record<Severity, string> = {
  normal: '#4bd8ca',
  disrupted: '#fb7b69',
  high: '#ffc16a',
  medium: '#dec596',
  low: '#adbbc1',
};
export function facilityStatusLabel(facility: ImpactedFacility) {
  if (facility.inventory?.state === 'stockout')
    return `${severityLabels[facility.impact!.severity]} network exposure · Projected stockout`;
  if (facility.inventory?.state === 'protected')
    return `${severityLabels[facility.impact!.severity]} network exposure · Inventory protected`;
  if (facility.mitigation?.emergencyProtection)
    return 'Protected · Normal risk';
  return facility.impact
    ? severityLabels[facility.impact.severity]
    : 'Operational';
}
