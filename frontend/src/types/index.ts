export type Role = "student" | "professor" | "admin"

// ─── Auth ────────────────────────────────────────────────────
export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  user_id: string
  role: Role
  token: string
}

export interface AuthState {
  userID: string | null
  role: Role | null
  accessToken: string | null
  profileID: string | null
}

// ─── User ────────────────────────────────────────────────────
export interface StudentDetail {
  student_id: string
  entry_year: number
  year: number
  address: string
  birthday: string
  gender: string
  faculty: string
  major: string
  gpax: number
}

export interface ProfessorDetail {
  professor_id: string
  faculty: string
  department: string
  address: string
  birthday: string
  gender: string
}

export interface GetMeResponse {
  id: string
  username: string
  name: string
  role: Role
  student?: StudentDetail
  professor?: ProfessorDetail
}

export interface UpdateMeRequest {
  name?: string
  birthday?: string
  address?: string
  gender?: string
  year?: number
  faculty?: string
  major?: string
}

export interface UserFilterQuery {
  page?: number
  limit?: number
  role?: Role
  search?: string
  gender?: string
  entry_year?: number
  start_date?: string
  min_gpax?: number
  max_gpax?: number
  end_date?: string
  year?: number
  faculty?: string
  major?: string
  course_id?: string
  sort_by?: string
  order?: string
}

export interface UserListResponse {
  total: number
  data: GetMeResponse[]
}

export interface CreateUserRequest {
  username: string
  email: string
  password: string
  name: string
  role: Role
  address: string
  birthday: string
  gender: string
  is_active?: boolean
  must_change_password?: boolean
  // Student
  student_id?: string
  entry_year?: number
  year?: number
  faculty?: string
  major?: string
  // Professor
  professor_id?: string
  department?: string
}

export interface UpdateUserAdminRequest {
  name?: string
  role?: Role
  is_active?: boolean
  must_change_password?: boolean
  address?: string
  birthday?: string
  gender?: string
  // Student
  student_id?: string
  entry_year?: number
  year?: number
  faculty?: string
  major?: string
  gpax?: number
  // Professor
  professor_id?: string
  department?: string
}

export interface EnrolledCourseResponse {
  enrollment_id: string
  course_id: string
  course_name: string
  section_num: number
  status: string
  study_time: string
  deadline: string
  semester: number
  academic_year: number
  final_score?: number
  midterm_score?: number
  attendance_score?: number
  assignment_score?: number
  total_score: number
  grade: string
}

// ─── Course ──────────────────────────────────────────────────
export interface PrereqResponse {
  id: string
  name_en: string
  name_th: string
}

export interface SectionResponse {
  id: string
  section_num: number
  semester: number
  academic_year: number
  capacity: number
  available: number
  study_time: string
  professor_name: string
}

export interface CourseResponse {
  id: string
  name_th: string
  name_en: string
  credits: number
  sections: SectionResponse[]
}

export interface CourseDetailResponse {
  id: string
  name_th: string
  name_en: string
  credits: number
  description: string
  category: string
  prerequisites: PrereqResponse[]
  sections: SectionResponse[]
}

export interface CreateCourseRequest {
  id: string
  name_th: string
  name_en: string
  credits: number
  category: string
  max_entry_year?: number
  lecture_hours?: number
  lab_hours?: number
  self_study_hours?: number
  prerequisite_ids?: string[]
}

export interface CreateSectionRequest {
  course_id: string
  section_num: number
  semester: number
  academic_year: number
  capacity: number
  study_time: string
  deadline: string
  professor_id: string
}

export interface UpdateCourseRequest {
  name_th?: string
  name_en?: string
  credits?: number
  category?: string
  max_entry_year?: number
  lecture_hours?: number
  lab_hours?: number
  self_study_hours?: number
  prerequisite_ids?: string[]
}

export interface UpdateSectionRequest {
  section_num?: number
  capacity?: number
  study_time?: string
  deadline?: string
  professor_id?: string
}

// ─── Enroll ──────────────────────────────────────────────────
export interface CheckSeatsResponse {
  section_id: string
  available: number
  is_full: boolean
}

export interface ConfirmEnrollResponse {
  message: string
  enrolled_ids: string[]
  total_credits: number
}

// ─── Grade ───────────────────────────────────────────────────
export interface ProfessorSectionResponse {
  section_id: string
  course_id: string
  course_name: string
  section_num: number
  total_student: number
  semester: number
  academic_year: number
}

export interface StudentGradeItem {
  enrollment_id: string
  student_id: string
  student_name: string
  attendance_score?: number
  assignment_score?: number
  midterm_score?: number
  final_score?: number
  total_score: number
  grade: string
  status: string
}

export interface ClassListResponse {
  section_id: string
  course_id: string
  section_num: number
  total_student: number
  students: StudentGradeItem[]
}

export interface GradeDetails {
  course_id: string
  course_name: string
  credits: number
  attendance?: number
  assignment?: number
  midterm?: number
  final?: number
  total: number
  grade: string
}

export interface MyGradesResponse {
  semester: number
  academic_year: number
  term_gpa: number
  total_credits: number
  courses: GradeDetails[]
}
