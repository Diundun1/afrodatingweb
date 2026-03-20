/**
 * storage.js
 * Unified key-value storage that works on both web and native.
 * - Web: uses localStorage (synchronous, no await needed but we wrap async for consistency)
 * - Native: uses AsyncStorage
 */
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const storage = {
    async getItem(key) {
        if (Platform.OS === "web") {
            try {
                return localStorage.getItem(key);
            } catch {
                return null;
            }
        }
        return AsyncStorage.getItem(key);
    },

    async setItem(key, value) {
        if (Platform.OS === "web") {
            try {
                localStorage.setItem(key, value);
            } catch { }
            return;
        }
        return AsyncStorage.setItem(key, value);
    },

    async removeItem(key) {
        if (Platform.OS === "web") {
            try {
                localStorage.removeItem(key);
            } catch { }
            return;
        }
        return AsyncStorage.removeItem(key);
    },

    async multiRemove(keys) {
        if (Platform.OS === "web") {
            try {
                keys.forEach((k) => localStorage.removeItem(k));
            } catch { }
            return;
        }
        return AsyncStorage.multiRemove(keys);
    },
};

export default storage;
