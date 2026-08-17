import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import { CLASSES, cn, matchClass, matchStatusActive, getActiveClasses, getAllClasses } from '../lib/utils';
import { Student } from '../types';
import { Users, ArrowUpCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { fetchFromGAS } from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';

export default function KenaikanKelas() {
  const { 
    students, updateStudentsBulk, settings, setLoading, 
    setIsSyncingGlobal, setLastSyncedAt 
  } = useStore();
  
  const activeClasses = useMemo(() => getActiveClasses(students), [students]);
  const allClasses = useMemo(() => getAllClasses(students), [students]);

  const [selectedClass, setSelectedClass] = useState<string>('');

  useEffect(() => {
    if (activeClasses.length > 0 && (!selectedClass || !activeClasses.includes(selectedClass))) {
      setSelectedClass(activeClasses[0]);
    }
  }, [activeClasses, selectedClass]);
  
  // Only active students in the selected class
  const classStudents = useMemo(() => {
    if (!students) return [];
    return students
      .filter(s => {
        if (!s) return false;
        return matchStatusActive(s.status) && matchClass(s.class, selectedClass);
      })
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'id'));
  }, [students, selectedClass]);

  // Calculate next class dynamically based on Grade + letter
  const nextClass = useMemo(() => {
    if (!selectedClass) return 'Lulus';
    const gradeMatch = selectedClass.match(/^(\d+)([a-zA-Z]*)$/);
    if (!gradeMatch) return 'Lulus';
    
    const grade = parseInt(gradeMatch[1]);
    const section = gradeMatch[2] || '';
    
    if (grade >= 6) {
      return 'Lulus';
    } else {
      return `${grade + 1}${section}`;
    }
  }, [selectedClass]);

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
      console.error("Manual sync failed in promotion:", e);
    } finally {
      setLoading(false);
      setIsSyncingGlobal(false);
    }
  };

  const handlePromoteAll = async () => {
    if (classStudents.length === 0) {
      alert('Tidak ada siswa di kelas ini.');
      return;
    }

    const actionText = nextClass === 'Lulus' 
      ? `Apakah Anda yakin ingin MELULUSKAN ${classStudents.length} siswa dari Kelas ${selectedClass}? Status mereka akan diubah menjadi 'Lulus'.`
      : `Apakah Anda yakin ingin menaikkan ${classStudents.length} siswa dari Kelas ${selectedClass} ke Kelas ${nextClass}?`;

    if (window.confirm(actionText)) {
      const updates = classStudents.map(s => {
        if (nextClass === 'Lulus') {
          return { id: s.id, data: { status: 'Lulus' as const } };
        } else {
          return { id: s.id, data: { class: nextClass } };
        }
      });
      
      updateStudentsBulk(updates);
      
      const currentStudents = useStore.getState().students;
      await triggerSync(currentStudents);
      alert('Berhasil diproses!');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-indigo-900">Kenaikan Kelas</h2>
          <p className="text-gray-500 mt-1 font-medium">Proses kenaikan kelas atau kelulusan siswa secara masal.</p>
        </div>
      </div>

      <div className="bg-white/40 p-6 rounded-3xl border border-white/60 shadow-sm backdrop-blur-md space-y-6">
        <div className="flex flex-col md:flex-row gap-6 items-center bg-white/70 p-6 rounded-2xl">
          <div className="flex-1 w-full">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Pilih Kelas Asal</label>
            <select 
              className="w-full bg-white backdrop-blur-lg border border-gray-200 px-5 py-3 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 appearance-none font-medium text-gray-700"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              {allClasses.length === 0 ? (
                <option value="">Belum Ada Data Kelas</option>
              ) : (
                allClasses.map(c => <option key={c} value={c}>Kelas {c}</option>)
              )}
            </select>
          </div>

          <div className="hidden md:flex justify-center items-center px-4">
             <ArrowUpCircle className="text-indigo-300 w-10 h-10" />
          </div>

          <div className="flex-1 w-full bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50 shadow-inner">
            <p className="text-sm font-semibold text-indigo-800 mb-1">Tujuan / Hasil</p>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-indigo-900">
                {nextClass === 'Lulus' ? 'Lulus / Tamat' : `Kelas ${nextClass}`}
              </span>
            </div>
            <p className="text-xs text-indigo-600/80 mt-1">Siswa di sebelah kiri akan dipindahkan ke sini.</p>
          </div>
        </div>

        <div className="pt-2">
           <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Users size={18} className="text-indigo-500" />
                Daftar Siswa Kelas {selectedClass}
              </h3>
              <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full">
                {classStudents.length} Siswa
              </span>
           </div>
           
           <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden max-h-[400px] overflow-y-auto">
             <AnimatePresence mode="wait">
               <motion.table 
                 key={selectedClass}
                 initial={{ opacity: 0, y: 8 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -8 }}
                 transition={{ duration: 0.15 }}
                 className="w-full text-sm text-left border-collapse"
               >
                 <thead className="bg-gray-50/80 z-10 sticky top-0">
                   <tr className="text-gray-500 text-xs uppercase tracking-wider">
                     <th className="px-6 py-3 font-semibold">No</th>
                     <th className="px-6 py-3 font-semibold">NIS/NISN</th>
                     <th className="px-6 py-3 font-semibold">Nama Lengkap</th>
                     <th className="px-6 py-3 font-semibold text-center">L/P</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                    {classStudents.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                          Tidak ada siswa aktif di kelas ini.
                        </td>
                      </tr>
                    ) : (
                      classStudents.map((s, idx) => (
                        <tr key={s.id} className="hover:bg-indigo-50/30 transition-colors">
                          <td className="px-6 py-3 text-center text-gray-500 font-medium">{idx + 1}</td>
                          <td className="px-6 py-3 font-mono text-gray-600">
                            {s.nis || s.nisn ? (
                              <div className="flex flex-col text-xs leading-snug">
                                <span className="font-semibold text-gray-800">{s.nis || '-'}</span>
                                {s.nisn && <span className="text-[11px] text-gray-400 font-normal">NISN: {s.nisn}</span>}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-6 py-3 font-semibold text-gray-800">{s.name}</td>
                          <td className="px-6 py-3 text-gray-600 text-center font-medium">{s.gender}</td>
                        </tr>
                      ))
                    )}
                 </tbody>
               </motion.table>
             </AnimatePresence>
           </div>
        </div>

        <div className="flex items-start gap-4 p-5 bg-amber-50 rounded-2xl border border-amber-200 mt-6">
           <AlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" />
           <div>
             <h4 className="font-bold text-amber-900 text-sm">Peringatan Kenaikan Kelas</h4>
             <p className="text-amber-800 text-sm mt-1">
               Pastikan semua nilai dan administrasi siswa di Kelas {selectedClass} sudah selesai. Aksi ini akan mengubah data kelas siswa secara masal dan permanen di aplikasi lokal ini. Jangan lupa untuk sinkronisasi jika Anda menggunakan penyimpanan cloud.
             </p>
           </div>
        </div>

        <div className="pt-4 flex justify-end">
           <button 
             onClick={handlePromoteAll} 
             disabled={classStudents.length === 0}
             className="btn w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed justify-center text-sm px-8 py-3"
           >
             <CheckCircle2 size={18} className="mr-2" />
             {nextClass === 'Lulus' ? 'Luluskan Semua Siswa' : `Naikkan Semua ke Kelas ${nextClass}`}
           </button>
        </div>

      </div>
    </div>
  );
}
