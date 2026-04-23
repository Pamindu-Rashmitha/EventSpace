import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const extra =
  Constants.expoConfig?.extra ||
  Constants.manifest?.extra ||
  {};

export const API_URL =
  extra.API_URL || process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.8:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
});

api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // ignore storage read errors
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Network error. Please try again.';
    return Promise.reject(new Error(message));
  }
);

export default api;
