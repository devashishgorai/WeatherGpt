import { CONFIG } from './config';
import { INDIAN_CITIES_DB } from './constants';

const locationAutocompleteCache = new Map();

function firstValue(...values) {
  return values.find((value) => typeof value === 'string' && value.trim())?.trim() || '';
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizePlaceRecord(raw, fallbackName = '') {
  const lat = toNumber(raw?.latitude ?? raw?.lat ?? raw?.geometry?.location?.lat ?? raw?.location?.lat);
  const lng = toNumber(raw?.longitude ?? raw?.lng ?? raw?.geometry?.location?.lng ?? raw?.location?.lng);
  const city = firstValue(
    raw?.city,
    raw?.locality,
    raw?.town,
    raw?.municipality,
    raw?.village,
    raw?.address?.city,
    raw?.address?.town,
    raw?.address?.village,
    raw?.address?.municipality,
    raw?.address?.county,
    raw?.address?.state_district,
    raw?.address?.state,
    raw?.admin1,
    raw?.admin_area_1,
    fallbackName
  );
  const district = firstValue(raw?.district, raw?.county, raw?.address?.county, raw?.address?.state_district, raw?.admin2);
  const state = firstValue(raw?.state, raw?.region, raw?.address?.state, raw?.administrative_area_level_1, raw?.principalSubdivision);
  const country = firstValue(raw?.country, raw?.address?.country, raw?.countryName, raw?.country_code);
  const postalCode = firstValue(raw?.postalCode, raw?.postcode, raw?.postal_code, raw?.address?.postcode);
  const name = firstValue(
    raw?.name,
    raw?.title,
    raw?.display_name ? raw.display_name.split(',')[0].trim() : '',
    city,
    fallbackName
  );
  const formattedAddress = firstValue(
    raw?.formattedAddress,
    raw?.formatted_address,
    raw?.display_name,
    raw?.address?.formatted,
    [name, district, state, country].filter(Boolean).join(', '),
    `${city || name}${state ? `, ${state}` : ''}${country ? `, ${country}` : ''}`
  );
  const placeId = firstValue(raw?.placeId, raw?.place_id, raw?.osm_id ? `osm-${raw.osm_id}` : '', raw?.id ? `google-${raw.id}` : '');

  return {
    name: name || fallbackName || city || 'Location',
    formattedAddress: formattedAddress || `${city || name || 'Location'}${state ? `, ${state}` : ''}${country ? `, ${country}` : ''}`,
    latitude: lat,
    longitude: lng,
    city: city || name || '',
    district: district || '',
    state: state || '',
    country: country || '',
    postalCode: postalCode || '',
    placeId,
    lat,
    lng
  };
}

function dedupeLocationResults(results) {
  const seen = new Set();
  return results.filter((entry) => {
    const key = `${entry.placeId || ''}-${entry.latitude ?? ''}-${entry.longitude ?? ''}-${entry.formattedAddress || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function searchLocationAutocomplete(query, options = {}) {
  const input = (query || '').trim();
  if (!input || input.length < 2) return [];

  const cacheKey = input.toLowerCase();
  if (locationAutocompleteCache.has(cacheKey)) {
    return locationAutocompleteCache.get(cacheKey);
  }

  const { signal } = options;
  const results = [];

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&addressdetails=1&namedetails=1&q=${encodeURIComponent(input)}`;
    const res = await fetch(url, {
      signal,
      headers: { 'User-Agent': 'WeatherGPT/1.0' }
    });

    if (res.ok) {
      const data = await res.json();
      for (const item of data || []) {
        const record = normalizePlaceRecord(item, item?.display_name?.split(',')[0]?.trim() || input);
        if (record.latitude != null && record.longitude != null) {
          results.push(record);
        }
      }
    }
  } catch (err) {
    if (err?.name !== 'AbortError') {
      console.warn('Location autocomplete failed:', err);
    }
  }

  if (results.length === 0 && CONFIG.GOOGLE_API_KEY) {
    try {
      const placesUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&components=country:IN&types=(cities)|establishment&key=${CONFIG.GOOGLE_API_KEY}`;
      const placesRes = await fetch(placesUrl, { signal });
      const placesData = await placesRes.json();

      if (placesData?.status === 'OK' && Array.isArray(placesData.predictions)) {
        const placeIds = placesData.predictions.slice(0, 5).map((item) => item.place_id).filter(Boolean);

        for (const placeId of placeIds) {
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=name,formatted_address,geometry,place_id,address_component&key=${CONFIG.GOOGLE_API_KEY}`;
          const detailsRes = await fetch(detailsUrl, { signal });
          const detailsData = await detailsRes.json();
          const result = detailsData?.result;
          if (!result?.geometry) continue;

          const record = normalizePlaceRecord({
            place_id: result.place_id,
            name: result.name,
            formatted_address: result.formatted_address,
            geometry: result.geometry,
            city: result.address_components?.find((component) => component.types.includes('locality'))?.long_name || '',
            district: result.address_components?.find((component) => component.types.includes('administrative_area_level_2'))?.long_name || '',
            state: result.address_components?.find((component) => component.types.includes('administrative_area_level_1'))?.long_name || '',
            country: result.address_components?.find((component) => component.types.includes('country'))?.long_name || '',
            postalCode: result.address_components?.find((component) => component.types.includes('postal_code'))?.long_name || '',
            placeId: result.place_id
          }, input);

          if (record.latitude != null && record.longitude != null) {
            results.push(record);
          }
        }
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.warn('Google place autocomplete failed:', err);
      }
    }
  }

  const deduped = dedupeLocationResults(results).slice(0, 6);
  locationAutocompleteCache.set(cacheKey, deduped);
  return deduped;
}

/* ===== ROBUST 3-TIER FORWARD GEOCODING ENGINE ===== */
export async function geocodeAddress(cityName) {
  if (!cityName || !cityName.trim()) return null;
  const cleanName = cityName.trim();
  const norm = cleanName.toLowerCase();

  if (INDIAN_CITIES_DB[norm]) {
    const item = INDIAN_CITIES_DB[norm];
    return { ...normalizePlaceRecord({ name: item.city, latitude: item.lat, longitude: item.lng, formattedAddress: `${item.city}, India`, city: item.city, country: 'India' }, item.city), source: 'search' };
  }

  for (const [key, item] of Object.entries(INDIAN_CITIES_DB)) {
    if (norm === key || (norm.length > 3 && key.includes(norm)) || (key.length > 3 && norm.includes(key))) {
      return { ...normalizePlaceRecord({ name: item.city, latitude: item.lat, longitude: item.lng, formattedAddress: `${item.city}, India`, city: item.city, country: 'India' }, item.city), source: 'search' };
    }
  }

  try {
    if (CONFIG.GOOGLE_API_KEY) {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cleanName)}&key=${CONFIG.GOOGLE_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const first = data.results[0];
        const addressComponents = first.address_components || [];
        const result = normalizePlaceRecord({
          name: first.formatted_address,
          latitude: first.geometry?.location?.lat,
          longitude: first.geometry?.location?.lng,
          formattedAddress: first.formatted_address,
          city: addressComponents.find((component) => component.types.includes('locality'))?.long_name || addressComponents.find((component) => component.types.includes('administrative_area_level_2'))?.long_name || cleanName,
          district: addressComponents.find((component) => component.types.includes('administrative_area_level_2'))?.long_name || '',
          state: addressComponents.find((component) => component.types.includes('administrative_area_level_1'))?.long_name || '',
          country: addressComponents.find((component) => component.types.includes('country'))?.long_name || '',
          postalCode: addressComponents.find((component) => component.types.includes('postal_code'))?.long_name || '',
          placeId: first.place_id || ''
        }, cleanName);

        return { ...result, source: 'search' };
      }
    }
  } catch (err) {
    console.warn('Google Geocode error, trying Open-Meteo geocode:', err);
  }

  try {
    const omUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanName)}&count=1&language=en&format=json`;
    const omRes = await fetch(omUrl);
    const omData = await omRes.json();
    if (omData && omData.results && omData.results.length > 0) {
      const r = omData.results[0];
      const result = normalizePlaceRecord({
        name: r.name,
        latitude: r.latitude,
        longitude: r.longitude,
        formattedAddress: `${r.name}, ${r.admin1 || r.country || 'India'}`,
        city: r.name,
        district: r.admin2 || '',
        state: r.admin1 || '',
        country: r.country || '',
        postalCode: r.postcode || ''
      }, cleanName);
      return { ...result, source: 'search' };
    }
  } catch (omErr) {
    console.warn('Open-Meteo geocoding error:', omErr);
  }

  try {
    const nomUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&q=${encodeURIComponent(cleanName)}`;
    const nomRes = await fetch(nomUrl, { headers: { 'User-Agent': 'WeatherGPT/1.0' } });
    if (nomRes.ok) {
      const nomData = await nomRes.json();
      const item = nomData?.[0];
      if (item) {
        const result = normalizePlaceRecord(item, cleanName);
        return { ...result, source: 'search' };
      }
    }
  } catch (nomErr) {
    console.warn('Nominatim geocode fallback error:', nomErr);
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
