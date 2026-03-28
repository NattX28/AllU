import api from "@/lib/axios"
import type {
  CheckSeatsResponse,
  ConfirmEnrollResponse,
  TimetableResponse,
  EnrollmentHistoryResponse,
  EnrollmentPeriodResponse,
} from "@/types"

export const enrollService = {
  // ─── Seat Check ──────────────────────────────────────────
  checkSeats: (sectionIds: string[]) =>
    api
      .get<CheckSeatsResponse[]>("/enroll/check-seats", {
        params: { ids: sectionIds.join(",") },
      })
      .then((r) => r.data),

  // ─── Confirm (first time) ────────────────────────────────
  confirm: (sectionIds: string[]) =>
    api
      .post<ConfirmEnrollResponse>("/enroll/confirm", {
        section_ids: sectionIds,
      })
      .then((r) => r.data),

  // ─── Update (already confirmed) ──────────────────────────
  update: (sectionIds: string[]) =>
    api
      .patch("/enroll/update", { section_ids: sectionIds })
      .then((r) => r.data),

  // ─── Withdraw (by enrollment_id) ─────────────────────────
  withdraw: (enrollmentId: string) =>
    api
      .delete("/enroll/withdraw", { params: { enrollment_id: enrollmentId } })
      .then((r) => r.data),

  // ─── Active Enrollment Period ─────────────────────────────
  getActivePeriod: (): Promise<EnrollmentPeriodResponse | null> =>
    api
      .get<{
        data: EnrollmentPeriodResponse | null
      }>("/enrollment-periods/active")
      .then((r) => r.data.data),

  // ─── Timetable (schedule page) ────────────────────────────
  getSchedule: (
    semester: number,
    academicYear: number,
  ): Promise<TimetableResponse> =>
    api
      .get<TimetableResponse>("/enroll/schedule", {
        params: { semester, academic_year: academicYear },
      })
      .then((r) => r.data),

  // ─── History (grades/registration result page) ────────────
  getHistory: (
    semester?: number,
    academicYear?: number,
  ): Promise<EnrollmentHistoryResponse> =>
    api
      .get<EnrollmentHistoryResponse>("/enroll/history", {
        params: {
          ...(semester !== undefined && { semester }),
          ...(academicYear !== undefined && { academic_year: academicYear }),
        },
      })
      .then((r) => r.data),
}
