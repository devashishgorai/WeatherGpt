import { CONFIG } from './config';
import { INDIAN_CITIES_DB } from './constants';

/* ===== ROBUST 3-TIER FORWARD GEOCODING ENGINE ===== */
export async function geocodeAddress(cityName) {
  if (!cityName || !cityName.trim()) return null;
  const cleanName = cityName.trim();
  const norm = cleanName.toLowerCase();

  // Tier 1: Check built-in Indian cities database first
  if (INDIAN_CITIES_DB[norm]) {
    const item = INDIAN_CITIES_DB[norm];
    return {
      lat: item.lat,
      lng: item.lng,
      city: item.city,
      formattedAddress: `${item.city}, India`
    };
  }

  for (const [key, item] of Object.entries(INDIAN_CITIES_DB)) {
    if (norm === key || (norm.length > 3 && key.includes(norm)) || (key.length > 3 && norm.includes(key))) {
      return {
        lat: item.lat,
        lng: item.lng,
        city: item.city,
        formattedAddress: `${item.city}, India`
      };
    }
  }

  // Tier 2: Google Geocoding API
  try {
    if (CONFIG.GOOGLE_API_KEY) {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cleanName)}&key=${CONFIG.GOOGLE_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const first = data.results[0];
        const loc = first.geometry.location;
        const locality = first.address_components?.find(c => c.types.includes('locality'))?.long_name;
        const adminArea = first.address_components?.find(c => c.types.includes('administrative_area_level_1'))?.long_name;
        return {
          lat: loc.lat,
          lng: loc.lng,
          city: locality || cleanName,
          formattedAddress: first.formatted_address || `${locality || cleanName}, ${adminArea || 'India'}`
        };
      }
    }
  } catch (err) {
    console.warn('Google Geocode error, trying Open-Meteo geocode:', err);
  }

  // Tier 3: Open-Meteo Geocoding API
  try {
    const omUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanName)}&count=1&language=en&format=json`;
    const omRes = await fetch(omUrl);
    const omData = await omRes.json();
    if (omData && omData.results && omData.results.length > 0) {
      const r = omData.results[0];
      return {
        lat: r.latitude,
        lng: r.longitude,
        city: r.name,
        formattedAddress: `${r.name}, ${r.admin1 || r.country || 'India'}`
      };
    }
  } catch (omErr) {
    console.warn('Open-Meteo geocoding error:', omErr);
  }

  return null;
}

/* ===== DISTANCE HELPER FOR NEAREST CITY FALLBACK ===== */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function findClosestIndianCity(lat, lng) {
  let closestCity = null;
  let minDistance = Infinity;
  for (const [key, item] of Object.entries(INDIAN_CITIES_DB)) {
    const dist = calculateDistanceKm(lat, lng, item.lat, item.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closestCity = item.city;
    }
  }
  return { city: closestCity || 'India', distance: Math.round(minDistance) };
}

function firstValue(...values) {
  return values.find((value) => typeof value === 'string' && value.trim())?.trim() || '';
}

export function formatLocationDisplay(location) {
  const primary = firstValue(
    location.premise,
    location.building,
    location.houseNumber && location.street ? `${location.houseNumber} ${location.street}` : '',
    location.street,
    location.road,
    location.neighbourhood,
    location.locality,
    location.sublocality,
    location.suburb,
    location.city,
    location.district,
    location.state,
    'Your Location'
  );
  const secondaryParts = [
    firstValue(location.locality, location.sublocality, location.suburb, location.city, location.district),
    location.state,
    location.postalCode,
    location.country
  ].filter(Boolean);
  const secondary = [...new Set(secondaryParts)].filter((part) => part !== primary).join(' · ');

  return { primary, secondary };
}

/* ===== ROBUST MULTI-TIER REVERSE GEOCODING ENGINE ===== */
export async function reverseGeocodeCoords(lat, lng) {
  // Prefer the detailed address response before locality-only providers.
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'WeatherGPT/1.0' } });
    if (res.ok) {
      const data = await res.json();
      const a = data?.address;
      if (a) {
        const addressData = {
          ...a,
          premise: a.building || '',
          houseNumber: a.house_number || '',
          street: a.road || '',
          neighbourhood: a.neighbourhood || '',
          locality: a.suburb || a.village || a.hamlet || '',
          city: a.city || a.town || a.municipality || a.county || a.state_district || '',
          district: a.state_district || a.county || '',
          state: a.state || '',
          postalCode: a.postcode || '',
          country: a.country || '',
          address: [a.house_number, a.road].filter(Boolean).join(' '),
          formatted: data.display_name || ''
        };
        const display = formatLocationDisplay(addressData);
        if (display.primary !== 'Your Location') {
          return { ...addressData, displayPrimary: display.primary, displaySecondary: display.secondary, subdivision: addressData.state };
        }
      }
    }
  } catch (err) {
    console.warn('Detailed reverse geocode error:', err);
  }

  // Tier 2: BigDataCloud Client Reverse Geocode API
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const locality = (data.locality || data.localityInfo?.administrative?.[3]?.name || '').trim();
      const city = (data.city || data.localityInfo?.administrative?.[2]?.name || '').trim();
      const state = (data.principalSubdivision || '').trim();

      const address = {
        ...data,
        premise: firstValue(data.premise, data.building),
        locality,
        city,
        state,
        postalCode: firstValue(data.postcode, data.postalCode),
        country: firstValue(data.countryName, data.country),
        formatted: data.localityInfo?.informative?.[0]?.description || data.formatted || ''
      };
      const display = formatLocationDisplay(address);

      if (display.primary !== 'Your Location') {
        return {
          ...address,
          city: city || locality || display.primary,
          displayPrimary: display.primary,
          displaySecondary: display.secondary,
          subdivision: state
        };
      }
    }
  } catch (err) {
    console.warn('BigDataCloud reverse geocode error:', err);
  }

  // Tier 3: OpenStreetMap fallback
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'WeatherGPT/1.0' } });
    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const a = data.address;
        const sub = a.neighbourhood || '';
        const locality = a.suburb || a.village || a.hamlet || '';
        const city = a.city || a.town || a.municipality || a.county || a.state_district || '';
        const state = a.state || '';
        const address = [a.house_number, a.road].filter(Boolean).join(' ');
        const addressData = {
          ...a,
          premise: a.building || '',
          houseNumber: a.house_number || '',
          street: a.road || '',
          neighbourhood: sub,
          locality,
          city,
          district: a.state_district || a.county || '',
          state,
          postalCode: a.postcode || '',
          country: a.country || '',
          address,
          formatted: data.display_name || ''
        };
        const display = formatLocationDisplay(addressData);

        if (display.primary !== 'Your Location') {
          return {
            ...addressData,
            displayPrimary: display.primary,
            displaySecondary: display.secondary,
            subdivision: state
          };
        }
      }
    }
  } catch (err) {
    console.warn('Nominatim reverse geocode error:', err);
  }

  // Do not replace an exact GPS position with a nearby hardcoded city.
  const coordStr = `${lat}, ${lng}`;
  return {
    city: 'Your Location',
    subdivision: '',
    country: '',
    formatted: `Your Location (${coordStr})`
  };
}
