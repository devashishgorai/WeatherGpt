'use client';

import { useState, useCallback, useEffect } from 'react';
import { reverseGeocodeCoords } from '@/lib/geocoding';

export function useGeolocation(initialCity = 'New Delhi', initialLat = 28.6139, initialLng = 77.2090, onLocationDetected) {
  const [currentLoc, setCurrentLoc] = useState({
    city: initialCity,
    lat: initialLat,
    lng: initialLng,
    isGps: false,
    detail: 'National Capital Territory'
  });

  const [gpsState, setGpsState] = useState('prompt');
  const [isDetectingLoc, setIsDetectingLoc] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!navigator.geolocation) {
        setGpsState('unsupported');
      }
    }
  }, []);

  const runGpsDetect = useCallback(async (showToast) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsState('unsupported');
      if (onLocationDetected) onLocationDetected(currentLoc.lat, currentLoc.lng, currentLoc.city);
      return;
    }

    setGpsState('waiting');
    setIsDetectingLoc(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const geoInfo = await reverseGeocodeCoords(latitude, longitude);
        const cityName = typeof geoInfo === 'string' ? geoInfo : (geoInfo?.city || 'Your Location');
        const stateOrDesc = geoInfo?.subdivision || '';

        const newLoc = {
          city: cityName,
          lat: latitude,
          lng: longitude,
          isGps: true,
          detail: stateOrDesc
        };

        setCurrentLoc(newLoc);
        setGpsState('granted');
        setIsDetectingLoc(false);

        if (onLocationDetected) {
          onLocationDetected(latitude, longitude, cityName);
        }

        if (showToast) {
          showToast(`📍 GPS Detected: ${cityName}${stateOrDesc ? ' (' + stateOrDesc + ')' : ''}`);
        }
      },
      (err) => {
        console.warn('GPS auto-detect failed/denied:', err);
        setGpsState('denied');
        setIsDetectingLoc(false);

        if (onLocationDetected) {
          onLocationDetected(currentLoc.lat, currentLoc.lng, currentLoc.city);
        }

        if (showToast && err.code !== 1) {
          showToast('⚠️ GPS unavailable. Showing New Delhi by default.');
        }
      },
      { timeout: 12000, maximumAge: 300000, enableHighAccuracy: true }
    );
  }, [currentLoc, onLocationDetected]);

  const handleSkipGps = useCallback(() => {
    setGpsState('denied');
    if (onLocationDetected) {
      onLocationDetected(currentLoc.lat, currentLoc.lng, currentLoc.city);
    }
  }, [currentLoc, onLocationDetected]);

  return {
    currentLoc,
    setCurrentLoc,
    gpsState,
    setGpsState,
    isDetectingLoc,
    runGpsDetect,
    handleSkipGps
  };
}
