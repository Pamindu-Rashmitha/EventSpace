import api from './axiosConfig';

export const checkAvailability = async ({ venueId, startDate, endDate }) => {
  const { data } = await api.get('/bookings/availability', {
    params: { venueId, startDate, endDate },
  });
  return data;
};

export const createBooking = async (payload) => {
  const { data } = await api.post('/bookings', payload);
  return data;
};

export const fetchMyBookings = async () => {
  const { data } = await api.get('/bookings/my');
  return data;
};

export const fetchAllBookings = async (params = {}) => {
  const { data } = await api.get('/bookings', { params });
  return data;
};

export const fetchBooking = async (id) => {
  const { data } = await api.get(`/bookings/${id}`);
  return data;
};

export const updateBookingStatus = async (id, status) => {
  const { data } = await api.put(`/bookings/${id}/status`, { status });
  return data;
};

export const cancelBooking = async (id) => {
  const { data } = await api.put(`/bookings/${id}/cancel`);
  return data;
};

export const processPayment = async (bookingId, paymentData) => {
  const { data } = await api.post(`/bookings/${bookingId}/pay`, paymentData);
  return data;
};

export const deleteBooking = async (id) => {
  const { data } = await api.delete(`/bookings/${id}`);
  return data;
};
