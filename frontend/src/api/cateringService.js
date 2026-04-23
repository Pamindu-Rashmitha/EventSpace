import api from './axiosConfig';

const buildCateringFormData = (payload = {}, images = []) => {
  const form = new FormData();

  const simple = [
    'name',
    'description',
    'cuisine',
    'mealType',
    'pricePerPerson',
    'minServings',
    'isActive',
  ];
  simple.forEach((key) => {
    if (payload[key] !== undefined && payload[key] !== null) {
      form.append(key, String(payload[key]));
    }
  });

  if (payload.menuItems !== undefined) {
    const items = Array.isArray(payload.menuItems)
      ? payload.menuItems
      : String(payload.menuItems).split(',').map((i) => i.trim()).filter(Boolean);
    form.append('menuItems', JSON.stringify(items));
  }

  if (payload.venues !== undefined) {
    form.append('venues', JSON.stringify(payload.venues));
  }

  images.forEach((img, idx) => {
    if (!img?.uri) return;
    const filename = img.fileName || img.uri.split('/').pop() || `catering_${idx}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const ext = match ? match[1].toLowerCase() : 'jpg';
    form.append('images', {
      uri: img.uri,
      name: filename,
      type: img.mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    });
  });

  return form;
};

export const fetchCatering = async (params = {}) => {
  const { data } = await api.get('/catering', { params });
  return data;
};

export const fetchCateringItem = async (id) => {
  const { data } = await api.get(`/catering/${id}`);
  return data;
};

export const createCatering = async (payload, images = []) => {
  const form = buildCateringFormData(payload, images);
  const { data } = await api.post('/catering', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const updateCatering = async (id, payload, images = []) => {
  const form = buildCateringFormData(payload, images);
  const { data } = await api.put(`/catering/${id}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const deleteCatering = async (id) => {
  const { data } = await api.delete(`/catering/${id}`);
  return data;
};

export const removeCateringPhoto = async (cateringId, photoId) => {
  const { data } = await api.delete(`/catering/${cateringId}/photos/${photoId}`);
  return data;
};
