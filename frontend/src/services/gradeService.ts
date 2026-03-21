import api from "@/lib/axios";
import type {
  ProfessorSectionResponse,
  ClassListResponse,
  StudentGradeItem,
  MyGradesResponse,
  CommitGradeResponse,
} from "@/types";

export const gradeService = {
  // ─── Professor ───────────────────────────────────────────

  getProfessorSections: () =>
    api
      .get<ProfessorSectionResponse[]>("/professor/sections")
      .then((r) => r.data),

  getClassList: (sectionId: string) =>
    api
      .get<ClassListResponse>(`/professor/sections/${sectionId}/students`)
      .then((r) => r.data),

  /** บันทึกคะแนนย่อย — ส่งเฉพาะ field คะแนนดิบ backend คำนวณ total เอง */
  saveScores: (sectionId: string, grades: StudentGradeItem[]) =>
    api
      .post<{ message: string }>("/professor/grades", {
        section_id: sectionId,
        grades: grades.map((g) => ({
          enrollment_id: g.enrollment_id,
          student_id: g.student_id,
          student_name: g.student_name,
          attendance_score: g.attendance_score, // number | undefined — ตรงกับ type
          assignment_score: g.assignment_score,
          midterm_score: g.midterm_score,
          final_score: g.final_score,
          total_score: 0, // backend คำนวณเอง
          grade: "", // backend set เอง
          status: g.status,
        })),
      })
      .then((r) => r.data),

  /**
   * ตัดเกรด
   * @param commitAll  true = ทั้งห้อง, false = เฉพาะ enrollmentIds
   */
  commitGrades: (
    sectionId: string,
    commitAll: boolean,
    enrollmentIds?: string[],
  ) =>
    api
      .post<CommitGradeResponse>("/professor/grades/commit", {
        section_id: sectionId,
        commit_all: commitAll,
        enrollment_ids: enrollmentIds ?? [],
      })
      .then((r) => r.data),

  // ─── Student ─────────────────────────────────────────────

  getMyGrades: (semester = 0, year = 0) =>
    api
      .get<MyGradesResponse[]>("/grades/my", { params: { semester, year } })
      .then((r) => r.data),
};
