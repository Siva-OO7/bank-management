import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.response.use(
  r => r,
  err => {
    const detail =
      err.response?.data?.detail ||
      err.response?.data?.message ||
      err.message;
    console.error("API error:", detail, err.response?.data);
    return Promise.reject(err);
  }
);

export default api;
