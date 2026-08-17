import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { Student } from '../types';
import { CLASSES, STATUSES, generateId, cn, formatDate, formatAge, getGoogleDriveDirectImageUrl, getGoogleDriveThumbnailUrl, standardizeDate, matchClass, getActiveClasses, getAllClasses } from '../lib/utils';
import { 
  Search, Plus, Filter, Download, Upload, Edit, Trash2, Printer, X, FileDown,
  ArrowUpDown, FileSpreadsheet, Eye, BookOpen, User, Calendar, MapPin, UserCheck, DownloadCloud, UploadCloud,
  ChevronLeft, ChevronRight, RefreshCw, PlusCircle
} from 'lucide-react';
import { exportToExcel, importFromExcel, parseCSVToStudents, downloadStudentExcelTemplate } from '../lib/excel';
import { uploadFileToGAS, fetchFromGAS } from '../lib/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function StudentsList() {
  const { 
    students, addStudent, updateStudent, deleteStudent, settings,
    setLoading, setIsSyncingGlobal, setLastSyncedAt 
  } = useStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'name-asc' | 'name-desc' | 'class-asc' | 'class-desc'>('default');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Partial<Student>>({});
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [printStudent, setPrintStudent] = useState<Student | null>(null);
  const [isPrintListMode, setIsPrintListMode] = useState(false);
  // Import Preview Modal State
  interface ImportPreviewState {
    fileName: string;
    fileType: 'CSV' | 'Excel';
    parsedData: Partial<Student>[];
  }
  const [importPreview, setImportPreview] = useState<ImportPreviewState | null>(null);
  const [importMode, setImportMode] = useState<'UPDATE' | 'SKIP_EXISTING' | 'ADD_ALL'>('UPDATE');
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterClass, sortBy]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync to sheets immediately when data is changed
  const triggerSync = async (updatedStudents: Student[]) => {
    if (!settings.scriptUrl) return;
    try {
      setLoading(true);
      setIsSyncingGlobal(true);
      await fetchFromGAS(settings.scriptUrl, {
        action: 'sync',
        data: updatedStudents,
        teachers: useStore.getState().teachers
      });
      setLastSyncedAt(new Date().toLocaleTimeString('id-ID'));
    } catch (e) {
      console.error("Auto sync students failed:", e);
    } finally {
      setLoading(false);
      setIsSyncingGlobal(false);
    }
  };

  // Derived filtered & sorted data
  const filteredStudents = students.filter(s => {
    if (!s) return false;
    // Exclude students who moved out, left, or graduated so they don't pile up in Data Siswa
    if (s.status === 'Pindah' || s.status === 'Keluar' || s.status === 'Lulus') return false;

    const searchString = searchTerm.toLowerCase();
    const nameStr = String(s.name || '').toLowerCase();
    const nisStr = String(s.nis || '').toLowerCase();
    const nisnStr = String(s.nisn || '').toLowerCase();
    
    const matchesSearch = nameStr.includes(searchString) || 
                          nisStr.includes(searchString) ||
                          nisnStr.includes(searchString);
    const matchesClass = filterClass ? matchClass(s.class, filterClass) : true;
    return matchesSearch && matchesClass;
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (!a || !b) return 0;
    if (sortBy === 'name-asc') {
      return String(a.name || '').localeCompare(String(b.name || ''), 'id');
    }
    if (sortBy === 'name-desc') {
      return String(b.name || '').localeCompare(String(a.name || ''), 'id');
    }
    if (sortBy === 'class-asc') {
      return String(a.class || '').localeCompare(String(b.class || ''));
    }
    if (sortBy === 'class-desc') {
      return String(b.class || '').localeCompare(String(a.class || ''));
    }
    return 0; // default
  });

  const totalPages = Math.ceil(sortedStudents.length / itemsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedStudents = sortedStudents.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage
  );

  const processStudentImport = async (parsed: Partial<Student>[], mode: 'UPDATE' | 'SKIP_EXISTING' | 'ADD_ALL') => {
    if (parsed.length === 0) {
      alert("Tidak ada data valid yang diimport.");
      return;
    }

    const now = new Date().toISOString();
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const currentStudents = [...useStore.getState().students];

    for (const imp of parsed) {
      const impNis = imp.nis ? String(imp.nis).trim() : '';
      const impNisn = imp.nisn ? String(imp.nisn).trim() : '';
      const impName = imp.name ? String(imp.name).trim().toLowerCase() : '';

      if (!impName && !impNis && !impNisn) continue;

      if (mode === 'ADD_ALL') {
        const newStudent: Student = {
          id: generateId(),
          nis: impNis,
          nisn: impNisn,
          name: imp.name?.trim() || 'Siswa',
          class: imp.class || '1A',
          gender: imp.gender || 'L',
          pob: imp.pob || '',
          dob: imp.dob || '',
          address: imp.address || '',
          parentName: imp.parentName || '',
          status: imp.status || 'Aktif',
          ijazahNo: imp.ijazahNo || '',
          createdAt: now,
          updatedAt: now,
        };
        currentStudents.push(newStudent);
        useStore.getState().addStudent(newStudent);
        addedCount++;
        continue;
      }

      const existingIdx = currentStudents.findIndex(e => {
        const eNis = e.nis ? String(e.nis).trim() : '';
        const eNisn = e.nisn ? String(e.nisn).trim() : '';
        const eName = e.name ? String(e.name).trim().toLowerCase() : '';

        if (impNis && eNis && impNis === eNis) return true;
        if (impNisn && eNisn && impNisn === eNisn) return true;
        if (impName && eName && impName === eName) return true;
        return false;
      });

      if (existingIdx >= 0) {
        if (mode === 'SKIP_EXISTING') {
          skippedCount++;
        } else {
          // UPDATE mode
          const existing = currentStudents[existingIdx];
          const updated: Student = {
            ...existing,
            nis: impNis || existing.nis,
            nisn: impNisn || existing.nisn,
            name: imp.name?.trim() || existing.name,
            class: imp.class || existing.class,
            gender: imp.gender || existing.gender,
            pob: imp.pob || existing.pob,
            dob: imp.dob || existing.dob,
            address: imp.address || existing.address,
            parentName: imp.parentName || existing.parentName,
            status: imp.status || existing.status,
            ijazahNo: imp.ijazahNo || existing.ijazahNo,
            updatedAt: now,
          };
          currentStudents[existingIdx] = updated;
          useStore.getState().updateStudent(existing.id, updated);
          updatedCount++;
        }
      } else {
        const newStudent: Student = {
          id: generateId(),
          nis: impNis,
          nisn: impNisn,
          name: imp.name?.trim() || 'Siswa',
          class: imp.class || '1A',
          gender: imp.gender || 'L',
          pob: imp.pob || '',
          dob: imp.dob || '',
          address: imp.address || '',
          parentName: imp.parentName || '',
          status: imp.status || 'Aktif',
          ijazahNo: imp.ijazahNo || '',
          createdAt: now,
          updatedAt: now,
        };
        currentStudents.push(newStudent);
        useStore.getState().addStudent(newStudent);
        addedCount++;
      }
    }

    const finalStudents = useStore.getState().students;
    await triggerSync(finalStudents);

    let summary = `Proses Import Selesai!\n• ${addedCount} data baru ditambahkan`;
    if (mode === 'UPDATE') {
      summary += `\n• ${updatedCount} data lama diperbarui/ditimpa`;
    } else if (mode === 'SKIP_EXISTING') {
      summary += `\n• ${skippedCount} data lama dilewati (tidak ditimpa)`;
    }
    alert(summary);
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    setIsProcessingImport(true);
    try {
      await processStudentImport(importPreview.parsedData, importMode);
      setImportPreview(null);
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat mengimpor data.");
    } finally {
      setIsProcessingImport(false);
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const title = `Daftar Siswa SD - ${filterClass ? 'Kelas ' + filterClass : 'Semua Kelas'}`;
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.text(title, 14, 18);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`, 14, 25);

    const tableData = filteredStudents.map((s, idx) => [
      idx + 1,
      s.nis,
      s.nisn || '-',
      s.name,
      s.class,
      s.gender,
      s.status === 'Pindah' ? 'Mutasi' : s.status
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['No', 'NIS', 'NISN', 'Nama Lengkap', 'Kelas', 'L/P', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center' },
        6: { halign: 'center' }
      }
    });

    doc.save(`Daftar_Siswa_${filterClass || 'Semua'}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleOpenModal = (student?: Student) => {
    const defaultClass = getAllClasses(students)[0] || '1A';
    setCurrentStudent(student ? { ...student } : { gender: 'L', status: 'Aktif', class: defaultClass });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent.name || !currentStudent.nis) return alert("Nama dan NIS Wajib diisi");
    
    const now = new Date().toISOString();
    const sanitizedStudent = {
      ...currentStudent,
      dob: standardizeDate(currentStudent.dob),
    } as Student;
    
    if (currentStudent.id) {
      updateStudent(currentStudent.id, { ...sanitizedStudent, updatedAt: now });
    } else {
      addStudent({
        ...sanitizedStudent,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      });
    }
    setIsModalOpen(false);
    
    const currentStudents = useStore.getState().students;
    await triggerSync(currentStudents);
  };

  const [uploadingState, setUploadingState] = useState<{ [key: string]: boolean }>({});

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'kk' | 'akte' | 'foto') => {
    if (!settings.scriptUrl) {
      alert("Atur Google Apps Script URL di pengaturan untuk mengaktifkan upload Drive.");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingState(prev => ({ ...prev, [type]: true }));
      const url = await uploadFileToGAS(settings.scriptUrl, file, settings.folderId, "SISWA_UPLOADS");
      
      const updatedData: Partial<Student> = {};
      if (type === 'kk') updatedData.kkUrl = url;
      if (type === 'akte') updatedData.akteUrl = url;
      if (type === 'foto') updatedData.fotoUrl = url;

      // Update local state in modal
      setCurrentStudent(prev => {
        const next = { ...prev, ...updatedData };
        // If student exists in system, immediately save to global store and sync to Google Sheets!
        if (next.id) {
          updateStudent(next.id, { ...updatedData, updatedAt: new Date().toISOString() });
          const currentAll = useStore.getState().students;
          triggerSync(currentAll);
        }
        return next;
      });

      alert(`Berkas ${type.toUpperCase()} berhasil diupload dan tersimpan otomatis ke Google Sheets!`);
    } catch (err: any) {
      alert("Gagal upload: " + err.message);
    } finally {
      setUploadingState(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await importFromExcel(file);
      if (parsed.length === 0) {
        alert("File Excel kosong atau tidak ada data valid.");
        return;
      }
      setImportPreview({
        fileName: file.name,
        fileType: 'Excel',
        parsedData: parsed
      });
      setImportMode('UPDATE');
    } catch (err) {
      console.error(err);
      alert("Gagal membaca file Excel");
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-indigo-900">Data Siswa</h2>
          <p className="text-gray-500 mt-1 font-medium">Kelola data murid kelas 1-6.</p>
        </div>
        
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto">
          <input 
            type="file" 
            accept=".xlsx, .xls"
            className="hidden" 
            ref={fileInputRef}
            onChange={handleImport}
          />
          <button onClick={() => downloadStudentExcelTemplate()} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-100/70 font-semibold text-xs sm:text-sm shadow-sm transition active:scale-95 duration-150">
            <FileSpreadsheet size={16} /> <span className="truncate">Template Excel</span>
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-green-600 text-white rounded-xl shadow-lg shadow-green-200/50 hover:bg-green-700 font-medium text-xs sm:text-sm transition active:scale-95 duration-150">
            <Upload size={16} /> <span className="truncate">Import Excel</span>
          </button>
          <button onClick={() => exportToExcel(filteredStudents, `Daftar_Siswa_dengan_NISN_${new Date().toISOString().slice(0, 10)}.xlsx`)} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-200/50 hover:bg-emerald-700 font-medium text-xs sm:text-sm transition active:scale-95 duration-150">
            <FileSpreadsheet size={16} /> <span className="truncate">Export Excel</span>
          </button>
          <button onClick={() => downloadPDF()} className="btn-outline justify-center gap-2 text-indigo-600 border-indigo-100 hover:bg-indigo-50/50 text-xs sm:text-sm px-3 py-2.5">
            <FileDown size={16} /> <span className="truncate">PDF</span>
          </button>
          <button onClick={() => setIsPrintListMode(true)} className="btn-outline justify-center text-xs sm:text-sm px-3 py-2.5">
            <Printer size={16} /> <span className="truncate">Cetak</span>
          </button>
          <button onClick={() => handleOpenModal()} className="btn justify-center text-xs sm:text-sm px-3 py-2.5 col-span-2 sm:col-span-1">
            <Plus size={16} /> <span className="truncate">Tambah Siswa</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Cari berdasarkan Nama, NIS, atau NISN..." 
            className="w-full bg-white/60 backdrop-blur-lg border border-white/80 px-5 py-3 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 pl-12 font-medium text-gray-800 placeholder-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative w-full sm:w-48">
          <Filter className="absolute left-4 top-3.5 text-gray-400" size={20} />
          <select 
            className="w-full bg-white/60 backdrop-blur-lg border border-white/80 px-5 py-3 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 pl-12 appearance-none font-medium text-gray-800"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
          >
            <option value="">Semua Kelas ({getActiveClasses(students).length} Aktif)</option>
            {getAllClasses(students).map(c => <option key={c} value={c}>Kelas {c}</option>)}
          </select>
        </div>
        <div className="relative w-full sm:w-56">
          <ArrowUpDown className="absolute left-4 top-3.5 text-gray-400" size={20} />
          <select 
            className="w-full bg-white/60 backdrop-blur-lg border border-white/80 px-5 py-3 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 pl-12 appearance-none font-medium text-gray-800"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="default">Urutkan: Default</option>
            <option value="name-asc">Urutkan: Nama (A - Z)</option>
            <option value="name-desc">Urutkan: Nama (Z - A)</option>
            <option value="class-asc">Urutkan: Kelas (Terendah)</option>
            <option value="class-desc">Urutkan: Kelas (Tertinggi)</option>
          </select>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-2xl rounded-[2rem] border border-white/90 shadow-lg overflow-hidden flex flex-col mb-10">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse min-w-[700px] border border-indigo-100">
            <thead className="bg-indigo-50/50 z-10 sticky top-0">
              <tr className="text-indigo-900 text-[11px] uppercase tracking-widest border-b border-indigo-100">
                <th className="px-6 py-4 font-bold border border-indigo-100 text-indigo-900">NIS / NISN</th>
                <th className="px-6 py-4 font-bold border border-indigo-100 text-indigo-900">Nama Lengkap</th>
                <th className="px-4 py-4 font-bold text-center border border-indigo-100 text-indigo-900">Kelas</th>
                <th className="px-4 py-4 font-bold text-center border border-indigo-100 text-indigo-900">L/P</th>
                <th className="px-4 py-4 font-bold border border-indigo-100 text-indigo-900">Tempat, Tgl Lahir</th>
                <th className="px-6 py-4 font-bold border border-indigo-100 text-indigo-900">Status</th>
                <th className="px-6 py-4 font-bold text-right border border-indigo-100 text-indigo-900">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-50/50">
              {sortedStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500 font-medium tracking-wide border border-indigo-100">
                    Tidak ada data siswa.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map(student => (
                  <tr 
                    key={student.id} 
                    className="hover:bg-indigo-50/30 transition-colors group cursor-pointer"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('.action-btn')) return;
                      setViewingStudent(student);
                    }}
                  >
                    <td className="px-6 py-4 font-mono text-gray-500 border border-indigo-100">
                      <div>{student.nis}</div>
                      {student.nisn && <div className="text-xs text-gray-400">{student.nisn}</div>}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900 group-hover:text-indigo-600 transition-colors border border-indigo-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center overflow-hidden shrink-0 font-extrabold text-xs shadow-sm relative">
                          {student.fotoUrl ? (
                            <img 
                              src={getGoogleDriveDirectImageUrl(student.fotoUrl)} 
                              alt={student.name} 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                const fallback = getGoogleDriveThumbnailUrl(student.fotoUrl);
                                if (target.src !== fallback) {
                                  target.src = fallback;
                                } else {
                                  target.style.display = 'none';
                                }
                              }}
                            />
                          ) : (
                            student.name ? student.name[0].toUpperCase() : 'S'
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{student.name}</div>
                          {student.fotoUrl && <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">✓ Foto tersedia</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center border border-indigo-100">
                       <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-black">{student.class}</span>
                    </td>
                    <td className="px-4 py-4 text-center border border-indigo-100">
                       <span className="text-gray-600 font-bold">{student.gender}</span>
                    </td>
                    <td className="px-4 py-4 border border-indigo-100 text-xs">
                      {student.pob ? <span className="font-semibold text-gray-900 block">{student.pob}</span> : null}
                      <span className="text-gray-500 font-medium">{formatDate(student.dob) || '-'}</span>
                    </td>
                    <td className="px-6 py-4 border border-indigo-100">
                       <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap",
                        student.status === 'Aktif' ? 'bg-green-100 text-green-700' :
                        student.status === 'Lulus' ? 'bg-indigo-100 text-indigo-700' : 
                        student.status === 'Keluar' ? 'bg-rose-100 text-rose-700' : 'bg-orange-100 text-orange-700'
                       )}>
                         <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", 
                          student.status === 'Aktif' ? 'bg-green-500' :
                          student.status === 'Lulus' ? 'bg-indigo-500' : 
                          student.status === 'Keluar' ? 'bg-rose-500' : 'bg-orange-500'
                         )}></span>
                         {student.status === 'Pindah' ? 'Mutasi' : student.status}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right border border-indigo-100">
                      <div className="action-btn flex justify-end gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setPrintStudent(student);
                          }} 
                          className="px-2 sm:px-3 py-1.5 bg-white border border-gray-100 rounded-lg text-xs font-semibold text-gray-600 shadow-sm hover:border-indigo-300 transition-colors"
                        >
                          <Printer size={16} className="sm:hidden" />
                          <span className="hidden sm:inline">Cetak</span>
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(student);
                          }} 
                          className="px-2 sm:px-3 py-1.5 bg-white border border-gray-100 rounded-lg text-xs font-semibold text-indigo-600 shadow-sm hover:bg-indigo-50 transition-colors"
                        >
                          <Edit size={16} className="sm:hidden" />
                          <span className="hidden sm:inline">Edit</span>
                        </button>
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (window.confirm('Yakin ingin menghapus?')) {
                              const updated = students.filter(s => s.id !== student.id);
                              deleteStudent(student.id);
                              await triggerSync(updated);
                            }
                          }} 
                          className="px-2 sm:px-3 py-1.5 bg-white border border-gray-100 rounded-lg text-xs font-semibold text-rose-600 shadow-sm hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 size={16} className="sm:hidden" />
                          <span className="hidden sm:inline">Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-indigo-50/20 border-t border-indigo-50/50">
            <p className="text-xs text-slate-500 font-medium">
              Menampilkan <span className="font-bold text-indigo-900">{(safePage - 1) * itemsPerPage + 1}</span> - <span className="font-bold text-indigo-900">{Math.min(safePage * itemsPerPage, sortedStudents.length)}</span> dari <span className="font-bold text-indigo-900">{sortedStudents.length}</span> siswa
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={safePage === 1}
                className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-600 transition"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>
              
              <div className="flex items-center gap-1 font-semibold text-xs text-slate-600">
                <span className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold">{safePage}</span>
                <span className="text-slate-400 font-medium px-1">dari</span>
                <span className="px-3 py-1.5 rounded-lg bg-white border border-slate-200">{totalPages}</span>
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={safePage === totalPages}
                className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-600 transition"
                title="Halaman Selanjutnya"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Siswa Modal */}
      {viewingStudent && (
        <div className="fixed inset-0 bg-indigo-950/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white/95 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl border border-white/50 shadow-2xl w-full max-w-2xl mt-auto transition-transform overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-900 text-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <User size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Profil Lengkap Siswa</h3>
                  <p className="text-xs text-indigo-200">Informasi detail murid</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingStudent(null)} 
                className="p-2 bg-white/10 hover:bg-white/25 text-white rounded-full transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
              {/* Profile card / top summary */}
              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/30">
                {/* Photo / Avatar */}
                <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div className="w-24 h-32 rounded-xl border border-slate-200 bg-white shadow-inner flex items-center justify-center overflow-hidden relative">
                    {viewingStudent.fotoUrl ? (
                      <img 
                        src={getGoogleDriveDirectImageUrl(viewingStudent.fotoUrl)} 
                        alt="Foto" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          const fallback = getGoogleDriveThumbnailUrl(viewingStudent.fotoUrl);
                          if (target.src !== fallback) {
                            target.src = fallback;
                          }
                        }}
                      />
                    ) : (
                      <span className="text-3xl font-black text-indigo-300">{viewingStudent.name ? viewingStudent.name[0] : 'S'}</span>
                    )}
                  </div>
                  {viewingStudent.fotoUrl && (
                    <a 
                      href={viewingStudent.fotoUrl.trim().replace(/['"]/g, '')} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-[10px] text-indigo-600 font-black hover:underline flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100/70 px-2 py-0.5 rounded transition"
                      title="Jika foto tidak muncul, klik untuk membuka file asli di Google Drive"
                    >
                      Buka di Drive ↗
                    </a>
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left space-y-2">
                  <h4 className="text-2xl font-extrabold text-indigo-900 leading-tight">{viewingStudent.name}</h4>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">Kelas {viewingStudent.class}</span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">{viewingStudent.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-bold",
                      viewingStudent.status === 'Aktif' ? 'bg-green-100 text-green-700' :
                      viewingStudent.status === 'Lulus' ? 'bg-indigo-100 text-indigo-700' :
                      viewingStudent.status === 'Keluar' ? 'bg-rose-100 text-rose-700' : 'bg-orange-100 text-orange-700'
                    )}>{viewingStudent.status}</span>
                  </div>
                  <p className="text-sm font-mono text-gray-500">NIS: {viewingStudent.nis} {viewingStudent.nisn ? `| NISN: ${viewingStudent.nisn}` : ''}</p>
                </div>
              </div>

              {/* Bento Grid Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Detail 1 */}
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex gap-3">
                  <Calendar size={18} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tempat, Tanggal Lahir</span>
                    <span className="text-sm font-semibold text-gray-800">
                      {viewingStudent.pob ? `${viewingStudent.pob}, ` : ''}{formatDate(viewingStudent.dob)}
                    </span>
                    {viewingStudent.dob && (
                      <span className="block text-xs text-indigo-600 font-semibold mt-1">Usia: {formatAge(viewingStudent.dob)}</span>
                    )}
                  </div>
                </div>

                {/* Detail 2 */}
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex gap-3">
                  <UserCheck size={18} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nama Orang Tua</span>
                    <span className="text-sm font-semibold text-gray-800">{viewingStudent.parentName || '-'}</span>
                  </div>
                </div>

                {/* Detail 3 */}
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex gap-3 sm:col-span-2">
                  <MapPin size={18} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Alamat Tinggal</span>
                    <span className="text-sm font-semibold text-gray-800">{viewingStudent.address || '-'}</span>
                  </div>
                </div>

                {viewingStudent.status === 'Lulus' && (
                  <div className="p-4 rounded-xl border border-slate-100 bg-indigo-50/20 flex gap-3 sm:col-span-2">
                    <BookOpen size={18} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Nomor Ijazah</span>
                      <span className="text-sm font-bold text-indigo-900">{viewingStudent.ijazahNo || '-'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Attachments & Files */}
              <div className="space-y-3">
                <h5 className="text-sm font-bold text-indigo-950 uppercase tracking-wider">Dokumen & Berkas</h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* KK */}
                  <div className="p-3 rounded-xl border border-slate-100 flex flex-col justify-between gap-2 bg-white">
                    <span className="text-xs font-bold text-gray-500">Kartu Keluarga (KK)</span>
                    {viewingStudent.kkUrl ? (
                      <a href={viewingStudent.kkUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                        <Eye size={12} /> Lihat KK
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400 font-medium italic">Tidak ada berkas</span>
                    )}
                  </div>

                  {/* Akte */}
                  <div className="p-3 rounded-xl border border-slate-100 flex flex-col justify-between gap-2 bg-white">
                    <span className="text-xs font-bold text-gray-500">Akte Kelahiran</span>
                    {viewingStudent.akteUrl ? (
                      <a href={viewingStudent.akteUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                        <Eye size={12} /> Lihat Akte
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400 font-medium italic">Tidak ada berkas</span>
                    )}
                  </div>

                  {/* Berkas Lain */}
                  <div className="p-3 rounded-xl border border-slate-100 flex flex-col justify-between gap-2 bg-white">
                    <span className="text-xs font-bold text-gray-500">Berkas Pendukung</span>
                    {viewingStudent.berkasUrl ? (
                      <a href={viewingStudent.berkasUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                        <Eye size={12} /> Lihat Berkas
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400 font-medium italic">Tidak ada berkas</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer with actions */}
            <div className="p-4 sm:p-5 border-t border-gray-100 bg-slate-50 flex flex-wrap justify-end gap-2 sticky bottom-0 z-20">
              <button 
                onClick={() => {
                  setViewingStudent(null);
                  setPrintStudent(viewingStudent);
                }} 
                className="btn-outline text-sm"
              >
                <Printer size={16} /> Cetak Biodata
              </button>
              <button 
                onClick={() => {
                  setViewingStudent(null);
                  handleOpenModal(viewingStudent);
                }} 
                className="btn-outline text-indigo-600 border-indigo-100 hover:bg-indigo-50/50 text-sm"
              >
                <Edit size={16} /> Edit Profil
              </button>
              <button 
                onClick={() => setViewingStudent(null)} 
                className="btn text-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-indigo-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white/95 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl border border-white/50 shadow-2xl w-full max-w-2xl mt-auto transition-transform">
             <div className="p-5 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-white/50 rounded-t-3xl sm:rounded-t-3xl sticky top-0 z-10">
               <h3 className="text-xl font-bold text-indigo-900">{currentStudent.id ? 'Edit Siswa' : 'Tambah Siswa'}</h3>
               <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 hover:text-indigo-600 transition">
                 <X size={20} />
               </button>
             </div>
             <div className="p-5 sm:p-6 max-h-[80vh] overflow-y-auto relative">
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">NIS</label>
                      <input type="text" className="input" required value={currentStudent.nis || ''} onChange={e => setCurrentStudent({...currentStudent, nis: e.target.value})} />
                    </div>
                    <div>
                      <label className="label">NISN (Opsional)</label>
                      <input type="text" className="input" value={currentStudent.nisn || ''} onChange={e => setCurrentStudent({...currentStudent, nisn: e.target.value})} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="label">Nama Lengkap</label>
                      <input type="text" className="input" required value={currentStudent.name || ''} onChange={e => setCurrentStudent({...currentStudent, name: e.target.value})} />
                    </div>
                    <div>
                      <label className="label">Kelas</label>
                      <select className="input" value={currentStudent.class || (getAllClasses(students)[0] || '1A')} onChange={e => setCurrentStudent({...currentStudent, class: e.target.value})}>
                        {Array.from(new Set([...getAllClasses(students), ...CLASSES, ...(currentStudent.class ? [currentStudent.class] : [])])).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).map(c => (
                          <option key={c} value={c}>Kelas {c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Jenis Kelamin</label>
                      <select className="input" value={currentStudent.gender || 'L'} onChange={e => setCurrentStudent({...currentStudent, gender: e.target.value as 'L'|'P'})}>
                        <option value="L">Laki-laki</option>
                        <option value="P">Perempuan</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Tempat Lahir</label>
                      <input type="text" className="input" placeholder="mis. Bandung" value={currentStudent.pob || ''} onChange={e => setCurrentStudent({...currentStudent, pob: e.target.value})} />
                    </div>
                    <div>
                      <label className="label">Tanggal Lahir</label>
                      <input type="date" className="input" value={currentStudent.dob || ''} onChange={e => setCurrentStudent({...currentStudent, dob: e.target.value})} />
                    </div>
                    <div>
                      <label className="label">Nama Orang Tua</label>
                      <input type="text" className="input" value={currentStudent.parentName || ''} onChange={e => setCurrentStudent({...currentStudent, parentName: e.target.value})} />
                    </div>
                    <div className="md:col-span-2">
                       <label className="label">Alamat</label>
                       <textarea className="input" rows={2} value={currentStudent.address || ''} onChange={e => setCurrentStudent({...currentStudent, address: e.target.value})}></textarea>
                    </div>
                    <div>
                      <label className="label">Status Siswa</label>
                      <select className="input" value={currentStudent.status || 'Aktif'} onChange={e => setCurrentStudent({...currentStudent, status: e.target.value as any})}>
                        <option value="Aktif">Aktif</option>
                        <option value="Lulus">Lulus</option>
                        <option value="Pindah">Mutasi / Pindah</option>
                        <option value="Keluar">Keluar</option>
                      </select>
                    </div>
                    
                    {currentStudent.status === 'Lulus' && (
                       <div>
                         <label className="label">Nomor Ijazah</label>
                         <input type="text" className="input" value={currentStudent.ijazahNo || ''} onChange={e => setCurrentStudent({...currentStudent, ijazahNo: e.target.value})} />
                       </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-200">
                    <div>
                       <label className="label">Upload KK (Opsional)</label>
                       <div className="flex gap-2">
                          <input type="file" className="text-sm w-full" onChange={e => handleFileUpload(e, 'kk')} disabled={uploadingState['kk']} />
                       </div>
                       {uploadingState['kk'] && <p className="text-xs text-indigo-600 font-bold animate-pulse mt-1">Mengupload KK ke Drive...</p>}
                       {currentStudent.kkUrl && (
                         <a href={currentStudent.kkUrl.trim().replace(/['"]/g, '')} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 font-bold hover:underline inline-flex items-center gap-1 mt-1 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">
                           <Eye size={12} /> Lihat KK saat ini ↗
                         </a>
                       )}
                    </div>
                    <div>
                       <label className="label">Upload Akte (Opsional)</label>
                       <div className="flex gap-2">
                          <input type="file" className="text-sm w-full" onChange={e => handleFileUpload(e, 'akte')} disabled={uploadingState['akte']} />
                       </div>
                       {uploadingState['akte'] && <p className="text-xs text-indigo-600 font-bold animate-pulse mt-1">Mengupload Akte ke Drive...</p>}
                       {currentStudent.akteUrl && (
                         <a href={currentStudent.akteUrl.trim().replace(/['"]/g, '')} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 font-bold hover:underline inline-flex items-center gap-1 mt-1 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">
                           <Eye size={12} /> Lihat Akte saat ini ↗
                         </a>
                       )}
                    </div>
                    <div>
                         <label className="label">Upload Foto (Opsional)</label>
                         <div className="flex gap-2">
                            <input type="file" accept="image/*" className="text-sm w-full" onChange={e => handleFileUpload(e, 'foto')} disabled={uploadingState['foto']} />
                         </div>
                         {uploadingState['foto'] && <p className="text-xs text-indigo-600 font-bold animate-pulse mt-1">Mengupload Foto ke Drive...</p>}
                         {currentStudent.fotoUrl && (
                           <div className="mt-2 flex items-center gap-3 bg-indigo-50/70 p-2 rounded-xl border border-indigo-100">
                             <img 
                               src={getGoogleDriveDirectImageUrl(currentStudent.fotoUrl)} 
                               alt="Preview Foto" 
                               className="w-12 h-16 object-cover rounded-lg border border-indigo-200 shadow-sm"
                               referrerPolicy="no-referrer"
                               onError={(e) => {
                                 const target = e.target as HTMLImageElement;
                                 const fallback = getGoogleDriveThumbnailUrl(currentStudent.fotoUrl);
                                 if (target.src !== fallback) {
                                   target.src = fallback;
                                 } else {
                                   target.style.display = 'none';
                                 }
                               }}
                             />
                             <div>
                               <span className="block text-[10px] font-bold text-indigo-500 uppercase">Foto Berhasil Diupload</span>
                               <a href={currentStudent.fotoUrl.trim().replace(/['"]/g, '')} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 font-bold hover:underline inline-flex items-center gap-1 mt-0.5">
                                 <Eye size={12} /> Buka di Drive ↗
                               </a>
                             </div>
                           </div>
                         )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 pb-4 sm:pt-6 sm:pb-0 sticky bottom-0 z-20 bg-white/95 sm:bg-transparent backdrop-blur-md p-4 sm:p-0 -mx-5 sm:mx-0 mt-4 border-t border-gray-100 sm:border-0">
                     <button type="button" onClick={() => setIsModalOpen(false)} className="btn-outline">Batal</button>
                     <button type="submit" className="btn">Simpan Data</button>
                  </div>
                </form>
             </div>
          </div>
        </div>
      )}

      {/* Print View */}
      {printStudent && (
        <div id="printable-area" className="bg-white p-6 sm:p-8 max-w-2xl mx-auto fixed inset-0 overflow-y-auto print:overflow-visible print:relative print:inset-auto print:p-0 z-[200] print-single-page">
           <div className="flex justify-between items-start no-print mb-6">
              <button onClick={() => window.print()} className="btn">Cetak Sekarang</button>
              <button onClick={() => setPrintStudent(null)} className="btn-outline"><X size={18} /> Tutup</button>
           </div>
           
           <div className="text-center mb-6 border-b-2 border-slate-800 pb-3">
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight">Biodata Siswa</h1>
              <p className="text-slate-600 text-sm font-medium">Sekolah Dasar</p>
           </div>
           
           <div className="flex flex-row justify-between items-start gap-6 mb-6">
              <table className="w-full text-left text-sm sm:text-base flex-1">
                <tbody>
                  <tr><td className="py-1.5 w-1/3 font-semibold text-gray-700">NIS / NISN</td><td className="py-1.5 font-mono font-medium">: {printStudent.nis} {printStudent.nisn ? `/ ${printStudent.nisn}` : ''}</td></tr>
                  <tr>
                    <td className="py-1.5 font-semibold text-gray-700">Nama Lengkap</td>
                    <td className="py-1.5 font-bold text-gray-900">: <span className={printStudent.name && printStudent.name.length > 30 ? "text-xs font-bold leading-tight" : printStudent.name && printStudent.name.length > 20 ? "text-sm font-bold" : "text-base font-bold"}>{printStudent.name}</span></td>
                  </tr>
                  <tr><td className="py-1.5 font-semibold text-gray-700">Kelas</td><td className="py-1.5 font-bold">: {printStudent.class}</td></tr>
                  <tr><td className="py-1.5 font-semibold text-gray-700">Jenis Kelamin</td><td className="py-1.5">: {printStudent.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</td></tr>
                  <tr><td className="py-1.5 font-semibold text-gray-700">Tempat, Tgl Lahir</td><td className="py-1.5">: {printStudent.pob ? `${printStudent.pob}, ` : ''}{formatDate(printStudent.dob)} {printStudent.dob && `(Usia: ${formatAge(printStudent.dob)})`}</td></tr>
                  <tr><td className="py-1.5 font-semibold text-gray-700">Nama Orang Tua</td><td className="py-1.5">: {printStudent.parentName || '-'}</td></tr>
                  <tr><td className="py-1.5 font-semibold text-gray-700 align-top">Alamat</td><td className="py-1.5">: {printStudent.address || '-'}</td></tr>
                  <tr><td className="py-1.5 font-semibold text-gray-700">Status</td><td className="py-1.5">: {printStudent.status}</td></tr>
                  {printStudent.status === 'Lulus' && (
                     <tr><td className="py-1.5 font-semibold text-gray-700">Nomor Ijazah</td><td className="py-1.5 font-bold">: {printStudent.ijazahNo || '-'}</td></tr>
                  )}
                </tbody>
              </table>

              {printStudent.fotoUrl && (
                 <div className="w-[3cm] h-[4cm] sm:w-[3.5cm] sm:h-[5cm] shrink-0 border-2 border-slate-800 p-1 bg-white relative flex items-center justify-center text-center overflow-hidden no-print-bg">
                    <img 
                      src={getGoogleDriveDirectImageUrl(printStudent.fotoUrl)} 
                      alt="Foto Siswa" 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        if (!(e.target as HTMLImageElement).parentElement?.querySelector('.error-text')) {
                          const span = document.createElement('span');
                          span.className = "error-text text-[10px] text-gray-500 absolute inline-block p-1";
                          span.innerText = "Foto tidak dapat ditampilkan";
                          (e.target as HTMLImageElement).parentElement?.appendChild(span);
                        }
                      }}
                    />
                 </div>
              )}
           </div>
           
           <div className="mt-10 text-right text-sm">
              <p className="mb-12">.................., {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p className="font-semibold">( Administrasi Sekolah )</p>
           </div>
        </div>
      )}

      {/* Print ListView */}
      {isPrintListMode && (
        <div id="printable-area" className="bg-white p-6 sm:p-8 max-w-5xl mx-auto fixed inset-0 overflow-y-auto print:overflow-visible print:relative print:inset-auto print:p-0 z-[200]">
           <div className="flex justify-between items-start no-print mb-6">
              <button onClick={() => window.print()} className="btn">Cetak Sekarang</button>
              <button onClick={() => setIsPrintListMode(false)} className="btn-outline"><X size={18} /> Tutup</button>
           </div>
           
           <div className="text-center mb-6">
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight">DAFTAR SISWA SD</h1>
              <p className="text-slate-600 font-semibold text-sm">
                {filterClass ? `KELAS ${filterClass}` : 'SEMUA KELAS'}
              </p>
           </div>
           
           <table className="w-full text-left border-collapse border border-slate-400 print-table">
             <thead>
               <tr className="bg-slate-100">
                 <th className="border border-slate-400 p-2 font-bold text-center w-10">No</th>
                 <th className="border border-slate-400 p-2 font-bold w-36">NIS / NISN</th>
                 <th className="border border-slate-400 p-2 font-bold">Nama Lengkap</th>
                 <th className="border border-slate-400 p-2 font-bold text-center w-12">L/P</th>
                 <th className="border border-slate-400 p-2 font-bold text-center w-16">Kelas</th>
                 <th className="border border-slate-400 p-2 font-bold text-center w-20">Status</th>
               </tr>
             </thead>
             <tbody>
               {sortedStudents.length === 0 ? (
                 <tr><td colSpan={6} className="border border-slate-400 p-4 text-center">Tidak ada data</td></tr>
               ) : (
                 sortedStudents.map((s, idx) => {
                   const nLen = s.name ? s.name.length : 0;
                   const nameFontClass = nLen > 32 ? "text-[9px] leading-tight" : nLen > 22 ? "text-[10px] leading-tight" : "text-xs";
                   return (
                     <tr key={s.id}>
                       <td className="border border-slate-400 p-1.5 text-center text-xs font-medium">{idx + 1}</td>
                       <td className="border border-slate-400 p-1.5 text-xs font-mono">{s.nis} {s.nisn ? `/ ${s.nisn}` : ''}</td>
                       <td className={`border border-slate-400 p-1.5 font-bold uppercase ${nameFontClass}`}>{s.name}</td>
                       <td className="border border-slate-400 p-1.5 text-center text-xs font-medium">{s.gender}</td>
                       <td className="border border-slate-400 p-1.5 text-center text-xs font-semibold">{s.class}</td>
                       <td className="border border-slate-400 p-1.5 text-center text-xs font-medium">{s.status === 'Pindah' ? 'Mutasi' : s.status}</td>
                     </tr>
                   );
                 })
               )}
             </tbody>
           </table>
           
           <div className="mt-16 w-full flex justify-end">
             <div className="text-center">
                <p className="mb-16 text-right">.................., {new Date().toLocaleDateString('id-ID')}</p>
                <p className="font-semibold text-right">( Administrasi Sekolah )</p>
             </div>
           </div>
        </div>
      )}

      {/* Modal Selection Import CSV / Excel */}
      {importPreview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-indigo-900 to-indigo-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-xl">
                  <UploadCloud className="text-amber-300" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Menu Import {importPreview.fileType}</h3>
                  <p className="text-xs text-indigo-200 flex items-center gap-1.5 mt-0.5">
                    <span>📄 {importPreview.fileName}</span>
                    <span>•</span>
                    <span className="font-semibold text-amber-300">{importPreview.parsedData.length} data terdeteksi</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setImportPreview(null)}
                className="p-1.5 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Preview Table */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 block">
                  Pratinjau Data File (3 Baris Pertama)
                </label>
                <div className="border border-gray-200 rounded-xl overflow-hidden text-xs bg-gray-50">
                  <table className="w-full text-left">
                    <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="p-2">NIS</th>
                        <th className="p-2">Nama</th>
                        <th className="p-2">Kelas</th>
                        <th className="p-2">L/P</th>
                        <th className="p-2">Tempat Lahir</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {importPreview.parsedData.slice(0, 3).map((s, idx) => (
                        <tr key={idx} className="bg-white">
                          <td className="p-2 font-mono text-gray-600">{s.nis || '-'}</td>
                          <td className="p-2 font-medium text-gray-800">{s.name || '-'}</td>
                          <td className="p-2 text-gray-600">{s.class || '1A'}</td>
                          <td className="p-2 text-gray-600">{s.gender || 'L'}</td>
                          <td className="p-2 text-gray-600">{s.pob || '-'}</td>
                          <td className="p-2 text-gray-600">{s.status || 'Aktif'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mode Selection */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5 block">
                  Pilih Cara Pengolahan Data
                </label>
                <div className="space-y-3">
                  {/* Option 1: Update Existing & Add New */}
                  <label 
                    className={cn(
                      "flex items-start gap-3.5 p-3.5 rounded-xl border-2 transition cursor-pointer",
                      importMode === 'UPDATE' 
                        ? "border-indigo-600 bg-indigo-50/50 shadow-sm" 
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    )}
                  >
                    <input 
                      type="radio" 
                      name="importMode" 
                      value="UPDATE" 
                      checked={importMode === 'UPDATE'}
                      onChange={() => setImportMode('UPDATE')}
                      className="mt-1 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <RefreshCw size={16} className="text-indigo-600" />
                        <span className="font-semibold text-sm text-gray-900">Perbarui Data Lama & Tambah Data Baru</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">Rekomendasi</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Jika siswa sudah ada (cocok NIS / NISN / Nama), data lama akan diperbarui/ditimpa. Siswa yang belum ada akan ditambahkan.
                      </p>
                    </div>
                  </label>

                  {/* Option 2: Skip Existing (Only Add New) */}
                  <label 
                    className={cn(
                      "flex items-start gap-3.5 p-3.5 rounded-xl border-2 transition cursor-pointer",
                      importMode === 'SKIP_EXISTING' 
                        ? "border-amber-600 bg-amber-50/50 shadow-sm" 
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    )}
                  >
                    <input 
                      type="radio" 
                      name="importMode" 
                      value="SKIP_EXISTING" 
                      checked={importMode === 'SKIP_EXISTING'}
                      onChange={() => setImportMode('SKIP_EXISTING')}
                      className="mt-1 text-amber-600 focus:ring-amber-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <UserCheck size={16} className="text-amber-600" />
                        <span className="font-semibold text-sm text-gray-900">Hanya Tambah Data Baru (Abaikan jika Sudah Ada)</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Jika siswa sudah ada di sistem, datanya tidak disentuh/tidak ditimpa. Hanya siswa baru yang dimasukkan.
                      </p>
                    </div>
                  </label>

                  {/* Option 3: Add All */}
                  <label 
                    className={cn(
                      "flex items-start gap-3.5 p-3.5 rounded-xl border-2 transition cursor-pointer",
                      importMode === 'ADD_ALL' 
                        ? "border-emerald-600 bg-emerald-50/50 shadow-sm" 
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    )}
                  >
                    <input 
                      type="radio" 
                      name="importMode" 
                      value="ADD_ALL" 
                      checked={importMode === 'ADD_ALL'}
                      onChange={() => setImportMode('ADD_ALL')}
                      className="mt-1 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <PlusCircle size={16} className="text-emerald-600" />
                        <span className="font-semibold text-sm text-gray-900">Tambah Semua Sebagai Data Baru</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Abaikan pengecekan duplikasi. Seluruh {importPreview.parsedData.length} baris di file akan dibuat sebagai entri baru.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setImportPreview(null)}
                disabled={isProcessingImport}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200/60 rounded-xl transition"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={isProcessingImport}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-lg shadow-indigo-200 transition disabled:opacity-50"
              >
                {isProcessingImport ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <UploadCloud size={16} />
                    Proses Import ({importPreview.parsedData.length} Data)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
