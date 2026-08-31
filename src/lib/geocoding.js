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

/* ===== ROBUST MULTI-TIER REVERSE GEOCODING ENGINE ===== */
export async function reverseGeocodeCoords(lat, lng) {
  // Tier 1: BigDataCloud Client Reverse Geocode API (High accuracy for Indian localities/cities)
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const locality = (data.locality || '').trim();
      const city = (data.city || '').trim();
      const state = (data.principalSubdivision || '').trim();

      let name = '';
      if (locality && city && locality.toLowerCase() !== city.toLowerCase()) {
        name = `${locality}, ${city}`;
      } else if (locality) {
        name = locality;
      } else if (city) {
        name = city;
      } else if (state) {
        name = state;
      }

      if (name) {
        return {
          city: name,
          subdivision: state,
          country: data.countryName || 'India',
          formatted: name + (state && !name.includes(state) ? `, ${state}` : '')
        };
      }
    }
  } catch (err) {
    console.warn('BigDataCloud reverse geocode error:', err);
  }

  // Tier 2: OpenStreetMap Nominatim (Detailed suburb/neighbourhood/town)
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'WeatherGPT/1.0' } });
    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const a = data.address;
        const sub = a.suburb || a.neighbourhood || a.village || a.hamlet || '';
        const city = a.city || a.town || a.municipality || a.county || a.state_district || '';
        const state = a.state || '';

        let name = '';
        if (sub && city && sub.toLowerCase() !== city.toLowerCase()) {
          name = `${sub}, ${city}`;
        } else {
          name = sub || city || state || a.country || '';
        }

        if (name) {
          return {
            city: name,
            subdivision: state,
            country: a.country || 'India',
            formatted: name + (state && !name.includes(state) ? `, ${state}` : '')
          };
        }
      }
    }
  } catch (err) {
    console.warn('Nominatim reverse geocode error:', err);
  }

  // Tier 3: Google Maps Geocoding API (if key available)
  try {
    if (CONFIG.GOOGLE_API_KEY) {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${CONFIG.GOOGLE_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const first = data.results[0];
        const locality = first.address_components?.find(c => c.types.includes('locality'))?.long_name;
        const sublocality = first.address_components?.find(c => c.types.includes('sublocality'))?.long_name;
        const admin = first.address_components?.find(c => c.types.includes('administrative_area_level_1'))?.long_name;

        const cityName = (sublocality && locality && sublocality.toLowerCase() !== locality.toLowerCase())
          ? `${sublocality}, ${locality}`
          : (locality || sublocality || first.formatted_address?.split(',')[0]);

        if (cityName) {
          return {
            city: cityName,
            subdivision: admin || '',
            country: 'India',
            formatted: first.formatted_address || cityName
          };
        }
      }
    }
  } catch (err) {
    console.warn('Google reverse geocode error:', err);
  }

  // Tier 4: Offline proximity match with nearest Indian city
  const nearest = findClosestIndianCity(lat, lng);
  const coordStr = `${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E`;
  return {
    city: nearest.distance < 40 ? nearest.city : `Near ${nearest.city} (${coordStr})`,
    subdivision: '',
    country: 'India',
    formatted: `${nearest.city} area (${coordStr})`
  };
}
