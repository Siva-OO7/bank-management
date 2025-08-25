import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://127.0.0.1:8000",
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
