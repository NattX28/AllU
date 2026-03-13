import api from "@/lib/axios"
import type { LoginRequest, LoginResponse } from "@/types"

export const authService = {
  login: (req: LoginRequest) =>
    api.post<LoginResponse>("/auth/login", req).then((r) => r.data),

  logout: () => api.post("/auth/logout"),

  refresh: () =>
    api.post<{ token: string }>("/auth/refresh").then((r) => r.data),
}
