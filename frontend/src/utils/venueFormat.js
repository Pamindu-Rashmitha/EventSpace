export function timeStringToDate(hhmm) {
  const p = (hhmm && String(hhmm).match(/^(\d{1,2}):(\d{2})/)) || [null, '9', '0'];
  return new Date(2000, 0, 1, Math.min(23, Number(p[1])), Math.min(59, Number(p[2])), 0, 0);
}

export function dateToTimeString(d) {
  if (!d) return '09:00';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function to12h(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return '';
  const p = hhmm.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!p) return hhmm;
  const d = new Date(2000, 0, 1, Math.min(23, Number(p[1])), Math.min(59, Number(p[2])), 0, 0);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}


export function formatVenueOpenHours(venue) {
  const o = venue?.openTime || '09:00';
  const c = venue?.closeTime || '18:00';
  return `${to12h(o)} – ${to12h(c)}`;
}

export const bookingTypeLabel = (t) => (t === 'half_day' ? 'Half day' : 'Full day');

export function formatVenueTypes(venue) {
  if (!venue) return '';
  if (Array.isArray(venue.types) && venue.types.length) {
    return venue.types.join(' · ');
  }
  if (venue.type) return String(venue.type);
  return 'Venue';
}

export function formatVenueAddress(location) {
  if (!location) return '';
  const parts = [location.address, location.city, location.state, location.country]
    .map((p) => (p && String(p).trim()) || '')
    .filter((p) => p && p.toUpperCase() !== 'N/A');
  return parts.join(', ');
}

export function venueMapsSearchUrl(location) {
  const q = formatVenueAddress(location);
  if (!q) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
