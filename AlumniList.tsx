import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Student } from '../types';
import { 
  Award, Search, Printer, Edit2, RotateCcw, FileSpreadsheet, 
  ExternalLink, X, Save, CheckCircle2, GraduationCap, FileText, UserCheck 
} from 'lucide-react';
import { fetchFromGAS } from '../lib/api';
import { exportToExcel } from '../lib/excel';
import { getGoogleDriveDirectImageUrl, formatDate, formatAge } from '../lib/utils';

export default function AlumniList() {
  const { 
    students, updateStudent, settings, setLoading, 
    setIsSyncingGlobal, setLastSyncedAt 
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [printStudent, setPrintStudent] = useState<Student | null>(null);
  const [isPrintListMode, setIsPrintListMode] = useState(false);

  // Filter only alumni (status === 'Lulus')
  const alumniList = useMemo(() => {
    return students.filter(s => s && s.status === 'Lulus');
  }, [students]);

  const filteredAlumni = useMemo(() => {
    return alumniList.filter(s => {
      const q = searchTerm.toLowerCase();
      const name = String(s.name || '').toLowerCase();
      const nis = String(s.nis || '').toLowerCase();
      const nisn = String(s.nisn || '').toLowerCase();
      const ijazah = String(s.ijazahNo || '').toLowerCase();
      return name.includes(q) || nis.includes(q) || nisn.includes(q) || ijazah.includes(q);
    }).sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'id'));
  }, [alumniList, searchTerm]);

  const totalAlumni = alumniList.length;
  const countL = alumniList.filter(s => s.gender === 'L').length;
  const countP = alumniList.filter(s => s.gender === 'P').length;
  const countIjazah = alumniList.filter(s => Boolean(s.ijazahNo)).length;

  const triggerSync = async (updatedStudents: Student[]) => {
    if (!settings.scriptUrl) return;
    try {
      setLoading(true);
      setIsSyncingGlobal(true);
      await fetchFromGAS(settings.scriptUrl, {
        action: 'sync',
        data: updatedStudents,
        teachers: useStore.getState().teachers,
      });
      setLastSyncedAt(new Date().toLocaleTimeString('id-ID'));
    } catch (e) {
      console.error("Manual sync failed:", e);
    } finally {
      setLoading(false);
      setIsSyncingGlobal(false);
    }
  };

  const handleRestore = async (id: string, name: string) => {
    if (window.confirm(`Kembalikan data alumni "${name}" menjadi Siswa Aktif?`)) {
      updateStudent(id, { status: 'Aktif' });
      const currentStudents = useStore.getState().students;
      await triggerSync(currentStudents);
      alert(`Siswa ${name} berhasil dikembalikan ke Data Siswa Aktif.`);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    updateStudent(editingStudent.id, {
      nis: editingStudent.nis,
      nisn: editingStudent.nisn,
      name: editingStudent.name,
      class: editingStudent.class,
      gender: editingStudent.gender,
      pob: editingStudent.pob,
      dob: editingStudent.dob,
      address: editingStudent.address,
      parentName: editingStudent.parentName,
      ijazahNo: editingStudent.ijazahNo,
      ijazahUrl: editingStudent.ijazahUrl,
    });

    setEditingStudent(null);
    const currentStudents = useStore.getState().students;
    await triggerSync(currentStudents);
    alert('Data alumni berhasil diperbarui!');
  };

  const handleExportExcel = () => {
    if (filteredAlumni.length === 0) {
      alert('Tidak ada data alumni untuk diekspor.');
      return;
    }
    exportToExcel(filteredAlumni, 'Data_Alumni_SD');
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-indigo-900 flex items-center gap-3">
            <Award className="text-indigo-600" size={32} />
            Data Alumni & Kelulusan
          </h2>
          <p className="text-gray-500 mt-1 font-medium">Arsip resmi seluruh siswa yang telah lulus dari sekolah.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => setIsPrintListMode(true)} className="btn-outline">
            <Printer size={18} /> Cetak Daftar Alumni
          </button>
          <button onClick={handleExportExcel} className="btn-outline">
            <FileSpreadsheet size={18} /> Ekspor Excel
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
        <div className="bg-white/60 backdrop-blur-md p-4 rounded-3xl border border-white/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl">
            <GraduationCap size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Alumni</p>
            <p className="text-2xl font-black text-indigo-900">{totalAlumni}</p>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-md p-4 rounded-3xl border border-white/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-700 rounded-2xl">
            <UserCheck size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Laki-laki (L)</p>
            <p className="text-2xl font-black text-blue-900">{countL}</p>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-md p-4 rounded-3xl border border-white/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-pink-100 text-pink-700 rounded-2xl">
            <UserCheck size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Perempuan (P)</p>
            <p className="text-2xl font-black text-pink-900">{countP}</p>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-md p-4 rounded-3xl border border-white/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">No. Ijazah Terdata</p>
            <p className="text-2xl font-black text-emerald-900">{countIjazah}</p>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white/70 backdrop-blur-2xl rounded-3xl border border-white/90 shadow-sm overflow-hidden no-print">
        {/* Search Bar */}
        <div className="p-4 border-b border-indigo-50/80 bg-white/40">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari alumni (Nama, NIS, NISN, No. Ijazah)..." 
              className="w-full bg-white/80 backdrop-blur-lg border border-white px-5 py-3 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 pl-11 text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse min-w-[900px]">
            <thead className="bg-indigo-50/50">
              <tr className="text-indigo-950 text-[11px] uppercase tracking-widest border-b border-indigo-100">
                <th className="px-6 py-4 font-bold border border-indigo-100">No</th>
                <th className="px-6 py-4 font-bold border border-indigo-100">NIS / NISN</th>
                <th className="px-6 py-4 font-bold border border-indigo-100">Nama Alumni</th>
                <th className="px-4 py-4 font-bold text-center border border-indigo-100">L/P</th>
                <th className="px-6 py-4 font-bold border border-indigo-100">Tempat, Tgl Lahir</th>
                <th className="px-6 py-4 font-bold border border-indigo-100">Nomor Ijazah</th>
                <th className="px-6 py-4 font-bold border border-indigo-100">Berkas Ijazah</th>
                <th className="px-6 py-4 font-bold text-right border border-indigo-100">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-50/50">
              {filteredAlumni.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500 font-medium border border-indigo-100">
                    Tidak ada data alumni yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredAlumni.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-white/50 transition-colors">
                    <td className="px-6 py-4 text-center font-semibold text-gray-500 border border-indigo-100">{idx + 1}</td>
                    <td className="px-6 py-4 font-mono font-medium text-gray-600 border border-indigo-100">
                      <div>{student.nis}</div>
                      {student.nisn && <div className="text-xs text-gray-400">{student.nisn}</div>}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900 border border-indigo-100 uppercase">{student.name}</td>
                    <td className="px-4 py-4 text-center border border-indigo-100 font-bold text-gray-600">{student.gender}</td>
                    <td className="px-6 py-4 border border-indigo-100 text-xs">
                      {student.pob && <div className="font-semibold text-gray-800">{student.pob}</div>}
                      <div className="text-gray-500">{formatDate(student.dob) || '-'}</div>
                    </td>
                    <td className="px-6 py-4 border border-indigo-100 font-mono text-xs">
                      {student.ijazahNo ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          <CheckCircle2 size={13} className="text-emerald-600" />
                          {student.ijazahNo}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">Belum diisi</span>
                      )}
                    </td>
                    <td className="px-6 py-4 border border-indigo-100">
                      {student.ijazahUrl ? (
                        <a 
                          href={student.ijazahUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition"
                        >
                          <ExternalLink size={13} />
                          Lihat File
                        </a>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right border border-indigo-100">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => setPrintStudent(student)} 
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition"
                          title="Cetak Biodata Alumni"
                        >
                          <Printer size={16} />
                        </button>
                        <button 
                          onClick={() => setEditingStudent(student)} 
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition"
                          title="Edit Data Alumni & No. Ijazah"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleRestore(student.id, student.name)} 
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition"
                          title="Kembalikan ke Status Siswa Aktif"
                        >
                          <RotateCcw size={16} />
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

      {/* Edit Alumni Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-white space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="text-xl font-black text-indigo-900 flex items-center gap-2">
                <Edit2 className="text-indigo-600" size={20} />
                Edit Data Alumni / Kelulusan
              </h3>
              <button onClick={() => setEditingStudent(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">NIS</label>
                  <input 
                    type="text" 
                    value={editingStudent.nis || ''} 
                    onChange={e => setEditingStudent({...editingStudent, nis: e.target.value})}
                    className="w-full bg-gray-50 border p-2.5 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">NISN</label>
                  <input 
                    type="text" 
                    value={editingStudent.nisn || ''} 
                    onChange={e => setEditingStudent({...editingStudent, nisn: e.target.value})}
                    className="w-full bg-gray-50 border p-2.5 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nama Lengkap</label>
                <input 
                  type="text" 
                  value={editingStudent.name || ''} 
                  onChange={e => setEditingStudent({...editingStudent, name: e.target.value})}
                  className="w-full bg-gray-50 border p-2.5 rounded-xl font-bold uppercase"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tempat Lahir</label>
                  <input 
                    type="text" 
                    value={editingStudent.pob || ''} 
                    onChange={e => setEditingStudent({...editingStudent, pob: e.target.value})}
                    className="w-full bg-gray-50 border p-2.5 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tanggal Lahir</label>
                  <input 
                    type="date" 
                    value={editingStudent.dob || ''} 
                    onChange={e => setEditingStudent({...editingStudent, dob: e.target.value})}
                    className="w-full bg-gray-50 border p-2.5 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nomor Ijazah</label>
                <input 
                  type="text" 
                  value={editingStudent.ijazahNo || ''} 
                  onChange={e => setEditingStudent({...editingStudent, ijazahNo: e.target.value})}
                  placeholder="Contoh: DN-01/D-SD/13/0012345"
                  className="w-full bg-gray-50 border p-2.5 rounded-xl font-mono font-bold text-indigo-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Link Google Drive / URL File Ijazah</label>
                <input 
                  type="url" 
                  value={editingStudent.ijazahUrl || ''} 
                  onChange={e => setEditingStudent({...editingStudent, ijazahUrl: e.target.value})}
                  placeholder="https://drive.google.com/file/d/..."
                  className="w-full bg-gray-50 border p-2.5 rounded-xl font-medium text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nama Orang Tua</label>
                  <input 
                    type="text" 
                    value={editingStudent.parentName || ''} 
                    onChange={e => setEditingStudent({...editingStudent, parentName: e.target.value})}
                    className="w-full bg-gray-50 border p-2.5 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Alamat</label>
                  <input 
                    type="text" 
                    value={editingStudent.address || ''} 
                    onChange={e => setEditingStudent({...editingStudent, address: e.target.value})}
                    className="w-full bg-gray-50 border p-2.5 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setEditingStudent(null)}
                  className="px-5 py-2.5 rounded-xl border text-gray-600 font-bold hover:bg-gray-50"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="btn"
                >
                  <Save size={16} /> Simpan Alumni
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Single Alumni Biodata */}
      {printStudent && (
        <div id="printable-area" className="bg-white p-6 sm:p-8 max-w-2xl mx-auto fixed inset-0 overflow-y-auto print:overflow-visible print:relative print:inset-auto print:p-0 z-[200] print-single-page">
           <div className="flex justify-between items-start no-print mb-6">
              <button onClick={() => window.print()} className="btn">Cetak Sekarang</button>
              <button onClick={() => setPrintStudent(null)} className="btn-outline"><X size={18} /> Tutup</button>
           </div>
           
           <div className="text-center mb-6 border-b-2 border-slate-800 pb-3">
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight">SURAT KETERANGAN / BIODATA ALUMNI</h1>
              <p className="text-slate-600 text-sm font-medium">{settings.schoolName || settings.appName || 'SDN Citapen'}</p>
           </div>
           
           <div className="flex flex-row justify-between items-start gap-6 mb-6">
              <table className="w-full text-left text-sm sm:text-base flex-1">
                <tbody>
                  <tr><td className="py-1.5 w-1/3 font-semibold text-gray-700">NIS / NISN</td><td className="py-1.5 font-mono font-medium">: {printStudent.nis} {printStudent.nisn ? `/ ${printStudent.nisn}` : ''}</td></tr>
                  <tr><td className="py-1.5 font-semibold text-gray-700">Nama Lengkap</td><td className="py-1.5 font-bold text-gray-900 uppercase">: {printStudent.name}</td></tr>
                  <tr><td className="py-1.5 font-semibold text-gray-700">Status</td><td className="py-1.5 font-bold text-indigo-700">: ALUMNI (LULUS)</td></tr>
                  <tr><td className="py-1.5 font-semibold text-gray-700">Jenis Kelamin</td><td className="py-1.5">: {printStudent.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</td></tr>
                  <tr><td className="py-1.5 font-semibold text-gray-700">Tempat, Tgl Lahir</td><td className="py-1.5">: {printStudent.pob ? `${printStudent.pob}, ` : ''}{formatDate(printStudent.dob)}</td></tr>
                  <tr><td className="py-1.5 font-semibold text-gray-700">Nama Orang Tua</td><td className="py-1.5">: {printStudent.parentName || '-'}</td></tr>
                  <tr><td className="py-1.5 font-semibold text-gray-700 align-top">Alamat</td><td className="py-1.5">: {printStudent.address || '-'}</td></tr>
                  <tr><td className="py-1.5 font-semibold text-gray-700">Nomor Ijazah</td><td className="py-1.5 font-bold font-mono text-emerald-800">: {printStudent.ijazahNo || '- (Belum diisi)'}</td></tr>
                </tbody>
              </table>

              {printStudent.fotoUrl && (
                 <div className="w-[3cm] h-[4cm] sm:w-[3.5cm] sm:h-[5cm] shrink-0 border-2 border-slate-800 p-1 bg-white relative flex items-center justify-center text-center overflow-hidden no-print-bg">
                    <img 
                      src={getGoogleDriveDirectImageUrl(printStudent.fotoUrl)} 
                      alt="Foto Alumni" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
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

      {/* Print Alumni List View */}
      {isPrintListMode && (
        <div id="printable-area" className="bg-white p-6 sm:p-8 max-w-5xl mx-auto fixed inset-0 overflow-y-auto print:overflow-visible print:relative print:inset-auto print:p-0 z-[200]">
           <div className="flex justify-between items-start no-print mb-6">
              <button onClick={() => window.print()} className="btn">Cetak Sekarang</button>
              <button onClick={() => setIsPrintListMode(false)} className="btn-outline"><X size={18} /> Tutup</button>
           </div>
           
           <div className="text-center mb-6">
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight">DAFTAR ALUMNI / LULUSAN SD</h1>
              <p className="text-slate-600 font-semibold text-sm">
                TOTAL: {filteredAlumni.length} ALUMNI
              </p>
           </div>

           <table className="w-full text-left border-collapse border border-slate-400 print-table">
             <thead>
               <tr className="bg-slate-100">
                 <th className="border border-slate-400 p-2 font-bold text-center w-10">No</th>
                 <th className="border border-slate-400 p-2 font-bold w-32">NIS / NISN</th>
                 <th className="border border-slate-400 p-2 font-bold">Nama Alumni</th>
                 <th className="border border-slate-400 p-2 font-bold text-center w-12">L/P</th>
                 <th className="border border-slate-400 p-2 font-bold w-40">Tempat, Tgl Lahir</th>
                 <th className="border border-slate-400 p-2 font-bold w-44">Nomor Ijazah</th>
               </tr>
             </thead>
             <tbody>
               {filteredAlumni.length === 0 ? (
                 <tr><td colSpan={6} className="border border-slate-400 p-4 text-center">Tidak ada data alumni</td></tr>
               ) : (
                 filteredAlumni.map((s, idx) => (
                   <tr key={s.id}>
                     <td className="border border-slate-400 p-1.5 text-center text-xs font-medium">{idx + 1}</td>
                     <td className="border border-slate-400 p-1.5 text-xs font-mono">{s.nis} {s.nisn ? `/ ${s.nisn}` : ''}</td>
                     <td className="border border-slate-400 p-1.5 font-bold uppercase text-xs">{s.name}</td>
                     <td className="border border-slate-400 p-1.5 text-center text-xs font-medium">{s.gender}</td>
                     <td className="border border-slate-400 p-1.5 text-xs">
                       {s.pob ? `${s.pob}, ` : ''}{s.dob || '-'}
                     </td>
                     <td className="border border-slate-400 p-1.5 text-xs font-mono font-bold">{s.ijazahNo || '-'}</td>
                   </tr>
                 ))
               )}
             </tbody>
           </table>

           <div className="flex justify-between mt-8 text-xs text-center">
              <div>
                <p className="mb-14">Mengetahui,<br/>Kepala Sekolah</p>
                <p className="font-bold underline">_________________________</p>
              </div>
              <div>
                <p className="mb-14">...................., {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>Pengelola Data / Admin</p>
                <p className="font-bold underline">_________________________</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
