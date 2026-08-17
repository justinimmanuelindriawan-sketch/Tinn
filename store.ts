import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppState, Student, Teacher, Settings } from './types';
import { normalizeClassName } from './lib/utils';

const cleanStudentClass = (student: Student): Student => ({
  ...student,
  class: student.class ? (normalizeClassName(student.class) || '1A') : '1A',
});

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      students: [],
      teachers: [],
      settings: { scriptUrl: '', appName: 'EduConnect', folderId: '', tahunPelajaran: '2025/2026', schoolName: 'SDN Citapen' },
      isLoading: false,
      error: null,
      lastSyncedAt: null,
      isSyncingGlobal: false,
      login: () => set({ isAuthenticated: true }),
      logout: () => set({ isAuthenticated: false, students: [], teachers: [] }),
      setStudents: (students) => set({ students: students.map(cleanStudentClass), error: null }),
      addStudent: (student) => set((state) => ({ students: [...state.students, cleanStudentClass(student)] })),
      updateStudent: (id, data) =>
        set((state) => ({
          students: state.students.map((s) => (s.id === id ? cleanStudentClass({ ...s, ...data }) : s)),
        })),
      updateStudentsBulk: (updates) =>
        set((state) => {
          const updateMap = new Map(updates.map((u) => [u.id, u.data]));
          return {
            students: state.students.map((s) =>
              updateMap.has(s.id) ? cleanStudentClass({ ...s, ...updateMap.get(s.id) }) : s
            ),
          };
        }),
      deleteStudent: (id) =>
        set((state) => ({
          students: state.students.filter((s) => s.id !== id),
        })),
      setTeachers: (teachers) => set({ teachers, error: null }),
      addTeacher: (teacher) => set((state) => ({ teachers: [...state.teachers, teacher] })),
      updateTeacher: (id, data) =>
        set((state) => ({
          teachers: state.teachers.map((t) => (t.id === id ? { ...t, ...data } : t)),
        })),
      deleteTeacher: (id) =>
        set((state) => ({
          teachers: state.teachers.filter((t) => t.id !== id),
        })),
      setSettings: (settings) => set({ settings }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
      setIsSyncingGlobal: (isSyncingGlobal) => set({ isSyncingGlobal }),
    }),
    {
      name: 'sis-storage',
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.students) && state.students.length > 0) {
          const hasUncleaned = state.students.some(s => s.class && s.class !== normalizeClassName(s.class));
          if (hasUncleaned) {
            state.students = state.students.map(cleanStudentClass);
          }
        }
      },
    }
  )
);
