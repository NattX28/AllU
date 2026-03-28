import api from "@/lib/axios"
import type {
  CourseResponse,
  CourseDetailResponse,
  CreateCourseRequest,
  UpdateCourseRequest,
  CreateSectionRequest,
  UpdateSectionRequest,
} from "@/types"

export const courseService = {
  getAll: () =>
    api
      .get<CourseResponse[]>("/courses")
      .then((r) => r.data || [])
      .catch(() => []),

  getById: (id: string) =>
    api.get<CourseDetailResponse>(`/courses/${id}`).then((r) => r.data),

  // Admin
  createCourse: (req: CreateCourseRequest) =>
    api.post("/admin/courses", req).then((r) => r.data),

  updateCourse: (id: string, req: UpdateCourseRequest) =>
    api.patch(`/admin/courses/${id}`, req).then((r) => r.data),

  deleteCourse: (id: string) =>
    api.delete(`/admin/courses/${id}`).then((r) => r.data),

  createSection: (req: CreateSectionRequest) =>
    api.post("/admin/courses/sections", req).then((r) => r.data),

  updateSection: (id: string, req: UpdateSectionRequest) =>
    api.patch(`/admin/courses/sections/${id}`, req).then((r) => r.data),

  deleteSection: (id: string) =>
    api.delete(`/admin/courses/sections/${id}`).then((r) => r.data),

  importCourses: (file: File, sheet = "Courses") => {
    const form = new FormData()
    form.append("file", file)
    return api
      .post(`/admin/import/courses?sheet=${sheet}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data)
  },
}
