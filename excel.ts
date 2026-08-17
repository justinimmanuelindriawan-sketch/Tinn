import * as XLSX from 'xlsx';
import { Student, Teacher } from '../types';
import { standardizeDate, normalizeClassName } from './utils';

export function detectDelimiter(text: string): string {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0).slice(0, 10);
  let semicolons = 0;
  let commas = 0;
  let tabs = 0;

  for (const line of lines) {
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (!inQuotes) {
        if (char === ';') semicolons++;
        else if (char === ',') commas++;
        else if (char === '\t') tabs++;
      }
    }
  }

  if (semicolons > commas && semicolons > tabs) return ';';
  if (tabs > commas && tabs > semicolons) return '\t';
  return ',';
}

export function parseCSVLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^["']|["']$/g, ''));
  return result;
}

export function parseCSVToStudents(text: string): Partial<Student>[] {
  const delimiter = detectDelimiter(text);
  const rawLines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (rawLines.length === 0) return [];

  const parsedRows = rawLines.map(l => parseCSVLine(l, delimiter));
  
  let headerRowIdx = -1;
  let nisIdx = -1;
  let nisnIdx = -1;
  let nameIdx = -1;
  let classIdx = -1;
  let genderIdx = -1;
  let pobIdx = -1;
  let dobIdx = -1;
  let addressIdx = -1;
  let parentIdx = -1;
  let statusIdx = -1;

  for (let r = 0; r < Math.min(parsedRows.length, 5); r++) {
    const row = parsedRows[r].map(c => c.toLowerCase());
    const nIdx = row.findIndex(c => (c.includes('nama') || c.includes('name')) && !c.includes('orang tua') && !c.includes('ortu'));
    const nsIdx = row.findIndex(c => c.includes('nis') && !c.includes('nisn'));
    const nsnIdx = row.findIndex(c => c.includes('nisn'));
    const cIdx = row.findIndex(c => c.includes('kelas') || c.includes('class'));

    if (nIdx >= 0 || nsIdx >= 0 || nsnIdx >= 0 || cIdx >= 0) {
      headerRowIdx = r;
      nameIdx = nIdx;
      nisIdx = nsIdx;
      nisnIdx = nsnIdx;
      classIdx = cIdx;
      genderIdx = row.findIndex(c => c.includes('l/p') || c.includes('jk') || c.includes('gender') || c.includes('jenis kelamin'));
      pobIdx = row.findIndex(c => c.includes('tempat') || c.includes('pob') || c.includes('tmp'));
      dobIdx = row.findIndex(c => (c.includes('tgl') || c.includes('tanggal') || c.includes('dob')) || (c.includes('lahir') && !c.includes('tempat') && !c.includes('pob') && !c.includes('tmp')));
      addressIdx = row.findIndex(c => c.includes('alamat') || c.includes('address'));
      parentIdx = row.findIndex(c => c.includes('orang tua') || c.includes('ortu') || c.includes('parent') || c.includes('ayah') || c.includes('ibu'));
      statusIdx = row.findIndex(c => c.includes('status'));
      break;
    }
  }

  const startIdx = headerRowIdx >= 0 ? headerRowIdx + 1 : 0;
  const result: Partial<Student>[] = [];

  for (let i = startIdx; i < parsedRows.length; i++) {
    const cells = parsedRows[i];
    if (!cells || cells.length === 0 || cells.every(c => !c)) continue;

    let nis = '';
    let nisn = '';
    let name = '';
    let sClass = '1A';
    let gender: 'L' | 'P' = 'L';
    let pob = '';
    let dob = '';
    let address = '';
    let parentName = '';
    let statusRaw = 'Aktif';

    if (headerRowIdx >= 0) {
      if (nisIdx >= 0 && cells[nisIdx]) nis = cells[nisIdx];
      if (nisnIdx >= 0 && cells[nisnIdx]) nisn = cells[nisnIdx];
      if (nameIdx >= 0 && cells[nameIdx]) name = cells[nameIdx];
      if (classIdx >= 0 && cells[classIdx]) sClass = cells[classIdx];
      if (genderIdx >= 0 && cells[genderIdx]) {
        gender = cells[genderIdx].toUpperCase().startsWith('P') ? 'P' : 'L';
      }
      if (pobIdx >= 0 && cells[pobIdx]) pob = cells[pobIdx];
      if (dobIdx >= 0 && cells[dobIdx]) dob = cells[dobIdx];
      if (addressIdx >= 0 && cells[addressIdx]) address = cells[addressIdx];
      if (parentIdx >= 0 && cells[parentIdx]) parentName = cells[parentIdx];
      if (statusIdx >= 0 && cells[statusIdx]) statusRaw = cells[statusIdx];
    } else {
      // Positional fallback: NIS, NISN, Nama, Kelas, L/P, Tempat Lahir, DOB, Alamat, Ortu, Status
      nis = cells[0] || '';
      nisn = cells[1] || '';
      name = cells[2] || '';
      if (!name && cells[1] && isNaN(Number(cells[1]))) {
        name = cells[1];
        nisn = '';
      }
      sClass = cells[3] || '1A';
      gender = (cells[4] || 'L').toUpperCase().startsWith('P') ? 'P' : 'L';
      pob = cells[5] || '';
      dob = cells[6] || '';
      address = cells[7] || '';
      parentName = cells[8] || '';
      statusRaw = cells[9] || 'Aktif';
    }

    sClass = normalizeClassName(sClass) || '1A';

    let parsedStatus: 'Aktif' | 'Lulus' | 'Pindah' | 'Keluar' = 'Aktif';
    if (statusRaw.toLowerCase().includes('lulus')) parsedStatus = 'Lulus';
    else if (statusRaw.toLowerCase().includes('pindah') || statusRaw.toLowerCase().includes('mutasi')) parsedStatus = 'Pindah';
    else if (statusRaw.toLowerCase().includes('keluar')) parsedStatus = 'Keluar';

    if (name || nis || nisn) {
      result.push({
        nis,
        nisn,
        name,
        class: sClass,
        gender,
        pob: pob || undefined,
        dob: standardizeDate(dob),
        address,
        parentName,
        status: parsedStatus,
      });
    }
  }

  return result;
}

export function parseCSVToTeachers(text: string): Partial<Teacher>[] {
  const delimiter = detectDelimiter(text);
  const rawLines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (rawLines.length === 0) return [];

  const parsedRows = rawLines.map(l => parseCSVLine(l, delimiter));

  let headerRowIdx = -1;
  let nipIdx = -1;
  let nameIdx = -1;
  let genderIdx = -1;
  let classIdx = -1;
  let phoneIdx = -1;
  let emailIdx = -1;
  let statusIdx = -1;

  for (let r = 0; r < Math.min(parsedRows.length, 5); r++) {
    const row = parsedRows[r].map(c => c.toLowerCase());
    const npIdx = row.findIndex(c => c.includes('nip'));
    const nmIdx = row.findIndex(c => c.includes('nama') || c.includes('name'));

    if (npIdx >= 0 || nmIdx >= 0) {
      headerRowIdx = r;
      nipIdx = npIdx;
      nameIdx = nmIdx;
      genderIdx = row.findIndex(c => c.includes('l/p') || c.includes('jk') || c.includes('gender'));
      classIdx = row.findIndex(c => c.includes('kelas') || c.includes('wali') || c.includes('class'));
      phoneIdx = row.findIndex(c => c.includes('telp') || c.includes('phone') || c.includes('hp') || c.includes('wa'));
      emailIdx = row.findIndex(c => c.includes('email'));
      statusIdx = row.findIndex(c => c.includes('status'));
      break;
    }
  }

  const startIdx = headerRowIdx >= 0 ? headerRowIdx + 1 : 0;
  const result: Partial<Teacher>[] = [];

  for (let i = startIdx; i < parsedRows.length; i++) {
    const cells = parsedRows[i];
    if (!cells || cells.length === 0 || cells.every(c => !c)) continue;

    let nip = '';
    let name = '';
    let gender: 'L' | 'P' = 'L';
    let assignedClass = 'None';
    let phone = '';
    let email = '';
    let statusRaw = 'Aktif';

    if (headerRowIdx >= 0) {
      if (nipIdx >= 0 && cells[nipIdx]) nip = cells[nipIdx];
      if (nameIdx >= 0 && cells[nameIdx]) name = cells[nameIdx];
      if (genderIdx >= 0 && cells[genderIdx]) {
        gender = cells[genderIdx].toUpperCase().startsWith('P') ? 'P' : 'L';
      }
      if (classIdx >= 0 && cells[classIdx]) assignedClass = cells[classIdx];
      if (phoneIdx >= 0 && cells[phoneIdx]) phone = cells[phoneIdx];
      if (emailIdx >= 0 && cells[emailIdx]) email = cells[emailIdx];
      if (statusIdx >= 0 && cells[statusIdx]) statusRaw = cells[statusIdx];
    } else {
      nip = cells[0] || '';
      name = cells[1] || '';
      gender = (cells[2] || 'L').toUpperCase().startsWith('P') ? 'P' : 'L';
      assignedClass = cells[3] || 'None';
      phone = cells[4] || '';
      email = cells[5] || '';
      statusRaw = cells[6] || 'Aktif';
    }

    assignedClass = assignedClass.toUpperCase().replace(/KELAS/g, '').replace(/[-_]/g, '').trim() || 'None';
    const status: 'Aktif' | 'Nonaktif' = statusRaw.toLowerCase().includes('non') ? 'Nonaktif' : 'Aktif';

    if (name || nip) {
      result.push({
        nip,
        name,
        gender,
        class: assignedClass,
        phone,
        email,
        status,
      });
    }
  }

  return result;
}

export const downloadStudentExcelTemplate = (filename: string = 'Template_Import_Siswa.xlsx') => {
  const exampleData = [
    {
      "NIS": "252601001",
      "NISN": "1234567890",
      "Nama Lengkap": "Ahmad Fauzi",
      "Kelas": "1A",
      "L/P": "L",
      "Tempat Lahir": "Bandung",
      "Tgl Lahir": "12/05/2015",
      "Alamat": "Jl. Merdeka No. 10",
      "Nama Orang Tua": "Slamet",
      "Status": "Aktif",
      "No Ijazah": "-"
    },
    {
      "NIS": "252601002",
      "NISN": "0987654321",
      "Nama Lengkap": "Siti Aminah",
      "Kelas": "1A",
      "L/P": "P",
      "Tempat Lahir": "Jakarta",
      "Tgl Lahir": "22/08/2015",
      "Alamat": "Jl. Kenanga No. 4",
      "Nama Orang Tua": "Budi",
      "Status": "Aktif",
      "No Ijazah": "-"
    }
  ];

  const ws = XLSX.utils.json_to_sheet(exampleData, {
    header: ["NIS", "NISN", "Nama Lengkap", "Kelas", "L/P", "Tempat Lahir", "Tgl Lahir", "Alamat", "Nama Orang Tua", "Status", "No Ijazah"]
  });

  ws['!cols'] = [
    { wch: 15 },
    { wch: 15 },
    { wch: 25 },
    { wch: 10 },
    { wch: 8 },
    { wch: 18 },
    { wch: 14 },
    { wch: 30 },
    { wch: 22 },
    { wch: 12 },
    { wch: 18 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template Siswa");
  XLSX.writeFile(wb, filename);
};

export const downloadTeacherExcelTemplate = (filename: string = 'Template_Import_Guru_Tendik.xlsx') => {
  const exampleData = [
    {
      "NIP": "197501011998031001",
      "Nama Lengkap": "Drs. H. Mulyadi, M.Pd.",
      "L/P": "L",
      "Wali Kelas / Jabatan": "Kepala Sekolah",
      "No Telepon": "081234567890",
      "Email": "kepsek@sekolah.sch.id",
      "Status": "Aktif"
    },
    {
      "NIP": "198501012010011001",
      "Nama Lengkap": "Budi Santoso, S.Pd",
      "L/P": "L",
      "Wali Kelas / Jabatan": "1A",
      "No Telepon": "081234567891",
      "Email": "budi@sekolah.sch.id",
      "Status": "Aktif"
    },
    {
      "NIP": "-",
      "Nama Lengkap": "Ahmad Rian, A.Md.",
      "L/P": "L",
      "Wali Kelas / Jabatan": "Operator Sekolah",
      "No Telepon": "085678901234",
      "Email": "operator@sekolah.sch.id",
      "Status": "Aktif"
    },
    {
      "NIP": "-",
      "Nama Lengkap": "Sutrisno",
      "L/P": "L",
      "Wali Kelas / Jabatan": "Penjaga Sekolah",
      "No Telepon": "081299887766",
      "Email": "-",
      "Status": "Aktif"
    },
    {
      "NIP": "-",
      "Nama Lengkap": "Hendra Wijaya",
      "L/P": "L",
      "Wali Kelas / Jabatan": "Satpam / Keamanan",
      "No Telepon": "082133445566",
      "Email": "-",
      "Status": "Aktif"
    },
    {
      "NIP": "-",
      "Nama Lengkap": "Siti Aminah",
      "L/P": "P",
      "Wali Kelas / Jabatan": "Petugas Kebersihan",
      "No Telepon": "083811223344",
      "Email": "-",
      "Status": "Aktif"
    }
  ];

  const ws = XLSX.utils.json_to_sheet(exampleData, {
    header: ["NIP", "Nama Lengkap", "L/P", "Wali Kelas / Jabatan", "No Telepon", "Email", "Status"]
  });

  ws['!cols'] = [
    { wch: 20 },
    { wch: 28 },
    { wch: 8 },
    { wch: 22 },
    { wch: 16 },
    { wch: 25 },
    { wch: 12 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template GTK");
  XLSX.writeFile(wb, filename);
};

export const exportToExcel = (students: Student[], filename: string = 'data-siswa.xlsx') => {
  const ws = XLSX.utils.json_to_sheet(students.map(s => ({
    "ID": s.id,
    "NIS": s.nis,
    "NISN": s.nisn || '-',
    "Nama Lengkap": s.name,
    "Kelas": s.class,
    "L/P": s.gender,
    "Tempat Lahir": s.pob || '-',
    "Tgl Lahir": s.dob,
    "Alamat": s.address,
    "Nama Orang Tua": s.parentName,
    "Status": s.status === 'Pindah' ? 'Mutasi' : s.status,
    "No Ijazah": s.ijazahNo || '-',
    "Link Ijazah": s.ijazahUrl || '-',
    "Link Berkas": s.berkasUrl || '-',
  })));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");
  XLSX.writeFile(wb, filename);
};

export const exportTeachersToExcel = (teachers: any[], filename: string = 'data-guru-tendik.xlsx') => {
  const ws = XLSX.utils.json_to_sheet(teachers.map((t, idx) => ({
    "No": idx + 1,
    "NIP": t.nip || '-',
    "Nama Lengkap": t.name,
    "L/P": t.gender,
    "Jabatan / Wali Kelas": t.class === 'None' ? 'Guru Mapel' : t.class,
    "No Telepon": t.phone || '-',
    "Email": t.email || '-',
    "Status": t.status,
  })));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data GTK");
  XLSX.writeFile(wb, filename);
};

export const importTeachersFromExcel = (file: File): Promise<Partial<Teacher>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const teachers = parseCSVToTeachers(text);
          resolve(teachers);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
      return;
    }

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        const mapped = json.map(row => {
          const nipKey = Object.keys(row).find(k => k.toLowerCase().includes('nip'));
          const nameKey = Object.keys(row).find(k => k.toLowerCase().includes('nama') || k.toLowerCase().includes('name'));
          const genderKey = Object.keys(row).find(k => k.toLowerCase().includes('l/p') || k.toLowerCase().includes('jk') || k.toLowerCase().includes('gender'));
          const classKey = Object.keys(row).find(k => k.toLowerCase().includes('kelas') || k.toLowerCase().includes('wali') || k.toLowerCase().includes('jabatan') || k.toLowerCase().includes('class'));
          const phoneKey = Object.keys(row).find(k => k.toLowerCase().includes('telp') || k.toLowerCase().includes('phone') || k.toLowerCase().includes('hp') || k.toLowerCase().includes('wa') || k.toLowerCase().includes('telepon'));
          const emailKey = Object.keys(row).find(k => k.toLowerCase().includes('email'));
          const statusKey = Object.keys(row).find(k => k.toLowerCase().includes('status'));

          let assignedClassRaw = String((classKey ? row[classKey] : row['Wali Kelas / Jabatan'] || row['Wali Kelas'] || row['Jabatan'] || row['Kelas']) || 'None').trim();
          let assignedClass = 'None';
          if (assignedClassRaw.toUpperCase().includes('KEPALA') || assignedClassRaw.toUpperCase() === 'KS') {
            assignedClass = 'Kepala Sekolah';
          } else if (assignedClassRaw.toUpperCase() === 'NONE' || assignedClassRaw === '-' || !assignedClassRaw) {
            assignedClass = 'None';
          } else if (/^[1-6][A-Z]?$/i.test(assignedClassRaw) || assignedClassRaw.toUpperCase().startsWith('KELAS')) {
            assignedClass = assignedClassRaw.toUpperCase().replace(/KELAS/g, '').replace(/[-_]/g, '').trim() || 'None';
          } else {
            assignedClass = assignedClassRaw;
          }

          let statusRaw = String((statusKey ? row[statusKey] : row['Status']) || 'Aktif');
          const status: 'Aktif' | 'Nonaktif' = statusRaw.toLowerCase().includes('non') ? 'Nonaktif' : 'Aktif';

          return {
            nip: String((nipKey ? row[nipKey] : row['NIP']) || row['Nip'] || ''),
            name: String((nameKey ? row[nameKey] : row['Nama Lengkap']) || row['Nama'] || ''),
            gender: String((genderKey ? row[genderKey] : row['L/P']) || row['Gender'] || 'L').toUpperCase().startsWith('P') ? 'P' : 'L',
            class: assignedClass,
            phone: String((phoneKey ? row[phoneKey] : row['No Telepon']) || row['Phone'] || ''),
            email: String((emailKey ? row[emailKey] : row['Email']) || ''),
            status,
          } as Partial<Teacher>;
        }).filter(t => t.name || t.nip);

        resolve(mapped);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

export const importFromExcel = (file: File): Promise<Partial<Student>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const students = parseCSVToStudents(text);
          resolve(students);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
      return;
    }

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        const mapped = json.map(row => {
          let statusRaw = String(row['Status'] || 'Aktif').trim();
          let parsedStatus: 'Aktif' | 'Lulus' | 'Pindah' | 'Keluar' = 'Aktif';
          if (statusRaw.toLowerCase().includes('lulus')) parsedStatus = 'Lulus';
          else if (statusRaw.toLowerCase().includes('pindah') || statusRaw.toLowerCase().includes('mutasi')) parsedStatus = 'Pindah';
          else if (statusRaw.toLowerCase().includes('keluar')) parsedStatus = 'Keluar';

          const pobKey = Object.keys(row).find(k => {
            const kl = k.toLowerCase();
            return kl.includes('tempat') || kl.includes('pob') || kl.includes('tmp');
          });
          const pobRaw = String((pobKey ? row[pobKey] : (row['Tempat Lahir'] || '')) || '').trim();

          const dobKey = Object.keys(row).find(k => {
            const kl = k.toLowerCase();
            return (kl.includes('tgl') || kl.includes('tanggal') || kl.includes('dob')) || (kl.includes('lahir') && !kl.includes('tempat') && !kl.includes('pob') && !kl.includes('tmp'));
          });
          const dobRaw = dobKey ? row[dobKey] : (row['Tgl Lahir'] || row['Tanggal Lahir'] || '');

          const nameKey = Object.keys(row).find(k => k.toLowerCase().includes('nama') && !k.toLowerCase().includes('orang tua') && !k.toLowerCase().includes('ortu'));
          const nisKey = Object.keys(row).find(k => k.toLowerCase().includes('nis') && !k.toLowerCase().includes('nisn'));
          const nisnKey = Object.keys(row).find(k => k.toLowerCase().includes('nisn'));
          const classKey = Object.keys(row).find(k => k.toLowerCase().includes('kelas') || k.toLowerCase().includes('class'));
          const genderKey = Object.keys(row).find(k => k.toLowerCase().includes('l/p') || k.toLowerCase().includes('jk') || k.toLowerCase().includes('gender'));
          const addressKey = Object.keys(row).find(k => k.toLowerCase().includes('alamat') || k.toLowerCase().includes('address'));
          const parentKey = Object.keys(row).find(k => k.toLowerCase().includes('orang tua') || k.toLowerCase().includes('ortu') || k.toLowerCase().includes('parent'));

          let sClass = String((classKey ? row[classKey] : row['Kelas']) || '1A');
          sClass = normalizeClassName(sClass) || '1A';

          return {
            nis: String((nisKey ? row[nisKey] : row['NIS']) || row['Nis'] || ''),
            nisn: String((nisnKey ? row[nisnKey] : row['NISN']) || row['Nisn'] || ''),
            name: String((nameKey ? row[nameKey] : row['Nama Lengkap']) || row['Nama'] || ''),
            class: sClass,
            gender: String((genderKey ? row[genderKey] : row['L/P']) || row['Gender'] || 'L').toUpperCase().startsWith('P') ? 'P' : 'L',
            pob: pobRaw || undefined,
            dob: standardizeDate(dobRaw),
            address: String((addressKey ? row[addressKey] : row['Alamat']) || ''),
            parentName: String((parentKey ? row[parentKey] : row['Nama Orang Tua']) || ''),
            status: parsedStatus,
            ijazahNo: row['No Ijazah'] && row['No Ijazah'] !== '-' ? String(row['No Ijazah']) : undefined,
          } as Partial<Student>;
        }).filter(s => s.name || s.nis || s.nisn);

        resolve(mapped);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};
