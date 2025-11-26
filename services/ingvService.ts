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

    // Fix: INGV returns time as ISO String, but app expects Timestamp Number.
    // We convert it here so the rest of the app can do math on it.
    const features = rawData.features.map((f: any): EarthquakeFeature => ({
      ...f,
      properties: {
        ...f.properties,
        // Convert ISO string to milliseconds timestamp
        time: new Date(f.properties.time).getTime()
      }
    }));

    return { ...rawData, features };
  } catch (error) {
    console.error("Failed to fetch earthquakes", error);
    throw error;
  }
};