import axios from "axios";
import { useAuthStore } from "../store/authStore";

const apiClient = axios.create({
  baseURL: "http://localhost:8080/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add token
apiClient.interceptors.request.use(
  (config) => {
    // Get token from store or localStorage directly as backup
    let token = useAuthStore.getState().token;
    
    // Sometimes store state might be stale or not rehydrated instantly
    if (!token) {
        const stored = localStorage.getItem('auth-storage');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed.state && parsed.state.token) {
                    token = parsed.state.token;
                }
            } catch (e) {
                console.error("Failed to parse auth storage", e);
            }
        }
    }

    if (token && typeof token === "string" && token.trim() !== "") {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle errors (optional)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);

export default apiClient;
