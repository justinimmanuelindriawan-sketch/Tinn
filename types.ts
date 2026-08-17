export interface Student {
  id: string;
  nis: string;
  nisn?: string;
  name: string;
  class: string; // 1A-6C
  gender: 'L' | 'P';
  pob?: string;
  dob: string;
  address: string;
  parentName: string;
  status: 'Aktif' | 'Lulus' | 'Pindah' | 'Keluar';
  sekolahAsal?: string;
  sekolahTujuan?: string;
  tanggalMutasi?: string;
  ijazahNo?: string;
  ijazahUrl?: string;
  berkasUrl?: string;
  kkUrl?: string;
  akteUrl?: string;
  fotoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Teacher {
  id: string;
  nip: string;
  name: string;
  gender: 'L' | 'P';
  class: string; // Walikelas kelas berapa, e.g. "1A", "None"
  phone: string;
  email: string;
  status: 'Aktif' | 'Nonaktif';
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  scriptUrl: string;
  folderId?: string;
  appName?: string;
  adminUsername?: string;
  adminPassword?: string;
  schoolLogoUrl?: string;
  tahunPelajaran?: string;
  schoolName?: string;
}

export interface AppState {
  isAuthenticated: boolean;
  students: Student[];
  teachers: Teacher[];
  settings: Settings;
  isLoading: boolean;
  error: string | null;
  login: () => void;
  logout: () => void;
  setStudents: (students: Student[]) => void;
  addStudent: (student: Student) => void;
  updateStudent: (id: string, data: Partial<Student>) => void;
  updateStudentsBulk: (updates: {id: string, data: Partial<Student>}[]) => void;
  deleteStudent: (id: string) => void;
  setTeachers: (teachers: Teacher[]) => void;
  addTeacher: (teacher: Teacher) => void;
  updateTeacher: (id: string, data: Partial<Teacher>) => void;
  deleteTeacher: (id: string) => void;
  setSettings: (settings: Settings) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  lastSyncedAt?: string | null;
  isSyncingGlobal?: boolean;
  setLastSyncedAt: (time: string | null) => void;
  setIsSyncingGlobal: (syncing: boolean) => void;
}

