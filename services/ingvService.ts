import { EarthquakeCollection, EarthquakeFeature } from '../types';

const INGV_BASE_URL = "https://webservices.ingv.it/fdsnws/event/1/query";

export const fetchEarthquakes = async (days: number = 3): Promise<EarthquakeCollection> => {
  const now = new Date();
  const pastDate = new Date(now.setDate(now.getDate() - days));
  const dateString = pastDate.toISOString().split('T')[0]; // YYYY-MM-DD

  // Fetching minmag 0 to get all events
  const url = `${INGV_BASE_URL}?format=geojson&minmag=0&starttime=${dateString}&orderby=time`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error fetching data: ${response.statusText}`);
    }
    const rawData = await response.json();

    // Fix: INGV returns time as ISO String (e.g. 2023-10-01T10:00:00) without 'Z'.
    // Browsers often interpret this as Local Time, causing a 1-hour lag in Italy.
    // We append 'Z' to force UTC interpretation, ensuring correct timezone conversion later.
    const features = rawData.features.map((f: any): EarthquakeFeature => ({
      ...f,
      properties: {
        ...f.properties,
        time: new Date(f.properties.time.includes('Z') ? f.properties.time : f.properties.time + 'Z').getTime()
      }
    }));

    return { ...rawData, features };
  } catch (error) {
    console.error("Failed to fetch earthquakes", error);
    throw error;
  }
};