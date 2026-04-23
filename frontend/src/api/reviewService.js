import api from './axiosConfig';

export const fetchVenueReviews = async (venueId) => {
  const { data } = await api.get(`/reviews/venue/${venueId}`);
  return data;
};

export const fetchReviewStats = async () => {
  const { data } = await api.get('/reviews/stats');
  return data;
};

export const fetchMyReviews = async () => {
  const { data } = await api.get('/reviews/my');
  return data;
};

export const fetchAllReviews = async () => {
  const { data } = await api.get('/reviews');
  return data;
};

export const createReview = async (payload) => {
  const { data } = await api.post('/reviews', payload);
  return data;
};

export const updateReview = async (id, payload) => {
  const { data } = await api.put(`/reviews/${id}`, payload);
  return data;
};

export const deleteReview = async (id) => {
  const { data } = await api.delete(`/reviews/${id}`);
  return data;
};

export const adminDeleteReview = async (id) => {
  const { data } = await api.delete(`/reviews/admin/${id}`);
  return data;
};
