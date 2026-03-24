import axios from "axios";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.concat("/api") ??
  "http://localhost:5000/api";

let _accessToken: string | null = null;
export const setAccessToken = (token: string | null) => {
  _accessToken = token;
};
export const getAccessToken = () => _accessToken;

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (_accessToken) config.headers.Authorization = `Bearer ${_accessToken}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    const isAuthRoute = original?.url?.includes("/auth/");
    const alreadyRetried = original?._retry;

    if (error.response?.status !== 401 || isAuthRoute || alreadyRetried) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      const { data } = await axios.post<{ token: string }>(
        `${BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      );
      setAccessToken(data.token);
      original.headers.Authorization = `Bearer ${data.token}`;
      return api(original);
    } catch {
      setAccessToken(null);
      if (typeof window !== "undefined") window.location.href = "/login";
      return Promise.reject(error);
    }
  },
);

export default api;
