import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId() {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

export const CLASSES = [];
for (let i = 1; i <= 6; i++) {
  CLASSES.push(`${i}A`, `${i}B`, `${i}C`);
}

export const STATUSES = ["Aktif", "Lulus", "Pindah", "Keluar"]; // Pindah represents mutasi

export function standardizeDate(value: any): string {
  if (value === null || value === undefined) return '';

  // 1. If value is a JavaScript Date object
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return '';
    // If created as UTC midnight or near UTC midnight
    if (value.getUTCHours() === 0 && value.getUTCMinutes() === 0) {
      const y = value.getUTCFullYear();
      const m = String(value.getUTCMonth() + 1).padStart(2, '0');
      const d = String(value.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    // Otherwise use local date getters
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 2. If it's a number or numeric string (Excel serial number e.g. 43620)
  if (
    typeof value === 'number' ||
    (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value.trim()) && Number(value) > 1000 && Number(value) < 100000)
  ) {
    const num = Number(value);
    // Excel base epoch: Dec 30, 1899 (compensates for 1900 leap year bug)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + Math.round(num) * 24 * 60 * 60 * 1000);
    if (!isNaN(date.getTime())) {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  let str = String(value).trim();
  if (!str || str === '-') return '';

  // 3. String matches YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD (e.g. 2019-06-04)
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 4. String matches DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY (Indonesian format e.g. 04/06/2019)
  const dmYMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (dmYMatch) {
    const day = dmYMatch[1].padStart(2, '0');
    const month = dmYMatch[2].padStart(2, '0');
    let year = dmYMatch[3];
    if (year.length === 2) {
      const yNum = parseInt(year, 10);
      year = yNum > 30 ? `19${year}` : `20${year}`;
    }
    return `${year}-${month}-${day}`;
  }

  // 5. Handle ISO timestamp string with T e.g. "2019-06-04T00:00:00.000Z"
  if (str.includes('T')) {
    const datePart = str.split('T')[0];
    const ymd = datePart.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (ymd) {
      return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
    }
  }

  // 6. Fallback native date parsing
  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  } catch (e) {
    // fallback
  }

  return str;
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const cleanDate = standardizeDate(dateString);
  if (!cleanDate) return String(dateString);

  try {
    const match = cleanDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      // Create local date object explicitly to avoid UTC timezone offset shifts
      const d = new Date(year, month, day);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }

    const d = new Date(cleanDate);
    if (isNaN(d.getTime())) return String(dateString);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (e) {
    return String(dateString);
  }
}

export function calculateAge(dobString: string | null | undefined): { years: number; months: number } | null {
  if (!dobString) return null;
  const cleanDate = standardizeDate(dobString);
  if (!cleanDate) return null;

  try {
    let birthDate: Date;
    const match = cleanDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      birthDate = new Date(year, month, day);
    } else {
      birthDate = new Date(cleanDate);
    }
    if (isNaN(birthDate.getTime())) return null;

    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();

    if (days < 0) {
      months -= 1;
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    return { years, months };
  } catch (e) {
    return null;
  }
}

export function formatAge(dobString: string | null | undefined): string {
  const age = calculateAge(dobString);
  if (!age) return '-';
  return `${age.years} tahun ${age.months} bulan`;
}

export function getGoogleDriveDirectImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  const cleanUrl = String(url).trim().replace(/['"]/g, '');
  if (cleanUrl.startsWith('data:image')) return cleanUrl;

  let id = '';
  const fileDMatch = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    id = fileDMatch[1];
  } else {
    const idMatch = cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      id = idMatch[1];
    }
  }

  if (id) {
    return `https://lh3.googleusercontent.com/d/${id}`;
  }
  return cleanUrl;
}

export function getGoogleDriveThumbnailUrl(url: string | null | undefined): string {
  if (!url) return '';
  const cleanUrl = String(url).trim().replace(/['"]/g, '');
  if (cleanUrl.startsWith('data:image')) return cleanUrl;

  let id = '';
  const fileDMatch = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    id = fileDMatch[1];
  } else {
    const idMatch = cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      id = idMatch[1];
    }
  }

  if (id) {
    return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
  }
  return cleanUrl;
}

export function normalizeClassName(className: string | null | undefined): string {
  if (!className) return '';
  const str = String(className).trim();
  if (str.toUpperCase() === 'NONE') return 'None';
  return str
    .toUpperCase()
    .replace(/\bKELAS\b/gi, '')
    .replace(/[-_]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

export function matchClass(studentClass: string | null | undefined, targetClass: string | null | undefined): boolean {
  if (!studentClass || !targetClass) return false;
  return normalizeClassName(studentClass) === normalizeClassName(targetClass);
}

export function matchStatusActive(status: string | null | undefined): boolean {
  if (!status) return false;
  const cleanStatus = String(status).trim().toLowerCase();
  return cleanStatus === 'aktif';
}

export function getActiveClasses(students: any[]): string[] {
  if (!students || !Array.isArray(students) || students.length === 0) return [];
  const set = new Set<string>();
  students.forEach(s => {
    if (s && matchStatusActive(s.status) && s.class) {
      const clean = normalizeClassName(s.class);
      if (clean) set.add(clean);
    }
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

export function getAllClasses(students: any[]): string[] {
  if (!students || !Array.isArray(students) || students.length === 0) return [];
  const set = new Set<string>();
  students.forEach(s => {
    if (s && s.class) {
      const clean = normalizeClassName(s.class);
      if (clean) set.add(clean);
    }
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

