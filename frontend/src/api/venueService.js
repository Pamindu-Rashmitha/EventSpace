import api from './axiosConfig';

const buildVenueFormData = (payload = {}, photos = []) => {
  const form = new FormData();

  const simple = [
    'name',
    'description',
    'capacity',
    'pricePerDay',
    'pricePerHalfDay',
    'openTime',
    'closeTime',
    'isActive',
  ];
  simple.forEach((key) => {
    if (payload[key] !== undefined && payload[key] !== null) {
      form.append(key, String(payload[key]));
    }
  });
  if (payload.types != null && Array.isArray(payload.types) && payload.types.length) {
    form.append('types', JSON.stringify(payload.types));
  }

  if (payload.location) {
    form.append('location', JSON.stringify(payload.location));
  }
  if (payload.amenities) {
    const amenities = Array.isArray(payload.amenities)
      ? payload.amenities
      : String(payload.amenities).split(',').map((a) => a.trim()).filter(Boolean);
    form.append('amenities', JSON.stringify(amenities));
  }

  photos.forEach((photo, idx) => {
    if (!photo?.uri) return;
    const filename = photo.fileName || photo.uri.split('/').pop() || `photo_${idx}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const ext = match ? match[1].toLowerCase() : 'jpg';
    form.append('photos', {
      uri: photo.uri,
      name: filename,
      type: photo.mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    });
  });

  return form;
};

export const fetchVenues = async (params = {}) => {
  const { data } = await api.get('/venues', { params });
  return data;
};

export const fetchVenue = async (id) => {
  const { data } = await api.get(`/venues/${id}`);
  return data;
};

export const createVenue = async (payload, photos = []) => {
  const form = buildVenueFormData(payload, photos);
  const { data } = await api.post('/venues', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const updateVenue = async (id, payload, photos = []) => {
  const form = buildVenueFormData(payload, photos);
  const { data } = await api.put(`/venues/${id}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const deleteVenue = async (id) => {
  const { data } = await api.delete(`/venues/${id}`);
  return data;
};

export const removeVenuePhoto = async (venueId, photoId) => {
  const { data } = await api.delete(`/venues/${venueId}/photos/${photoId}`);
  return data;
};
