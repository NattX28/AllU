import api from "@/lib/axios"
import type {
  EnrollmentPeriodResponse,
  CreateEnrollmentPeriodRequest,
  UpdateEnrollmentPeriodRequest,
} from "@/types"

export const periodService = {
  getAll: () =>
    api
      .get<EnrollmentPeriodResponse[]>("/admin/enrollment-periods")
      .then((r) => r.data || []),

  create: (req: CreateEnrollmentPeriodRequest) =>
    api
      .post<EnrollmentPeriodResponse>("/admin/enrollment-periods", req)
      .then((r) => r.data),

  update: (id: string, req: UpdateEnrollmentPeriodRequest) =>
    api
      .patch<EnrollmentPeriodResponse>(`/admin/enrollment-periods/${id}`, req)
      .then((r) => r.data),
}
