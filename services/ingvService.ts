import { EarthquakeCollection } from '../types';

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
    const data: EarthquakeCollection = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch earthquakes", error);
    throw error;
  }
};
