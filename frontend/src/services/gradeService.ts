import api from "@/lib/axios"
import type {
  ProfessorSectionResponse,
  ClassListResponse,
  StudentGradeItem,
  MyGradesResponse,
} from "@/types"

export const gradeService = {
  // Professor
  getProfessorSections: () =>
    api
      .get<ProfessorSectionResponse[]>("/professor/sections")
      .then((r) => r.data),

  getClassList: (sectionId: string) =>
    api
      .get<ClassListResponse>(`/professor/sections/${sectionId}/students`)
      .then((r) => r.data),

  submitGrades: (sectionId: string, grades: StudentGradeItem[]) =>
    api
      .post("/professor/grades", { section_id: sectionId, grades })
      .then((r) => r.data),

  // Student
  getMyGrades: (semester = 0, year = 0) =>
    api
      .get<MyGradesResponse[]>("/grades/my", { params: { semester, year } })
      .then((r) => r.data),
}
