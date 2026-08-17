import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Student } from '../types';
import { CLASSES, generateId, cn, getAllClasses } from '../lib/utils';
import { 
  Search, Filter, RefreshCw, X, FileOutput, FileInput, 
  School, LogOut, LogIn, Calendar, Plus, MapPin, User, ArrowLeftRight 
} from 'lucide-react';
import { fetchFromGAS } from '../lib/api';

export default function MutasiList() {
  const { 
    students, addStudent, updateStudent, deleteStudent, settings,
    setLoading, setIsSyncingGlobal 
  } = useStore();

  const [activeTab, setActiveTab] = useState<'keluar' | 'masuk' | 'riwayat'>('keluar');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');

  // Stats calculation
  const totalKeluarList = useMemo(() => students.filter(s => s.status === 'Pindah' || s.status === 'Keluar'), [students]);
  const totalMasukList = useMemo(() => students.filter(s => s.status === 'Aktif' && !!s.sekolahAsal), [students]);

  const countKeluarL = useMemo(() => totalKeluarList.filter(s => s.gender === 'L').length, [totalKeluarList]);
  const countKeluarP = useMemo(() => totalKeluarList.filter(s => s.gender === 'P').length, [totalKeluarList]);
  const countMasukL = useMemo(() => totalMasukList.filter(s => s.gender === 'L').length, [totalMasukList]);
  const countMasukP = useMemo(() => totalMasukList.filter(s => s.gender === 'P').length, [totalMasukList]);

  // Combined mutation history
  const allMutasiStudents = useMemo(() => {
    return students.filter(s => {
      const isKeluar = s.status === 'Pindah' || s.status === 'Keluar';
      const isMasuk = s.status === 'Aktif' && !!s.sekolahAsal;
      if (!isKeluar && !isMasuk) return false;

      const searchString = searchTerm.toLowerCase();
      const matchesSearch = s.name.toLowerCase().includes(searchString) || 
                            s.nis.toLowerCase().includes(searchString) ||
                            (s.nisn && s.nisn.toLowerCase().includes(searchString));
      const matchesClass = filterClass ? s.class === filterClass : true;
      return matchesSearch && matchesClass;
    });
  }, [students, searchTerm, filterClass]);
  
  // Modals state
  const [isKeluarModalOpen, setIsKeluarModalOpen] = useState(false);
  const [isMasukModalOpen, setIsMasukModalOpen] = useState(false);

  // Form states for Mutasi Keluar
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [keluarStatus, setKeluarStatus] = useState<'Pindah' | 'Keluar'>('Pindah');
  const [sekolahTujuan, setSekolahTujuan] = useState('');
  const [tanggalKeluar, setTanggalKeluar] = useState(new Date().toISOString().slice(0, 10));

  // Form states for Mutasi Masuk
  const [masukNis, setMasukNis] = useState('');
  const [masukNisn, setMasukNisn] = useState('');
  const [masukName, setMasukName] = useState('');
  const [masukClass, setMasukClass] = useState('1A');
  const [masukGender, setMasukGender] = useState<'L' | 'P'>('L');
  const [masukPob, setMasukPob] = useState('');
  const [masukDob, setMasukDob] = useState('');
  const [masukAddress, setMasukAddress] = useState('');
  const [masukParentName, setMasukParentName] = useState('');
  const [sekolahAsal, setSekolahAsal] = useState('');
  const [tanggalMasuk, setTanggalMasuk] = useState(new Date().toISOString().slice(0, 10));

  // Get active students for Mutasi Keluar selection
  const activeStudents = useMemo(() => students.filter(s => s.status === 'Aktif'), [students]);

  // Filter active students by search query
  const filteredActiveStudents = useMemo(() => {
    if (!studentSearchQuery.trim()) return activeStudents;
    const q = studentSearchQuery.toLowerCase().trim();
    return activeStudents.filter(s => 
      s.name.toLowerCase().includes(q) ||
      s.nis.toLowerCase().includes(q) ||
      (s.nisn && s.nisn.toLowerCase().includes(q)) ||
      s.class.toLowerCase().includes(q)
    );
  }, [activeStudents, studentSearchQuery]);

  const selectedStudentObject = useMemo(() => {
    return activeStudents.find(s => s.id === selectedStudentId);
  }, [activeStudents, selectedStudentId]);

  // Sync with Sheets
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
    } catch (e) {
      console.error("Auto sync mutations failed:", e);
    } finally {
      setLoading(false);
      setIsSyncingGlobal(false);
    }
  };

  // Mutasi Keluar: Students who are Pindah or Keluar
  const mutasiKeluarStudents = useMemo(() => {
    return students.filter(s => {
      const isKeluar = s.status === 'Pindah' || s.status === 'Keluar';
      if (!isKeluar) return false;

      const searchString = searchTerm.toLowerCase();
      const matchesSearch = s.name.toLowerCase().includes(searchString) || 
                            s.nis.toLowerCase().includes(searchString) ||
                            (s.nisn && s.nisn.toLowerCase().includes(searchString));
      const matchesClass = filterClass ? s.class === filterClass : true;
      return matchesSearch && matchesClass;
    });
  }, [students, searchTerm, filterClass]);

  // Mutasi Masuk: Active students who have a sekolahAsal field set
  const mutasiMasukStudents = useMemo(() => {
    return students.filter(s => {
      const isMasuk = s.status === 'Aktif' && !!s.sekolahAsal;
      if (!isMasuk) return false;

      const searchString = searchTerm.toLowerCase();
      const matchesSearch = s.name.toLowerCase().includes(searchString) || 
                            s.nis.toLowerCase().includes(searchString) ||
                            (s.nisn && s.nisn.toLowerCase().includes(searchString));
      const matchesClass = filterClass ? s.class === filterClass : true;
      return matchesSearch && matchesClass;
    });
  }, [students, searchTerm, filterClass]);

  const handleOpenKeluarModal = () => {
    setSelectedStudentId('');
    setStudentSearchQuery('');
    setKeluarStatus('Pindah');
    setSekolahTujuan('');
    setTanggalKeluar(new Date().toISOString().slice(0, 10));
    setIsKeluarModalOpen(true);
  };

  const handleOpenMasukModal = () => {
    setMasukNis('');
    setMasukNisn('');
    setMasukName('');
    setMasukClass('1A');
    setMasukGender('L');
    setMasukPob('');
    setMasukDob('');
    setMasukAddress('');
    setMasukParentName('');
    setSekolahAsal('');
    setTanggalMasuk(new Date().toISOString().slice(0, 10));
    setIsMasukModalOpen(true);
  };

  const handleSaveKeluarMutasi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      alert('Pilih siswa terlebih dahulu!');
      return;
    }
    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;

    if (keluarStatus === 'Pindah' && !sekolahTujuan.trim()) {
      alert('Harap masukkan sekolah tujuan mutasi!');
      return;
    }

    const confirmText = keluarStatus === 'Pindah' 
      ? `Mutasi siswa "${student.name}" ke ${sekolahTujuan}?`
      : `Keluarkan siswa "${student.name}"?`;

    if (window.confirm(confirmText)) {
      updateStudent(selectedStudentId, { 
        status: keluarStatus,
        sekolahTujuan: keluarStatus === 'Pindah' ? sekolahTujuan : undefined,
        tanggalMutasi: tanggalKeluar,
        updatedAt: new Date().toISOString()
      });
      setIsKeluarModalOpen(false);
      
      const currentStudents = useStore.getState().students;
      await triggerSync(currentStudents);
    }
  };

  const handleSaveMasukMutasi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masukNis || !masukName || !sekolahAsal) {
      alert('NIS, Nama Siswa, dan Sekolah Asal wajib diisi!');
      return;
    }

    const now = new Date().toISOString();
    const newStudent: Student = {
      id: generateId(),
      nis: masukNis,
      nisn: masukNisn || undefined,
      name: masukName,
      class: masukClass,
      gender: masukGender,
      pob: masukPob || undefined,
      dob: masukDob,
      address: masukAddress,
      parentName: masukParentName,
      status: 'Aktif',
      sekolahAsal,
      tanggalMutasi: tanggalMasuk,
      createdAt: now,
      updatedAt: now,
    };

    addStudent(newStudent);
    setIsMasukModalOpen(false);

    const currentStudents = useStore.getState().students;
    await triggerSync(currentStudents);
    alert(`Berhasil menambahkan siswa mutasi masuk: ${masukName}`);
  };

  const handleRestore = async (id: string, name: string) => {
    if (window.confirm(`Kembalikan status "${name}" menjadi Aktif normal?`)) {
      updateStudent(id, { 
        status: 'Aktif',
        sekolahTujuan: undefined,
        sekolahAsal: undefined,
        tanggalMutasi: undefined,
        updatedAt: new Date().toISOString()
      });
      
      const currentStudents = useStore.getState().students;
      await triggerSync(currentStudents);
    }
  };

  const handleDeleteMasuk = async (id: string, name: string) => {
    if (window.confirm(`Hapus permanen data siswa mutasi masuk "${name}"?`)) {
      deleteStudent(id);
      
      const currentStudents = useStore.getState().students;
      await triggerSync(currentStudents);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-indigo-900 flex items-center gap-2">
            <ArrowLeftRight className="text-indigo-600" />
            Mutasi & Keluar Siswa
          </h2>
          <p className="text-gray-500 mt-1 font-medium">Manajemen & riwayat lengkap mutasi siswa (Keluar ke Sekolah Lain & Transfer Masuk).</p>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-white/80 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
            <FileOutput size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Mutasi Keluar</p>
            <p className="text-2xl font-black text-orange-600">{totalKeluarList.length} <span className="text-xs font-semibold text-gray-400">Siswa</span></p>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">L: {countKeluarL} • P: {countKeluarP}</p>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-white/80 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
            <FileInput size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Mutasi Masuk</p>
            <p className="text-2xl font-black text-green-600">{totalMasukList.length} <span className="text-xs font-semibold text-gray-400">Siswa</span></p>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">L: {countMasukL} • P: {countMasukP}</p>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-white/80 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <ArrowLeftRight size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Selisih Siswa Net</p>
            <p className={cn("text-2xl font-black", (totalMasukList.length - totalKeluarList.length) >= 0 ? "text-indigo-600" : "text-rose-600")}>
              {(totalMasukList.length - totalKeluarList.length) >= 0 ? `+${totalMasukList.length - totalKeluarList.length}` : (totalMasukList.length - totalKeluarList.length)}
              <span className="text-xs font-semibold text-gray-400 ml-1">Siswa</span>
            </p>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">Masuk dikurangi Keluar</p>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-white/80 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Riwayat</p>
            <p className="text-2xl font-black text-purple-600">{totalKeluarList.length + totalMasukList.length} <span className="text-xs font-semibold text-gray-400">Transaksi</span></p>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">Rekap M. Keluar & Masuk</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-indigo-100 overflow-x-auto hide-scrollbar">
        <button 
          onClick={() => { setActiveTab('keluar'); setSearchTerm(''); }}
          className={cn(
            "flex items-center gap-2 px-6 py-3.5 font-bold text-sm border-b-2 transition duration-200 whitespace-nowrap",
            activeTab === 'keluar' 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-gray-400 hover:text-indigo-600"
          )}
        >
          <LogOut size={16} />
          Mutasi Keluar ({totalKeluarList.length})
        </button>
        <button 
          onClick={() => { setActiveTab('masuk'); setSearchTerm(''); }}
          className={cn(
            "flex items-center gap-2 px-6 py-3.5 font-bold text-sm border-b-2 transition duration-200 whitespace-nowrap",
            activeTab === 'masuk' 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-gray-400 hover:text-indigo-600"
          )}
        >
          <LogIn size={16} />
          Mutasi Masuk ({totalMasukList.length})
        </button>
        <button 
          onClick={() => { setActiveTab('riwayat'); setSearchTerm(''); }}
          className={cn(
            "flex items-center gap-2 px-6 py-3.5 font-bold text-sm border-b-2 transition duration-200 whitespace-nowrap",
            activeTab === 'riwayat' 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-gray-400 hover:text-indigo-600"
          )}
        >
          <Calendar size={16} />
          Semua Riwayat Mutasi ({allMutasiStudents.length})
        </button>
      </div>

      {/* Filter and Control Area */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white/40 p-4 rounded-3xl border border-white/60 shadow-sm backdrop-blur-md">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder={activeTab === 'keluar' ? "Cari siswa mutasi keluar..." : "Cari siswa mutasi masuk..."} 
            className="w-full bg-white/60 backdrop-blur-lg border border-white/80 px-5 py-3 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 pl-12 font-medium text-gray-800 placeholder-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
          <div className="relative shrink-0">
            <Filter className="absolute left-4 top-3.5 text-gray-400" size={18} />
            <select 
              className="bg-white/60 backdrop-blur-lg border border-white/80 px-5 py-3 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 pl-11 appearance-none font-medium text-gray-700 min-w-[120px]"
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
            >
              <option value="">Semua Kelas</option>
              {getAllClasses(students).map(c => <option key={c} value={c}>Kelas {c}</option>)}
            </select>
          </div>
          
          {activeTab === 'keluar' ? (
            <button onClick={handleOpenKeluarModal} className="btn justify-center bg-orange-600 hover:bg-orange-700 shadow-orange-200 w-full sm:w-auto shrink-0 whitespace-nowrap">
              <FileOutput className="mr-2" size={18} /> Proses Mutasi Keluar
            </button>
          ) : (
            <button onClick={handleOpenMasukModal} className="btn justify-center bg-green-600 hover:bg-green-700 shadow-green-200 w-full sm:w-auto shrink-0 whitespace-nowrap">
              <Plus className="mr-2" size={18} /> Tambah Siswa Masuk
            </button>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white/70 backdrop-blur-2xl rounded-[2rem] border border-white/90 shadow-lg overflow-hidden flex flex-col mb-10">
        <div className="overflow-x-auto">
          {activeTab === 'keluar' ? (
            /* Mutasi Keluar Table */
            <table className="w-full text-sm text-left border-collapse min-w-[800px] border border-indigo-100">
              <thead className="bg-indigo-50/50 z-10 sticky top-0">
                <tr className="text-indigo-950 text-[11px] uppercase tracking-widest border-b border-indigo-100">
                  <th className="px-6 py-4 font-bold border border-indigo-100">NIS / NISN</th>
                  <th className="px-6 py-4 font-bold border border-indigo-100">Nama Lengkap</th>
                  <th className="px-4 py-4 font-bold text-center border border-indigo-100">Kelas Asal</th>
                  <th className="px-4 py-4 font-bold text-center border border-indigo-100">L/P</th>
                  <th className="px-6 py-4 font-bold border border-indigo-100">Sekolah Tujuan</th>
                  <th className="px-6 py-4 font-bold border border-indigo-100">Tanggal Mutasi</th>
                  <th className="px-6 py-4 font-bold border border-indigo-100">Status</th>
                  <th className="px-6 py-4 font-bold text-right border border-indigo-100">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-50">
                {mutasiKeluarStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500 font-medium border border-indigo-100">
                      Tidak ada data siswa mutasi keluar.
                    </td>
                  </tr>
                ) : (
                  mutasiKeluarStudents.map(student => (
                    <tr key={student.id} className="hover:bg-white/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-gray-600 border border-indigo-100">
                        <div>{student.nis}</div>
                        {student.nisn && <div className="text-xs text-gray-400">{student.nisn}</div>}
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900 border border-indigo-100">{student.name}</td>
                      <td className="px-4 py-4 text-center border border-indigo-100">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-700">
                          {student.class}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center font-medium text-gray-600 border border-indigo-100">{student.gender}</td>
                      <td className="px-6 py-4 text-indigo-950 font-semibold border border-indigo-100">
                        {student.sekolahTujuan || <span className="text-gray-400 italic font-normal">- (Keluar)</span>}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-500 border border-indigo-100">
                        {student.tanggalMutasi ? new Date(student.tanggalMutasi).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                      </td>
                      <td className="px-6 py-4 border border-indigo-100">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap",
                          student.status === 'Keluar' ? 'bg-rose-100 text-rose-700' : 'bg-orange-100 text-orange-700'
                        )}>
                          <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", 
                            student.status === 'Keluar' ? 'bg-rose-500' : 'bg-orange-500'
                          )}></span>
                          {student.status === 'Pindah' ? 'Pindah Sekolah' : 'Keluar'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right border border-indigo-100">
                        <button onClick={() => handleRestore(student.id, student.name)} className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-green-600 shadow-sm hover:bg-green-50 transition active:scale-95">
                          Kembalikan Aktif
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : activeTab === 'masuk' ? (
            /* Mutasi Masuk Table */
            <table className="w-full text-sm text-left border-collapse min-w-[800px] border border-indigo-100">
              <thead className="bg-indigo-50/50 z-10 sticky top-0">
                <tr className="text-indigo-950 text-[11px] uppercase tracking-widest border-b border-indigo-100">
                  <th className="px-6 py-4 font-bold border border-indigo-100">NIS / NISN</th>
                  <th className="px-6 py-4 font-bold border border-indigo-100">Nama Lengkap</th>
                  <th className="px-4 py-4 font-bold text-center border border-indigo-100">Kelas Baru</th>
                  <th className="px-4 py-4 font-bold text-center border border-indigo-100">L/P</th>
                  <th className="px-6 py-4 font-bold border border-indigo-100">Sekolah Asal</th>
                  <th className="px-6 py-4 font-bold border border-indigo-100">Tanggal Masuk</th>
                  <th className="px-6 py-4 font-bold border border-indigo-100">Status</th>
                  <th className="px-6 py-4 font-bold text-right border border-indigo-100">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-50">
                {mutasiMasukStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500 font-medium border border-indigo-100">
                      Tidak ada data siswa mutasi masuk.
                    </td>
                  </tr>
                ) : (
                  mutasiMasukStudents.map(student => (
                    <tr key={student.id} className="hover:bg-white/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-gray-600 border border-indigo-100">
                        <div>{student.nis}</div>
                        {student.nisn && <div className="text-xs text-gray-400">{student.nisn}</div>}
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900 border border-indigo-100">{student.name}</td>
                      <td className="px-4 py-4 text-center border border-indigo-100">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-700">
                          Kelas {student.class}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center font-medium text-gray-600 border border-indigo-100">{student.gender}</td>
                      <td className="px-6 py-4 text-indigo-900 font-bold border border-indigo-100">
                        {student.sekolahAsal}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-500 border border-indigo-100">
                        {student.tanggalMutasi ? new Date(student.tanggalMutasi).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                      </td>
                      <td className="px-6 py-4 border border-indigo-100">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
                          Mutasi Masuk
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right border border-indigo-100">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleRestore(student.id, student.name)} className="px-2 py-1.5 bg-indigo-50 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition active:scale-95" title="Ubah menjadi siswa aktif biasa">
                            Siswa Biasa
                          </button>
                          <button onClick={() => handleDeleteMasuk(student.id, student.name)} className="px-2 py-1.5 bg-rose-50 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-100 transition active:scale-95">
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            /* Combined History Table */
            <table className="w-full text-sm text-left border-collapse min-w-[850px] border border-indigo-100">
              <thead className="bg-indigo-50/50 z-10 sticky top-0">
                <tr className="text-indigo-950 text-[11px] uppercase tracking-widest border-b border-indigo-100">
                  <th className="px-6 py-4 font-bold border border-indigo-100">Tipe Mutasi</th>
                  <th className="px-6 py-4 font-bold border border-indigo-100">NIS / NISN</th>
                  <th className="px-6 py-4 font-bold border border-indigo-100">Nama Lengkap</th>
                  <th className="px-4 py-4 font-bold text-center border border-indigo-100">Kelas</th>
                  <th className="px-4 py-4 font-bold text-center border border-indigo-100">L/P</th>
                  <th className="px-6 py-4 font-bold border border-indigo-100">Sekolah Asal / Tujuan</th>
                  <th className="px-6 py-4 font-bold border border-indigo-100">Tanggal Mutasi</th>
                  <th className="px-6 py-4 font-bold text-right border border-indigo-100">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-50">
                {allMutasiStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500 font-medium border border-indigo-100">
                      Tidak ada riwayat mutasi siswa.
                    </td>
                  </tr>
                ) : (
                  allMutasiStudents.map(student => {
                    const isMasuk = student.status === 'Aktif' && !!student.sekolahAsal;
                    return (
                      <tr key={student.id} className="hover:bg-white/50 transition-colors">
                        <td className="px-6 py-4 border border-indigo-100">
                          {isMasuk ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                              <LogIn size={13} className="text-emerald-600" />
                              Mutasi Masuk
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
                              <LogOut size={13} className="text-orange-600" />
                              {student.status === 'Pindah' ? 'Pindah Sekolah' : 'Siswa Keluar'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-mono font-medium text-gray-600 border border-indigo-100">
                          <div>{student.nis}</div>
                          {student.nisn && <div className="text-xs text-gray-400">{student.nisn}</div>}
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900 border border-indigo-100">{student.name}</td>
                        <td className="px-4 py-4 text-center border border-indigo-100">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-700">
                            {student.class}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center font-medium text-gray-600 border border-indigo-100">{student.gender}</td>
                        <td className="px-6 py-4 border border-indigo-100">
                          {isMasuk ? (
                            <div className="text-xs">
                              <span className="text-gray-400">Dari: </span>
                              <span className="font-semibold text-emerald-950">{student.sekolahAsal}</span>
                            </div>
                          ) : (
                            <div className="text-xs">
                              <span className="text-gray-400">Ke: </span>
                              <span className="font-semibold text-orange-950">{student.sekolahTujuan || '- (Keluar)'}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-500 border border-indigo-100">
                          {student.tanggalMutasi ? new Date(student.tanggalMutasi).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                        </td>
                        <td className="px-6 py-4 text-right border border-indigo-100">
                          <button onClick={() => handleRestore(student.id, student.name)} className="px-3 py-1.5 bg-indigo-50 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition active:scale-95" title="Kembalikan ke status siswa aktif">
                            Pulihkan
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Mutasi Keluar */}
      {isKeluarModalOpen && (
        <div className="fixed inset-0 bg-indigo-950/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white/95 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl border border-white/50 shadow-2xl w-full max-w-lg mt-auto sm:my-auto transition-transform overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
             <div className="p-5 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-900 text-white sticky top-0 z-10">
               <h3 className="text-xl font-bold">Proses Mutasi Keluar Siswa</h3>
               <button onClick={() => setIsKeluarModalOpen(false)} className="p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition">
                 <X size={20} />
               </button>
             </div>
             <form onSubmit={handleSaveKeluarMutasi} className="p-5 sm:p-6 space-y-4">
                <div>
                  {selectedStudentObject ? (
                    <div className="space-y-1.5">
                      <label className="label text-indigo-900 font-bold">Siswa Terpilih <span className="text-rose-500">*</span></label>
                      <div className="bg-indigo-50/90 border border-indigo-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-sm shrink-0 shadow-xs">
                            {selectedStudentObject.class}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-indigo-950 text-sm truncate">{selectedStudentObject.name}</h4>
                            <p className="text-xs text-indigo-600 font-mono truncate">
                              NIS: {selectedStudentObject.nis} {selectedStudentObject.nisn ? `| NISN: ${selectedStudentObject.nisn}` : ''} ({selectedStudentObject.gender === 'L' ? 'L' : 'P'})
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudentId('');
                            setStudentSearchQuery('');
                          }}
                          className="px-3 py-1.5 bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-xl text-xs font-bold transition shrink-0 active:scale-95"
                        >
                          Ganti Siswa
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="label">Cari & Pilih Siswa Aktif <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <Search className="absolute left-3.5 top-3 text-indigo-500 w-4 h-4" />
                        <input 
                          type="text" 
                          placeholder="Ketik nama, NIS, NISN, atau kelas..." 
                          className="input pl-10 text-sm font-medium w-full border-indigo-200 focus:border-indigo-500"
                          value={studentSearchQuery}
                          onChange={(e) => setStudentSearchQuery(e.target.value)}
                          autoFocus
                        />
                        {studentSearchQuery && (
                          <button 
                            type="button" 
                            onClick={() => setStudentSearchQuery('')}
                            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 p-1"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {/* List of active students matching search */}
                      <div className="max-h-52 overflow-y-auto border border-indigo-100 rounded-2xl divide-y divide-indigo-50 bg-white shadow-inner">
                        {filteredActiveStudents.length === 0 ? (
                          <div className="p-4 text-center text-gray-400 text-xs font-medium">
                            Tidak ditemukan siswa dengan kata kunci "{studentSearchQuery}".
                          </div>
                        ) : (
                          filteredActiveStudents.slice(0, 30).map(s => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setSelectedStudentId(s.id);
                                if (s.sekolahTujuan) setSekolahTujuan(s.sekolahTujuan);
                              }}
                              className="w-full text-left p-3 hover:bg-indigo-50 transition-colors flex items-center justify-between gap-2 group"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-700 truncate">{s.name}</p>
                                <p className="text-xs text-gray-500 font-mono truncate">
                                  NIS: {s.nis} • Kelas {s.class} • {s.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                                </p>
                              </div>
                              <span className="text-xs font-bold px-3 py-1 bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white text-indigo-700 rounded-xl transition-all shrink-0">
                                Pilih
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                      {filteredActiveStudents.length > 30 && (
                        <p className="text-[11px] text-gray-400 text-center font-medium">
                          Menampilkan 30 dari {filteredActiveStudents.length} siswa aktif. Ketik nama untuk mempersempit pencarian.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="label">Jenis Keluar</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setKeluarStatus('Pindah')}
                      className={cn(
                        "p-3 rounded-2xl border text-sm font-bold transition flex items-center justify-center gap-2",
                        keluarStatus === 'Pindah' 
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700" 
                          : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                      )}
                    >
                      Pindah Sekolah
                    </button>
                    <button
                      type="button"
                      onClick={() => setKeluarStatus('Keluar')}
                      className={cn(
                        "p-3 rounded-2xl border text-sm font-bold transition flex items-center justify-center gap-2",
                        keluarStatus === 'Keluar' 
                          ? "border-rose-600 bg-rose-50 text-rose-700" 
                          : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                      )}
                    >
                      Keluar / Lainnya
                    </button>
                  </div>
                </div>

                {keluarStatus === 'Pindah' && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="label">Sekolah Tujuan Mutasi</label>
                    <input 
                      type="text" 
                      placeholder="Masukkan nama sekolah tujuan..." 
                      className="input font-semibold"
                      value={sekolahTujuan}
                      onChange={e => setSekolahTujuan(e.target.value)}
                      required={keluarStatus === 'Pindah'}
                    />
                  </div>
                )}

                <div>
                  <label className="label">Tanggal Keluar / Mutasi</label>
                  <input 
                    type="date" 
                    className="input" 
                    required 
                    value={tanggalKeluar}
                    onChange={e => setTanggalKeluar(e.target.value)}
                  />
                </div>
                
                <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <FileOutput className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Siswa akan dipindahkan ke daftar mutasi dan statusnya akan disinkronisasikan ke lembar Google Sheets secara otomatis.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                   <button type="button" onClick={() => setIsKeluarModalOpen(false)} className="btn-outline">Batal</button>
                   <button type="submit" className="btn bg-orange-600 hover:bg-orange-700 shadow-orange-100">Simpan Mutasi</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Modal Mutasi Masuk */}
      {isMasukModalOpen && (
        <div className="fixed inset-0 bg-indigo-950/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white/95 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl border border-white/50 shadow-2xl w-full max-w-2xl mt-auto sm:my-auto transition-transform overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
             <div className="p-5 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-green-700 text-white sticky top-0 z-10">
               <h3 className="text-xl font-bold flex items-center gap-2">
                 <School size={20} />
                 Proses Mutasi Masuk Siswa Baru
               </h3>
               <button onClick={() => setIsMasukModalOpen(false)} className="p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition">
                 <X size={20} />
               </button>
             </div>
             <form onSubmit={handleSaveMasukMutasi} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">NIS (Nomor Induk Siswa) <span className="text-rose-500">*</span></label>
                    <input 
                      type="text" 
                      placeholder="Masukkan NIS..." 
                      className="input" 
                      required 
                      value={masukNis}
                      onChange={e => setMasukNis(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">NISN (Nasional) </label>
                    <input 
                      type="text" 
                      placeholder="Masukkan NISN..." 
                      className="input" 
                      value={masukNisn}
                      onChange={e => setMasukNisn(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Nama Lengkap Siswa <span className="text-rose-500">*</span></label>
                  <input 
                    type="text" 
                    placeholder="Nama siswa sesuai akte lahir..." 
                    className="input font-bold" 
                    required 
                    value={masukName}
                    onChange={e => setMasukName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Kelas Penempatan <span className="text-rose-500">*</span></label>
                    <select 
                      className="input font-semibold"
                      value={masukClass}
                      onChange={e => setMasukClass(e.target.value)}
                    >
                      {CLASSES.map(c => <option key={c} value={c}>Kelas {c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Jenis Kelamin <span className="text-rose-500">*</span></label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setMasukGender('L')}
                        className={cn(
                          "p-2.5 rounded-xl border text-sm font-bold transition",
                          masukGender === 'L' ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-gray-200 bg-white"
                        )}
                      >
                        Laki-laki (L)
                      </button>
                      <button
                        type="button"
                        onClick={() => setMasukGender('P')}
                        className={cn(
                          "p-2.5 rounded-xl border text-sm font-bold transition",
                          masukGender === 'P' ? "border-pink-600 bg-pink-50 text-pink-700" : "border-gray-200 bg-white"
                        )}
                      >
                        Perempuan (P)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                  <div>
                    <label className="label">Sekolah Asal Siswa <span className="text-rose-500">*</span></label>
                    <input 
                      type="text" 
                      placeholder="Masukkan Sekolah Asal..." 
                      className="input text-indigo-900 font-bold" 
                      required 
                      value={sekolahAsal}
                      onChange={e => setSekolahAsal(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Tanggal Masuk Sekolah <span className="text-rose-500">*</span></label>
                    <input 
                      type="date" 
                      className="input" 
                      required 
                      value={tanggalMasuk}
                      onChange={e => setTanggalMasuk(e.target.value)}
                    />
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Informasi Tambahan (Opsional)</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Tempat Lahir</label>
                      <input 
                        type="text" 
                        placeholder="Kota tempat lahir..." 
                        className="input" 
                        value={masukPob}
                        onChange={e => setMasukPob(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label">Tanggal Lahir</label>
                      <input 
                        type="date" 
                        className="input" 
                        value={masukDob}
                        onChange={e => setMasukDob(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">Nama Orang Tua / Wali</label>
                    <input 
                      type="text" 
                      placeholder="Nama Ayah/Ibu..." 
                      className="input" 
                      value={masukParentName}
                      onChange={e => setMasukParentName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="label">Alamat Lengkap</label>
                    <textarea 
                      placeholder="Alamat tempat tinggal..." 
                      className="input h-20" 
                      value={masukAddress}
                      onChange={e => setMasukAddress(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                   <button type="button" onClick={() => setIsMasukModalOpen(false)} className="btn-outline">Batal</button>
                   <button type="submit" className="btn bg-green-600 hover:bg-green-700 shadow-green-100">Simpan Siswa Masuk</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
