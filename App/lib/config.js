// App/lib/config.js
import { Platform } from 'react-native';

/**
 * Centralized API configuration.
 * Using constants to avoid hardcoding production URLs in multiple files.
 */
const PRODUCTION_URL = "https://backend-afrodate-8q6k.onrender.com";
const LOCAL_URL = "http://localhost:5000";

// Expo defines __DEV__ globally.
export const BASE_URL = __DEV__ ? LOCAL_URL : PRODUCTION_URL;

export const API_URL = `${BASE_URL}/api/v1`;
export const SOCKET_URL = `${BASE_URL}/messaging`;
export const NOTIFICATION_SOCKET_URL = `${BASE_URL}/notifications`;

export default {
    BASE_URL,
    API_URL,
    SOCKET_URL,
    NOTIFICATION_SOCKET_URL
};
