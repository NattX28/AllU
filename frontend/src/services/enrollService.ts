import api from "@/lib/axios"
import type {
  CheckSeatsResponse,
  ConfirmEnrollResponse,
  EnrolledCourseResponse,
} from "@/types"

export const enrollService = {
  checkSeats: (sectionIds: string[]) =>
    api
      .get<CheckSeatsResponse[]>("/enroll/check-seats", {
        params: { ids: sectionIds.join(",") },
      })
      .then((r) => r.data),

  confirm: (sectionIds: string[]) =>
    api
      .post<ConfirmEnrollResponse>("/enroll/confirm", {
        section_ids: sectionIds,
      })
      .then((r) => r.data),

  updateSchedule: (newSectionIds: string[]) =>
    api
      .patch("/enroll/update-schedule", { new_section_ids: newSectionIds })
      .then((r) => r.data),

  withdraw: (sectionId: string) =>
    api
      .delete("/enroll/withdraw", { data: { section_id: sectionId } })
      .then((r) => r.data),

  getMyEnrollments: (mode: "all" | "current" | "history" = "all") =>
    api
      .get<EnrolledCourseResponse[]>("/enroll/my", { params: { mode } })
      .then((r) => r.data),
}
