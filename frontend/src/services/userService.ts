import api from "@/lib/axios"
import type {
  GetMeResponse,
  UpdateMeRequest,
  UserFilterQuery,
  UserListResponse,
  CreateUserRequest,
  UpdateUserAdminRequest,
} from "@/types"

export const userService = {
  getMe: () => api.get<GetMeResponse>("/user/me").then((r) => r.data),

  updateMe: (req: UpdateMeRequest) =>
    api.patch("/user/me", req).then((r) => r.data),

  // Admin
  getAllUsers: (filter: UserFilterQuery) =>
    api
      .get<UserListResponse>("/admin/users", { params: filter })
      .then((r) => r.data),

  createUser: (req: CreateUserRequest) =>
    api.post("/admin/users", req).then((r) => r.data),

  updateUser: (id: string, req: UpdateUserAdminRequest) =>
    api.patch(`/admin/users/${id}`, req).then((r) => r.data),

  deleteUser: (id: string) =>
    api.delete(`/admin/users/${id}`).then((r) => r.data),

  importUsers: (file: File, sheet = "Users") => {
    const form = new FormData()
    form.append("file", file)
    return api
      .post(`/admin/import/users?sheet=${sheet}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data)
  },
}
