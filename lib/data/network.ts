export type FacilityType =
  | 'Supplier'
  | 'Factory'
  | 'Port'
  | 'Distribution center'
  | 'Customer market';
export type FacilityStatus = 'operational' | 'disrupted' | 'at risk';
export interface Facility {
  id: string;
  name: string;
  city: string;
  type: FacilityType;
  latitude: number;
  longitude: number;
  region: string;
  status: FacilityStatus;
  labelOffset?: [number, number];
}
export interface Route {
  id: string;
  from: string;
  to: string;
  mode: 'Ocean' | 'Road' | 'Feeder';
}
export const facilities: Facility[] = [
  {
    id: 'suzhou',
    name: 'Suzhou Components',
    city: 'Suzhou',
    type: 'Supplier',
    latitude: 31.3,
    longitude: 120.6,
    region: 'East Asia',
    status: 'operational',
    labelOffset: [-16, -23],
  },
  {
    id: 'taipei',
    name: 'Taipei Electronics',
    city: 'Taipei',
    type: 'Supplier',
    latitude: 25,
    longitude: 121.6,
    region: 'East Asia',
    status: 'operational',
    labelOffset: [20, 10],
  },
  {
    id: 'shenzhen',
    name: 'Shenzhen Assembly',
    city: 'Shenzhen',
    type: 'Factory',
    latitude: 22.5,
    longitude: 114.1,
    region: 'East Asia',
    status: 'operational',
    labelOffset: [-18, 8],
  },
  {
    id: 'hcm',
    name: 'Ho Chi Minh Manufacturing',
    city: 'Ho Chi Minh',
    type: 'Factory',
    latitude: 10.8,
    longitude: 106.6,
    region: 'Southeast Asia',
    status: 'operational',
    labelOffset: [-18, 1],
  },
  {
    id: 'shanghai',
    name: 'Shanghai Port',
    city: 'Shanghai',
    type: 'Port',
    latitude: 31.2,
    longitude: 121.5,
    region: 'East Asia',
    status: 'operational',
    labelOffset: [22, -9],
  },
  {
    id: 'singapore',
    name: 'Singapore Port',
    city: 'Singapore',
    type: 'Port',
    latitude: 1.3,
    longitude: 103.8,
    region: 'Southeast Asia',
    status: 'operational',
    labelOffset: [0, 27],
  },
  {
    id: 'la',
    name: 'Port of Los Angeles',
    city: 'Los Angeles',
    type: 'Port',
    latitude: 33.7,
    longitude: -118.3,
    region: 'North America',
    status: 'operational',
    labelOffset: [-18, 17],
  },
  {
    id: 'rotterdam',
    name: 'Port of Rotterdam',
    city: 'Rotterdam',
    type: 'Port',
    latitude: 51.9,
    longitude: 4.5,
    region: 'Europe',
    status: 'operational',
    labelOffset: [-18, -8],
  },
  {
    id: 'ontario',
    name: 'Ontario Distribution Center',
    city: 'Ontario',
    type: 'Distribution center',
    latitude: 34.1,
    longitude: -117.6,
    region: 'North America',
    status: 'operational',
    labelOffset: [-8, -24],
  },
  {
    id: 'chicago',
    name: 'Chicago Distribution Center',
    city: 'Chicago',
    type: 'Distribution center',
    latitude: 41.9,
    longitude: -87.6,
    region: 'North America',
    status: 'operational',
    labelOffset: [0, -20],
  },
  {
    id: 'duisburg',
    name: 'Duisburg Distribution Center',
    city: 'Duisburg',
    type: 'Distribution center',
    latitude: 51.4,
    longitude: 6.8,
    region: 'Europe',
    status: 'operational',
    labelOffset: [0, 26],
  },
  {
    id: 'ny',
    name: 'New York Customer Market',
    city: 'New York',
    type: 'Customer market',
    latitude: 40.7,
    longitude: -74,
    region: 'North America',
    status: 'operational',
    labelOffset: [18, 5],
  },
  {
    id: 'berlin',
    name: 'Berlin Customer Market',
    city: 'Berlin',
    type: 'Customer market',
    latitude: 52.5,
    longitude: 13.4,
    region: 'Europe',
    status: 'operational',
    labelOffset: [17, -10],
  },
  {
    id: 'sydney',
    name: 'Sydney Customer Market',
    city: 'Sydney',
    type: 'Customer market',
    latitude: -33.9,
    longitude: 151.2,
    region: 'Oceania',
    status: 'operational',
    labelOffset: [19, 5],
  },
];
export const routes: Route[] = [
  { id: 'r1', from: 'suzhou', to: 'shenzhen', mode: 'Road' },
  { id: 'r2', from: 'taipei', to: 'shenzhen', mode: 'Feeder' },
  { id: 'r3', from: 'shenzhen', to: 'shanghai', mode: 'Road' },
  { id: 'r4', from: 'suzhou', to: 'shanghai', mode: 'Road' },
  { id: 'r5', from: 'shanghai', to: 'la', mode: 'Ocean' },
  { id: 'r6', from: 'la', to: 'ontario', mode: 'Road' },
  { id: 'r7', from: 'ontario', to: 'chicago', mode: 'Road' },
  { id: 'r8', from: 'chicago', to: 'ny', mode: 'Road' },
  { id: 'r9', from: 'hcm', to: 'singapore', mode: 'Road' },
  { id: 'r10', from: 'singapore', to: 'rotterdam', mode: 'Ocean' },
  { id: 'r11', from: 'rotterdam', to: 'duisburg', mode: 'Road' },
  { id: 'r12', from: 'duisburg', to: 'berlin', mode: 'Road' },
  { id: 'r13', from: 'singapore', to: 'sydney', mode: 'Ocean' },
];
export const facilityById = Object.fromEntries(
  facilities.map((f) => [f.id, f]),
) as Record<string, Facility>;
