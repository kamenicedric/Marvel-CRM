import type { LatLng } from './geo';

export const ATTENDANCE_ZONE_CENTER: LatLng = {
  lat: 4.091933280363106,
  lng: 9.741281074488526,
};

export const ATTENDANCE_ZONE_RADIUS_METERS = 50;

// Late after this time (local) => "EN_RETARD"
export const ATTENDANCE_LATE_AFTER = { hour: 9, minute: 0 };

