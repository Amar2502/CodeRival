import axios from "axios";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 429) {
      const serverMessage = error.response.data?.message;
      const retryAfter = error.response.data?.retryAfter;

      let toastMessage = serverMessage || "Rate limit reached. Please try again after some time.";
      if (retryAfter && typeof retryAfter === "number") {
        toastMessage = `${toastMessage} (Retry in ${retryAfter}s)`;
      }

      toast.warning(toastMessage, {
        id: `rate-limit-toast-${error.config?.url || 'global'}`,
        duration: 5000,
        description: "Rate limit reached. Please wait a moment before trying again.",
      });
    }
    return Promise.reject(error);
  }
);