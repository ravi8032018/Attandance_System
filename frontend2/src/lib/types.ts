export interface Faculty {
  id?: string;
  _id?: string;
  faculty_id: string;
  email: string;
  first_name: string;
  last_name: string;
  department: string;
  designation?: string;
  status: string;
  role: string[];
  contact_number?: string;
  dob?: string;
  joining_date?: string;
  photo_url?: string;
}

export interface Student {
  id?: string;
  _id?: string;
  registration_no: string;
  email: string;
  first_name: string;
  last_name: string;
  course: string;
  semester: string | number;
  department: string;
  status: string;
  roll_number?: string;
  guardian_email?: string;
  contact_number?: string;
  photo_url?: string;
}

export interface Subject {
  subject_code: string;
  subject_name: string;
  semester?: string | number;
  department?: string;
  Faculty_id?: string;
}

export interface CurriculumItem {
  id?: string;
  department: string;
  semester: string | number;
  course?: string;
  subjects: Subject[];
}

export interface AttendanceRecord {
  registration_no: string;
  status: "present" | "absent" | "excused";
}

export interface StudentAttendanceReport {
  subject_code: string;
  total_classes: number;
  present_count: number;
  absent_count: number;
  excused_count: number;
  attendance_percentage: number;
  daily_records?: {
    date: string;
    status: string;
    subject_code?: string;
  }[];
}
