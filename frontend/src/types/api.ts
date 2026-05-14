export type UserRole = "EMPLOYEE" | "MANAGER" | "ADMIN";

export type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN";
export type EmploymentStatus = "ACTIVE" | "ON_LEAVE" | "TERMINATED";

export interface DepartmentSummary {
  id: number;
  name: string;
  slug: string;
}

export interface DepartmentHead {
  id: number;
  first_name: string;
  last_name: string;
  job_title: string;
}

export interface Department extends DepartmentSummary {
  description: string | null;
  head_employee: DepartmentHead | null;
  employee_count: number;
  created_at: string;
}

export interface EmployeeSummary {
  id: number;
  first_name: string;
  last_name: string;
  job_title: string;
}

export interface Employee {
  id: number;
  user_id: number;
  email: string;
  role: UserRole;
  is_active: boolean;

  first_name: string;
  last_name: string;
  job_title: string;
  employment_type: EmploymentType;
  employment_status: EmploymentStatus;
  hire_date: string;
  termination_date: string | null;
  department: DepartmentSummary | null;
  manager: EmployeeSummary | null;

  date_of_birth: string | null;
  phone: string | null;
  address: string | null;
  salary: string | null;

  created_at: string;
  updated_at: string;
}

export interface EmployeeListResponse {
  items: Employee[];
  total: number;
  page: number;
  page_size: number;
}

export interface EmployeeCreated {
  employee: Employee;
  temporary_password: string;
}

export interface MeEmployee {
  id: number;
  first_name: string;
  last_name: string;
  job_title: string;
  department: DepartmentSummary | null;
}

export interface User {
  id: number;
  email: string;
  role: UserRole;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  employee: MeEmployee | null;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface LeaveType {
  id: number;
  name: string;
  slug: string;
  default_days_per_year: string;
  is_paid: boolean;
  is_active: boolean;
  created_at: string;
}

export interface LeaveBalance {
  id: number;
  employee_id: number;
  year: number;
  allocated_days: string;
  used_days: string;
  remaining_days: string;
  leave_type: LeaveType;
}

export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface DecidedBy {
  id: number;
  email: string;
}

export interface LeaveRequest {
  id: number;
  employee: EmployeeSummary;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days_count: number;
  reason: string;
  status: LeaveStatus;
  decided_at: string | null;
  decision_note: string | null;
  decided_by: DecidedBy | null;
  created_at: string;
}

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY" | "ON_LEAVE";

export interface AttendanceRecord {
  id: number;
  employee: EmployeeSummary;
  date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  hours_worked: string | null;
  status: AttendanceStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostedBy {
  id: number;
  email: string;
}

export interface Announcement {
  id: number;
  title: string;
  body: string;
  posted_at: string;
  posted_by: PostedBy;
}

export interface StatsByDepartment {
  department_id: number | null;
  department_name: string;
  count: number;
}

export interface HeadcountStats {
  total_active: number;
  by_status: Record<string, number>;
  by_department: StatsByDepartment[];
}

export interface TodayAttendanceStats {
  present: number;
  late: number;
  half_day: number;
  on_leave: number;
  not_checked_in: number;
}

export interface AdminStats {
  headcount: HeadcountStats;
  pending_leave_count: number;
  today_attendance: TodayAttendanceStats;
}

export interface AdminUser {
  id: number;
  email: string;
  role: UserRole;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  employee_name: string | null;
}
