export const GAS_TEMPLATE = `// CODE UNTUK GOOGLE APPS SCRIPT (Code.gs)
// 1. Buat Spreadsheet Baru di Google Drive
// 2. Klik Ekstensi > Apps Script
// 3. Paste kode ini, lalu klik Simpan
// 4. Klik Terapkan (Deploy) > Deployment Baru
// 5. Pilih "Aplikasi Web"
// 6. Jalankan sebagai: "Saya"
// 7. Siapa yang memiliki akses: "Siapa saja" (Anyone)
// 8. Copy URL Web App yang dihasilkan dan paste di pengaturan aplikasi ini.

const SHEET_SISWA = "DataSiswa";
const SHEET_GURU = "DataGuru";

const STANDARD_SISWA_HEADERS = [
  "id", "nis", "nisn", "name", "class", "gender", "pob", "dob", "address", 
  "parentName", "status", "sekolahAsal", "sekolahTujuan", "tanggalMutasi", 
  "ijazahNo", "ijazahUrl", "berkasUrl", "kkUrl", "akteUrl", "fotoUrl",
  "createdAt", "updatedAt"
];

const STANDARD_GURU_HEADERS = [
  "id", "nip", "name", "gender", "class", "phone", "email", "status", "createdAt", "updatedAt"
];

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Setup DataSiswa Sheet
  let sheetSiswa = ss.getSheetByName(SHEET_SISWA);
  if (!sheetSiswa) {
    sheetSiswa = ss.insertSheet(SHEET_SISWA);
    sheetSiswa.appendRow(STANDARD_SISWA_HEADERS);
    sheetSiswa.getRange(1, 1, 1, STANDARD_SISWA_HEADERS.length).setFontWeight("bold");
    sheetSiswa.setFrozenRows(1);
  } else {
    ensureHeaders(sheetSiswa, STANDARD_SISWA_HEADERS);
  }
  
  // Setup DataGuru Sheet
  let sheetGuru = ss.getSheetByName(SHEET_GURU);
  if (!sheetGuru) {
    sheetGuru = ss.insertSheet(SHEET_GURU);
    sheetGuru.appendRow(STANDARD_GURU_HEADERS);
    sheetGuru.getRange(1, 1, 1, STANDARD_GURU_HEADERS.length).setFontWeight("bold");
    sheetGuru.setFrozenRows(1);
  } else {
    ensureHeaders(sheetGuru, STANDARD_GURU_HEADERS);
  }

  // Hapus default "Sheet1" jika ada dan kita punya sheet kita sendiri
  try {
    const defaultSheet = ss.getSheetByName("Sheet1");
    if (defaultSheet && ss.getSheets().length > 1) {
      ss.deleteSheet(defaultSheet);
    }
  } catch(e) {}
  
  // Memancing agar Google meminta izin akses Google Drive saat setup() dijalankan
  try {
    DriveApp.getRootFolder();
  } catch(e) {}
}

function ensureHeaders(sheet, standardHeaders) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  let headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  if (!headers || !headers[0]) {
    sheet.getRange(1, 1, 1, standardHeaders.length).setValues([standardHeaders]).setFontWeight("bold");
    sheet.setFrozenRows(1);
    return standardHeaders;
  }
  
  let updated = false;
  standardHeaders.forEach(sh => {
    if (headers.indexOf(sh) === -1) {
      headers.push(sh);
      updated = true;
    }
  });

  if (updated) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
  }
  return headers;
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    
    if (payload.action === "upload") {
      return handleUpload(payload);
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Auto Setup jika sheet belum lengkap
    let sheetSiswa = ss.getSheetByName(SHEET_SISWA);
    let sheetGuru = ss.getSheetByName(SHEET_GURU);
    if (!sheetSiswa || !sheetGuru) {
      setup();
      sheetSiswa = ss.getSheetByName(SHEET_SISWA);
      sheetGuru = ss.getSheetByName(SHEET_GURU);
    }

    if (payload.action === "setup") {
      setup();
      return jsonResponse({ success: true, message: "Database dan semua sheet berhasil dibuat/diperbarui otomatis!" });
    }

    if (payload.action === "sync") {
      // Sync students
      const records = payload.data; // Array of student objects
      if (records) {
        const headers = ensureHeaders(sheetSiswa, STANDARD_SISWA_HEADERS);
        // Kosongkan baris lama (sisakan header)
        if (sheetSiswa.getLastRow() > 1) {
          sheetSiswa.getRange(2, 1, sheetSiswa.getLastRow() - 1, sheetSiswa.getLastColumn()).clearContent();
        }
        if (records.length > 0) {
          const rows = records.map(s => {
            return headers.map(h => {
              const val = s[h];
              return (val !== undefined && val !== null) ? String(val) : "";
            });
          });
          sheetSiswa.getRange(2, 1, rows.length, headers.length).setValues(rows);
        }
      }

      // Sync teachers jika dikirim
      const teachers = payload.teachers;
      if (teachers) {
        const headers = ensureHeaders(sheetGuru, STANDARD_GURU_HEADERS);
        if (sheetGuru.getLastRow() > 1) {
          sheetGuru.getRange(2, 1, sheetGuru.getLastRow() - 1, sheetGuru.getLastColumn()).clearContent();
        }
        if (teachers.length > 0) {
          const rows = teachers.map(t => {
            return headers.map(h => {
              const val = t[h];
              return (val !== undefined && val !== null) ? String(val) : "";
            });
          });
          sheetGuru.getRange(2, 1, rows.length, headers.length).setValues(rows);
        }
      }

      return jsonResponse({ success: true, message: "Data berhasil disinkronkan ke Google Sheets" });
    }

    if (payload.action === "pull") {
      ensureHeaders(sheetSiswa, STANDARD_SISWA_HEADERS);
      const siswaData = sheetSiswa.getDataRange().getDisplayValues();
      const students = [];
      if (siswaData.length > 1) {
        const headers = siswaData[0];
        for (let i = 1; i < siswaData.length; i++) {
          let row = siswaData[i];
          let obj = {};
          for (let j = 0; j < headers.length; j++) {
            if (headers[j]) obj[headers[j]] = row[j];
          }
          students.push(obj);
        }
      }

      ensureHeaders(sheetGuru, STANDARD_GURU_HEADERS);
      const guruData = sheetGuru.getDataRange().getDisplayValues();
      const teachers = [];
      if (guruData.length > 1) {
        const headers = guruData[0];
        for (let i = 1; i < guruData.length; i++) {
          let row = guruData[i];
          let obj = {};
          for (let j = 0; j < headers.length; j++) {
            if (headers[j]) obj[headers[j]] = row[j];
          }
          teachers.push(obj);
        }
      }

      return jsonResponse({ 
        data: students, 
        students: students, 
        teachers: teachers 
      });
    }

  } catch (error) {
    return jsonResponse({ error: error.toString() });
  }
}

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheetSiswa = ss.getSheetByName(SHEET_SISWA);
    let sheetGuru = ss.getSheetByName(SHEET_GURU);
    if (!sheetSiswa || !sheetGuru) {
      setup();
      sheetSiswa = ss.getSheetByName(SHEET_SISWA);
      sheetGuru = ss.getSheetByName(SHEET_GURU);
    }
    
    ensureHeaders(sheetSiswa, STANDARD_SISWA_HEADERS);
    const siswaData = sheetSiswa.getDataRange().getDisplayValues();
    const students = [];
    if (siswaData.length > 1) {
      const headers = siswaData[0];
      for (let i = 1; i < siswaData.length; i++) {
        let row = siswaData[i];
        let obj = {};
        for (let j = 0; j < headers.length; j++) {
          if (headers[j]) obj[headers[j]] = row[j];
        }
        students.push(obj);
      }
    }

    ensureHeaders(sheetGuru, STANDARD_GURU_HEADERS);
    const guruData = sheetGuru.getDataRange().getDisplayValues();
    const teachers = [];
    if (guruData.length > 1) {
      const headers = guruData[0];
      for (let i = 1; i < guruData.length; i++) {
        let row = guruData[i];
        let obj = {};
        for (let j = 0; j < headers.length; j++) {
          if (headers[j]) obj[headers[j]] = row[j];
        }
        teachers.push(obj);
      }
    }

    return jsonResponse({ 
      data: students, 
      students: students, 
      teachers: teachers 
    });
  } catch(err) {
    return jsonResponse({ error: err.toString() });
  }
}

function handleUpload(payload) {
  try {
    let folder;
    if (payload.folderId) {
      try {
        folder = DriveApp.getFolderById(payload.folderId);
      } catch (e) {
        return jsonResponse({ error: "Folder ID tidak valid atau tidak dapat diakses." });
      }
    } else {
      const folderName = payload.folderName || "SISWA_UPLOADS";
      const folders = DriveApp.getFoldersByName(folderName);
      if (folders.hasNext()) {
        folder = folders.next();
      } else {
        folder = DriveApp.createFolder(folderName);
        folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      }
    }
    
    if (!folder) {
      return jsonResponse({ error: "Gagal mendapatkan atau membuat folder upload." });
    }
    
    const blob = Utilities.newBlob(Utilities.base64Decode(payload.base64), payload.mimeType, payload.filename);
    const file = folder.createFile(blob);
    
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return jsonResponse({ success: true, url: file.getUrl() });
  } catch (err) {
    return jsonResponse({ error: "Upload failed: " + err.toString() });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
