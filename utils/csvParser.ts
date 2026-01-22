
import { Load, StoreStop } from '../types';

/**
 * Calculates expected time for a load.
 * Assumption: 60km/h average travel speed (1 min per km)
 * plus 30 mins unloading time per store stop.
 */
export const calculateExpectedTime = (totalKms: number, stopCount: number): number => {
  const travelTimeMinutes = totalKms; // 1 min per km travel time
  const unloadingTimeMinutes = stopCount * 30; // 30 mins per stop unloading
  return Math.round(travelTimeMinutes + unloadingTimeMinutes);
};

export const parseTransportCsv = (csvText: string): Load[] => {
  const lines = csvText.split('\n');
  const loads: Load[] = [];
  let currentLoad: Partial<Load> | null = null;

  lines.forEach((line) => {
    const cols = line.split(',').map(c => c.trim());
    
    // Check if this is a load row (usually starts with a numeric ID in column A)
    const loadId = cols[0];
    const isNewLoad = loadId && !isNaN(Number(loadId));

    if (isNewLoad) {
      const stop: StoreStop = {
        stopNo: parseInt(cols[2]) || 0,
        storeNo: cols[3],
        storeName: cols[4],
        distance: parseFloat(cols[11]) || 0,
        returnLeg: parseFloat(cols[12]) || 0,
        windowStart: cols[7],
        windowEnd: cols[8],
      };

      // If load ID changes, we create a new load object
      if (!currentLoad || currentLoad.loadNo !== loadId) {
        if (currentLoad && currentLoad.loadNo) {
          // Finalize previous load calculation
          const totalDistance = (currentLoad.totalDistance || 0) + (currentLoad.totalReturnLeg || 0);
          currentLoad.expectedTimeMinutes = calculateExpectedTime(
            totalDistance,
            currentLoad.stops?.length || 0
          );
          loads.push(currentLoad as Load);
        }
        
        currentLoad = {
          loadNo: loadId,
          routeNo: cols[1],
          driver: cols[13] || 'UNKNOWN',
          truck: cols[14] || '',
          trailer: cols[15] || '',
          despatchTime: cols[16] || '',
          date: cols[6] || '',
          stops: [stop],
          totalPallets: parseInt(cols[10]) || 0,
          totalDistance: stop.distance,
          totalReturnLeg: stop.returnLeg
        };
      } else {
        // Same load ID, add additional stop
        currentLoad.stops?.push(stop);
        currentLoad.totalPallets = (currentLoad.totalPallets || 0) + (parseInt(cols[10]) || 0);
        currentLoad.totalDistance = (currentLoad.totalDistance || 0) + stop.distance;
        // Keep the latest return leg distance as the final leg
        currentLoad.totalReturnLeg = stop.returnLeg;
      }
    }
  });

  // Push the final load
  if (currentLoad && currentLoad.loadNo) {
    const totalDistance = (currentLoad.totalDistance || 0) + (currentLoad.totalReturnLeg || 0);
    currentLoad.expectedTimeMinutes = calculateExpectedTime(
      totalDistance,
      currentLoad.stops?.length || 0
    );
    loads.push(currentLoad as Load);
  }

  return loads;
};

export const calculateMinutesBetween = (time1: string, time2: string): number => {
  if (!time1 || !time2) return 0;
  
  const [h1, m1] = time1.split(':').map(Number);
  const [h2, m2] = time2.split(':').map(Number);
  
  const totalM1 = h1 * 60 + (m1 || 0);
  const totalM2 = h2 * 60 + (m2 || 0);
  
  return Math.abs(totalM2 - totalM1);
};
