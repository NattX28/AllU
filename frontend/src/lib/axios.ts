import axios from "axios"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api"

// In-memory token — set by AuthContext after login/refresh
let _accessToken: string | null = null

export const setAccessToken = (token: string | null) => {
  _accessToken = token
}
export const getAccessToken = () => _accessToken

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Send HttpOnly cookie (refresh_token) every request
})

// แนบ token ทุก request
api.interceptors.request.use((config) => {
  if (_accessToken) config.headers.Authorization = `Bearer ${_accessToken}`
  return config
})

// If get a 401 error, try refreshing once and then retrying the same request.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    const is401 = error.response?.status === 401
    const isRefreshUrl = original?.url?.includes("/auth/refresh")
    const alreadyRetried = original?._retry

    if (!is401 || isRefreshUrl || alreadyRetried) {
      return Promise.reject(error)
    }

    original._retry = true

    try {
      const { data } = await axios.post<{ token: string }>(
        `${BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      )
      setAccessToken(data.token)
      original.headers.Authorization = `Bearer ${data.token}`
      return api(original)
    } catch {
      setAccessToken(null)
      if (typeof window !== "undefined") window.location.href = "/login"
      return Promise.reject(error)
    }
  },
)

export default api
