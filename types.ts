
export interface StoreStop {
  stopNo: number;
  storeNo: string;
  storeName: string;
  distance: number;
  returnLeg: number;
  windowStart: string;
  windowEnd: string;
}

export interface Load {
  loadNo: string;
  routeNo: string;
  driver: string;
  truck: string;
  trailer: string;
  despatchTime: string; // e.g., "7:05"
  date: string;
  stops: StoreStop[];
  totalPallets: number;
  totalDistance: number;
  totalReturnLeg: number;
  expectedTimeMinutes: number; // Calculated field
}

export interface DriverStats {
  driverName: string;
  loads: Load[];
  totalKms: number;
  totalPallets: number;
  avgTimeBetweenLoadsMinutes: number;
}

export interface AnalysisResult {
  efficiencyScore: number;
  bottlenecks: string[];
  recommendations: string[];
  summary: string;
}
