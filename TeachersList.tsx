import React, { useState, useMemo, useRef } from 'react';
import { useStore } from '../store';
import { Teacher } from '../types';
import { 
  Search, Plus, Edit2, Trash2, X, Save, Filter, 
  GraduationCap, Phone, Mail, CheckCircle2, XCircle, Users,
  Upload, FileSpreadsheet, RefreshCw, UserCheck, Award,
  UploadCloud, PlusCircle, Laptop, Shield, Key, Sparkles,
  FileText, BookOpen, Briefcase, Building2, Wrench
} from 'lucide-react';
import { generateId, cn, getAllClasses } from '../lib/utils';
import { fetchFromGAS } from '../lib/api';
import { exportTeachersToExcel, importTeachersFromExcel, downloadTeacherExcelTemplate } from '../lib/excel';

const TENDIK_PRESETS = [
  'Operator Sekolah',
  'Penjaga Sekolah',
  'Satpam / Keamanan',
  'Petugas Kebersihan',
  'Tenaga Administrasi (TU)',
  'Petugas Perpustakaan',
];

export default function TeachersList() {
  const { teachers, students, settings, addTeacher, updateTeacher, deleteTeacher, setLoading, setIsSyncingGlobal } = useStore();
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Aktif' | 'Nonaktif'>('Semua');
  const [classFilter, setClassFilter] = useState('Semua');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  
  // Form state
  const [nip, setNip] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'L' | 'P'>('L');
  const [assignedClass, setAssignedClass] = useState('None');
  const [customRoleInput, setCustomRoleInput] = useState('');
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'Aktif' | 'Nonaktif'>('Aktif');
  
  // Sort state
  const [sortBy, setSortBy] = useState<'name' | 'nip' | 'class'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Import Preview State
  const [importPreview, setImportPreview] = useState<{
    fileName: string;
    parsedData: Partial<Teacher>[];
  } | null>(null);
  const [importMode, setImportMode] = useState<'UPDATE' | 'SKIP_EXISTING' | 'ADD_ALL'>('UPDATE');
  const [isProcessingImport, setIsProcessingImport] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // List of available classes derived from real-time student data
  const classesList = useMemo(() => {
    return getAllClasses(students);
  }, [students]);

  const isTendikRole = (role: string) => {
    if (!role || role === 'None' || role === 'Kepala Sekolah' || role.toLowerCase().includes('kepala')) return false;
    if (classesList.includes(role) || /^[1-6][A-Z]?$/i.test(role.trim())) return false;
    return true;
  };

  const processTeacherImport = async (parsed: Partial<Teacher>[], mode: 'UPDATE' | 'SKIP_EXISTING' | 'ADD_ALL' = 'UPDATE') => {
    const now = new Date().toISOString();
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const currentTeachers = [...useStore.getState().teachers];

    for (const imp of parsed) {
      const impNip = imp.nip ? String(imp.nip).trim() : '';
      const impName = imp.name ? String(imp.name).trim().toLowerCase() : '';

      if (!impName && !impNip) continue;

      let existingIdx = -1;
      if (mode !== 'ADD_ALL') {
        existingIdx = currentTeachers.findIndex(e => {
          const eNip = e.nip ? String(e.nip).trim() : '';
          const eName = e.name ? String(e.name).trim().toLowerCase() : '';

          if (impNip && eNip && impNip === eNip) return true;
          if (impName && eName && impName === eName) return true;
          return false;
        });
      }

      if (existingIdx >= 0) {
        if (mode === 'SKIP_EXISTING') {
          skippedCount++;
          continue;
        }

        // UPDATE mode
        const existing = currentTeachers[existingIdx];
        const updated: Teacher = {
          ...existing,
          nip: impNip || existing.nip,
          name: imp.name?.trim() || existing.name,
          gender: imp.gender || existing.gender,
          class: imp.class || existing.class,
          phone: imp.phone || existing.phone,
          email: imp.email || existing.email,
          status: imp.status || existing.status,
          updatedAt: now,
        };
        currentTeachers[existingIdx] = updated;
        useStore.getState().updateTeacher(existing.id, updated);
        updatedCount++;
      } else {
        const newTeacher: Teacher = {
          id: generateId(),
          nip: impNip,
          name: imp.name?.trim() || 'Pegawai',
          gender: imp.gender || 'L',
          class: imp.class || 'None',
          phone: imp.phone || '',
          email: imp.email || '',
          status: imp.status || 'Aktif',
          createdAt: now,
          updatedAt: now,
        };
        currentTeachers.push(newTeacher);
        useStore.getState().addTeacher(newTeacher);
        addedCount++;
      }
    }

    const finalTeachers = useStore.getState().teachers;
    await triggerSync(finalTeachers);
    
    let msg = `Proses Import GTK Selesai!\n• ${addedCount} data baru ditambahkan\n• ${updatedCount} data lama diperbarui/ditimpa`;
    if (skippedCount > 0) {
      msg += `\n• ${skippedCount} data diabaikan (sudah ada)`;
    }
    alert(msg);
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    setIsProcessingImport(true);
    try {
      await processTeacherImport(importPreview.parsedData, importMode);
      setImportPreview(null);
    } catch (err: any) {
      console.error(err);
      alert("Terjadi kesalahan saat memproses import: " + (err?.message || err));
    } finally {
      setIsProcessingImport(false);
    }
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await importTeachersFromExcel(file);
      if (parsed.length === 0) {
        alert("File kosong atau tidak ada data yang valid.");
        return;
      }

      setImportPreview({
        fileName: file.name,
        parsedData: parsed
      });
      setImportMode('UPDATE');
    } catch (err: any) {
      console.error(err);
      alert("Gagal mengimpor file Excel: " + (err?.message || err));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Sync to sheets immediately when data is changed
  const triggerSync = async (updatedTeachers: Teacher[]) => {
    if (!settings.scriptUrl) return;
    try {
      setLoading(true);
      setIsSyncingGlobal(true);
      await fetchFromGAS(settings.scriptUrl, {
        action: 'sync',
        data: useStore.getState().students,
        teachers: updatedTeachers
      });
    } catch (e) {
      console.error("Auto sync GTK failed:", e);
    } finally {
      setLoading(false);
      setIsSyncingGlobal(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingTeacher(null);
    setNip('');
    setName('');
    setGender('L');
    setAssignedClass('None');
    setIsCustomRole(false);
    setCustomRoleInput('');
    setPhone('');
    setEmail('');
    setStatus('Aktif');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (t: Teacher) => {
    setEditingTeacher(t);
    setNip(t.nip);
    setName(t.name);
    setGender(t.gender);
    setPhone(t.phone);
    setEmail(t.email);
    setStatus(t.status);

    const isPresetOption = t.class === 'Kepala Sekolah' || t.class === 'None' || classesList.includes(t.class) || TENDIK_PRESETS.includes(t.class);
    if (isPresetOption) {
      setAssignedClass(t.class);
      setIsCustomRole(false);
      setCustomRoleInput('');
    } else {
      setAssignedClass('CUSTOM');
      setIsCustomRole(true);
      setCustomRoleInput(t.class);
    }

    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalRole = isCustomRole ? (customRoleInput.trim() || 'Tenaga Kependidikan') : assignedClass;

    if (editingTeacher) {
      const updated: Partial<Teacher> = {
        nip,
        name,
        gender,
        class: finalRole,
        phone,
        email,
        status,
        updatedAt: new Date().toISOString()
      };
      updateTeacher(editingTeacher.id, updated);
      
      const currentTeachers = useStore.getState().teachers;
      await triggerSync(currentTeachers);
    } else {
      const newTeacher: Teacher = {
        id: crypto.randomUUID(),
        nip,
        name,
        gender,
        class: finalRole,
        phone,
        email,
        status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      addTeacher(newTeacher);
      
      const currentTeachers = useStore.getState().teachers;
      await triggerSync(currentTeachers);
    }
    
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus data pegawai/guru "${name}"?`)) {
      const updated = teachers.filter(t => t.id !== id);
      deleteTeacher(id);
      await triggerSync(updated);
    }
  };

  // Filter & Search logic
  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      const matchesSearch = 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.nip.includes(searchTerm) || 
        (t.email && t.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.class && t.class.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'Semua' || t.status === statusFilter;
      
      let matchesClass = true;
      if (classFilter === 'Kepala Sekolah') {
        matchesClass = t.class === 'Kepala Sekolah' || t.class.toLowerCase().includes('kepala');
      } else if (classFilter === 'Guru') {
        matchesClass = !isTendikRole(t.class);
      } else if (classFilter === 'Wali Kelas') {
        matchesClass = t.class !== 'None' && t.class !== 'Kepala Sekolah' && !t.class.toLowerCase().includes('kepala') && !isTendikRole(t.class);
      } else if (classFilter === 'None') {
        matchesClass = t.class === 'None';
      } else if (classFilter === 'Tendik') {
        matchesClass = isTendikRole(t.class);
      } else if (classFilter !== 'Semua') {
        matchesClass = t.class === classFilter;
      }
      
      return matchesSearch && matchesStatus && matchesClass;
    });
  }, [teachers, searchTerm, statusFilter, classFilter, classesList]);

  // Sort logic
  const sortedTeachers = useMemo(() => {
    return [...filteredTeachers].sort((a, b) => {
      let aVal = a[sortBy] || '';
      let bVal = b[sortBy] || '';
      
      if (sortBy === 'class') {
        aVal = a.class === 'None' ? 'ZZZ' : a.class;
        bVal = b.class === 'None' ? 'ZZZ' : b.class;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredTeachers, sortBy, sortOrder]);

  const toggleSort = (field: 'name' | 'nip' | 'class') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const renderRoleBadge = (role: string) => {
    if (!role || role === 'None') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <UserCheck size={13} className="text-blue-500" />
          Guru Mapel
        </span>
      );
    }
    if (role === 'Kepala Sekolah' || role.toLowerCase().includes('kepala')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
          <Award size={13} className="text-amber-600" />
          Kepala Sekolah
        </span>
      );
    }
    if (role.toLowerCase().includes('operator')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
          <Laptop size={13} className="text-purple-600" />
          {role}
        </span>
      );
    }
    if (role.toLowerCase().includes('penjaga')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
          <Key size={13} className="text-orange-600" />
          {role}
        </span>
      );
    }
    if (role.toLowerCase().includes('satpam') || role.toLowerCase().includes('keamanan')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
          <Shield size={13} className="text-slate-600" />
          {role}
        </span>
      );
    }
    if (role.toLowerCase().includes('bersih') || role.toLowerCase().includes('kebersihan')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <Sparkles size={13} className="text-emerald-600" />
          {role}
        </span>
      );
    }
    if (role.toLowerCase().includes('administrasi') || role.toLowerCase().includes('tu') || role.toLowerCase().includes('tata usaha')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">
          <FileText size={13} className="text-cyan-600" />
          {role}
        </span>
      );
    }
    if (role.toLowerCase().includes('perpus') || role.toLowerCase().includes('pustaka')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200">
          <BookOpen size={13} className="text-teal-600" />
          {role}
        </span>
      );
    }
    if (classesList.includes(role) || /^[1-6][A-Z]?$/i.test(role)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
          <GraduationCap size={13} className="text-indigo-600" />
          Wali Kelas {role}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-violet-100 text-violet-800 border border-violet-200">
        <Briefcase size={13} className="text-violet-600" />
        {role}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-indigo-900 flex items-center gap-3">
            <GraduationCap className="text-indigo-600" size={32} />
            Data Guru & Tenaga Kependidikan (GTK)
          </h2>
          <p className="text-gray-500 mt-1 font-medium">Kelola data seluruh pendidik (Guru) dan tenaga kependidikan (Operator, Penjaga, Satpam, Kebersihan, TU).</p>
        </div>
        
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto">
          <input 
            type="file" 
            accept=".xlsx, .xls"
            className="hidden" 
            ref={fileInputRef}
            onChange={handleExcelImport}
          />
          <button 
            onClick={() => downloadTeacherExcelTemplate()} 
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-100/70 font-semibold text-xs sm:text-sm shadow-sm transition active:scale-95 duration-150"
          >
            <FileSpreadsheet size={16} /> <span className="truncate">Template Excel</span>
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-green-600 text-white rounded-xl shadow-lg shadow-green-200/50 hover:bg-green-700 font-medium text-xs sm:text-sm transition active:scale-95 duration-150"
          >
            <Upload size={16} /> <span className="truncate">Import Excel</span>
          </button>
          <button 
            onClick={() => exportTeachersToExcel(filteredTeachers, `Daftar_GTK_${new Date().toISOString().slice(0, 10)}.xlsx`)} 
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-200/50 hover:bg-emerald-700 font-medium text-xs sm:text-sm transition active:scale-95 duration-150"
          >
            <FileSpreadsheet size={16} /> <span className="truncate">Export Excel</span>
          </button>
          <button 
            onClick={handleOpenAddModal}
            className="btn flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2.5 rounded-xl shadow-md transition-all active:scale-95 duration-150 text-xs sm:text-sm col-span-2 sm:col-span-1"
          >
            <Plus size={16} />
            <span className="truncate">Tambah GTK</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Pegawai / GTK</p>
            <p className="text-xl font-black text-indigo-950">{teachers.length} <span className="text-xs font-normal text-gray-500">Orang</span></p>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <GraduationCap size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Guru / Pengajar</p>
            <p className="text-xl font-black text-amber-700">
              {teachers.filter(t => !isTendikRole(t.class)).length} <span className="text-xs font-normal text-gray-500">Orang</span>
            </p>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Briefcase size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Tenaga Kependidikan</p>
            <p className="text-xl font-black text-purple-700">
              {teachers.filter(t => isTendikRole(t.class)).length} <span className="text-xs font-normal text-gray-500">Staff</span>
            </p>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Status Aktif</p>
            <p className="text-xl font-black text-emerald-700">
              {teachers.filter(t => t.status === 'Aktif').length} <span className="text-xs font-normal text-gray-500">Orang</span>
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white/70 backdrop-blur-md p-5 rounded-3xl border border-white/80 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Cari NIP, nama, atau jabatan..." 
              className="input pl-11 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-indigo-500" />
            <select 
              className="input py-2.5"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="Semua">Semua Status</option>
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Nonaktif</option>
            </select>
          </div>

          {/* Class / Jabatan Filter */}
          <div className="flex items-center gap-2">
            <GraduationCap size={16} className="text-indigo-500" />
            <select 
              className="input py-2.5"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              <option value="Semua">Semua Jabatan / Tugas</option>
              <option value="Kepala Sekolah">⭐ Kepala Sekolah</option>
              <option value="Guru">📘 Semua Pendidik / Guru</option>
              <option value="Wali Kelas">🏫 Semua Wali Kelas</option>
              <option value="None">Guru Mapel</option>
              <option value="Tendik">💼 Semua Tenaga Kependidikan</option>
              {TENDIK_PRESETS.map(preset => (
                <option key={preset} value={preset}>— {preset}</option>
              ))}
              {classesList.map(c => (
                <option key={c} value={c}>— Wali Kelas {c}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Teachers List Card */}
      <div className="bg-white/70 backdrop-blur-md rounded-3xl border border-white/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-indigo-100">
            <thead>
              <tr className="border-b border-indigo-100 bg-indigo-50/40 text-xs font-bold text-indigo-900 uppercase tracking-wider">
                <th className="p-4 text-center w-12 border border-indigo-100">No</th>
                <th className="p-4 cursor-pointer hover:bg-indigo-50 transition border border-indigo-100" onClick={() => toggleSort('nip')}>
                  NIP {sortBy === 'nip' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="p-4 cursor-pointer hover:bg-indigo-50 transition border border-indigo-100" onClick={() => toggleSort('name')}>
                  Nama Lengkap {sortBy === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="p-4 border border-indigo-100">L/P</th>
                <th className="p-4 cursor-pointer hover:bg-indigo-50 transition border border-indigo-100" onClick={() => toggleSort('class')}>
                  Jabatan / Penugasan {sortBy === 'class' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="p-4 border border-indigo-100">Kontak</th>
                <th className="p-4 text-center border border-indigo-100">Status</th>
                <th className="p-4 text-center w-28 border border-indigo-100">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-50 text-sm">
              {sortedTeachers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500 font-medium border border-indigo-100">
                    Tidak ada data guru atau tenaga kependidikan yang ditemukan
                  </td>
                </tr>
              ) : (
                sortedTeachers.map((t, idx) => (
                  <tr key={t.id} className="hover:bg-white/40 transition">
                    <td className="p-4 text-center font-semibold text-gray-400 border border-indigo-100">{idx + 1}</td>
                    <td className="p-4 font-mono font-medium text-gray-600 border border-indigo-100">{t.nip || '-'}</td>
                    <td className="p-4 font-bold text-gray-900 border border-indigo-100">{t.name}</td>
                    <td className="p-4 text-gray-600 border border-indigo-100 font-bold text-center">
                      {t.gender}
                    </td>
                    <td className="p-4 border border-indigo-100">
                      {renderRoleBadge(t.class)}
                    </td>
                    <td className="p-4 space-y-1 text-xs border border-indigo-100">
                      {t.phone && (
                        <div className="flex items-center gap-1 text-gray-600 font-medium">
                          <Phone size={12} className="text-indigo-400" />
                          <span>{t.phone}</span>
                        </div>
                      )}
                      {t.email && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <Mail size={12} className="text-indigo-400" />
                          <span>{t.email}</span>
                        </div>
                      )}
                      {!t.phone && !t.email && <span className="text-gray-400">-</span>}
                    </td>
                    <td className="p-4 text-center border border-indigo-100">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        t.status === 'Aktif' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {t.status === 'Aktif' ? (
                          <>
                            <CheckCircle2 size={12} />
                            <span>Aktif</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={12} />
                            <span>Nonaktif</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="p-4 text-center border border-indigo-100">
                      <div className="flex justify-center items-center gap-2">
                        <button 
                          onClick={() => handleOpenEditModal(t)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(t.id, t.name)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Hapus"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <GraduationCap className="w-6 h-6" />
                <h3 className="text-xl font-bold">{editingTeacher ? 'Edit Data Pegawai / GTK' : 'Tambah GTK Baru'}</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-full transition">
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
              
              {/* NIP */}
              <div>
                <label className="label">NIP (Nomor Induk Pegawai)</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Masukkan NIP (jika ada)" 
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                />
              </div>

              {/* Nama Guru / Pegawai */}
              <div>
                <label className="label">Nama Lengkap <span className="text-rose-500">*</span></label>
                <input 
                  type="text" 
                  className="input font-bold" 
                  placeholder="Contoh: Budi Santoso, S.Pd. atau Sutrisno" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Jenis Kelamin & Jabatan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Jenis Kelamin</label>
                  <select 
                    className="input"
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>

                <div>
                  <label className="label">Jabatan / Penugasan <span className="text-rose-500">*</span></label>
                  <select 
                    className="input font-bold"
                    value={isCustomRole ? 'CUSTOM' : assignedClass}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'CUSTOM') {
                        setIsCustomRole(true);
                      } else {
                        setIsCustomRole(false);
                        setAssignedClass(val);
                      }
                    }}
                  >
                    <optgroup label="--- GURU / PENDIDIK ---">
                      <option value="Kepala Sekolah">⭐ Kepala Sekolah</option>
                      <option value="None">📘 Guru Mapel (Pengajar)</option>
                      {classesList.map(c => (
                        <option key={c} value={c}>🏫 Wali Kelas {c}</option>
                      ))}
                    </optgroup>
                    <optgroup label="--- TENAGA KEPENDIDIKAN ---">
                      <option value="Operator Sekolah">💻 Operator Sekolah</option>
                      <option value="Penjaga Sekolah">🔑 Penjaga Sekolah</option>
                      <option value="Satpam / Keamanan">🛡️ Satpam / Keamanan</option>
                      <option value="Petugas Kebersihan">🧹 Petugas Kebersihan</option>
                      <option value="Tenaga Administrasi (TU)">🏢 Tenaga Administrasi (TU)</option>
                      <option value="Petugas Perpustakaan">📚 Petugas Perpustakaan</option>
                    </optgroup>
                    <optgroup label="--- LAINNYA ---">
                      <option value="CUSTOM">✏️ Jabatan / Tugas Lainnya...</option>
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Custom Role Input */}
              {isCustomRole && (
                <div className="bg-amber-50/80 p-3 rounded-2xl border border-amber-200">
                  <label className="label text-amber-900 font-bold">Ketik Nama Jabatan / Tugas</label>
                  <input 
                    type="text" 
                    className="input bg-white font-bold" 
                    placeholder="Contoh: Sopir Bus Sekolah / Teknisi Lab"
                    value={customRoleInput}
                    onChange={(e) => setCustomRoleInput(e.target.value)}
                    required={isCustomRole}
                  />
                </div>
              )}

              {/* No Telepon & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">No. Telepon / WhatsApp</label>
                  <input 
                    type="tel" 
                    className="input" 
                    placeholder="Contoh: 08123456789" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input 
                    type="email" 
                    className="input" 
                    placeholder="Contoh: nama@sekolah.sch.id" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="label">Status Pegawai</label>
                <select 
                  className="input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-indigo-50">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 font-semibold transition"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition"
                >
                  <Save size={18} />
                  <span>Simpan</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal Selection Import CSV Guru */}
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
                  <h3 className="font-bold text-lg">Menu Import Data GTK</h3>
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
                        <th className="p-2">NIP</th>
                        <th className="p-2">Nama</th>
                        <th className="p-2">Jabatan</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {importPreview.parsedData.slice(0, 3).map((t, idx) => (
                        <tr key={idx} className="bg-white">
                          <td className="p-2 font-mono text-gray-600">{t.nip || '-'}</td>
                          <td className="p-2 font-medium text-gray-800">{t.name || '-'}</td>
                          <td className="p-2 text-gray-600">{t.class || 'None'}</td>
                          <td className="p-2 text-gray-600">{t.status || 'Aktif'}</td>
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
                      name="importModeGuru" 
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
                        Jika pegawai sudah ada (cocok NIP / Nama), data lama akan diperbarui/ditimpa. Pegawai yang belum ada akan ditambahkan.
                      </p>
                    </div>
                  </label>

                  {/* Option 2: Skip Existing */}
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
                      name="importModeGuru" 
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
                        Jika pegawai sudah ada di sistem, datanya tidak disentuh/tidak ditimpa. Hanya pegawai baru yang dimasukkan.
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
                      name="importModeGuru" 
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

