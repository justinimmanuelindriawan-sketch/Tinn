import { useStore } from '../store';
import { Users, GraduationCap, UserMinus, HardDriveUpload, RefreshCw, School } from 'lucide-react';
import { fetchFromGAS } from '../lib/api';
import { getActiveClasses, matchStatusActive } from '../lib/utils';
import { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell
} from 'recharts';

export default function Dashboard() {
  const { students, teachers, settings, setStudents, setTeachers, setLoading, setLastSyncedAt, setIsSyncingGlobal } = useStore();
  const [syncStatus, setSyncStatus] = useState('');

  // Primary stats calculations (Siswa yang ada di Data Siswa)
  const activeStudentsList = useMemo(() => {
    return students.filter(s => s && (s.status === 'Aktif' || (!s.status && s.status !== 'Pindah' && s.status !== 'Keluar' && s.status !== 'Lulus')));
  }, [students]);

  const totalSiswa = activeStudentsList.length;
  const countLaki = activeStudentsList.filter(s => s.gender === 'L').length;
  const countPerempuan = activeStudentsList.filter(s => s.gender === 'P').length;
  
  const activeClasses = useMemo(() => {
    return getActiveClasses(students);
  }, [students]);

  const kelasAktifCount = activeClasses.length;

  const stats = [
    { label: 'Total Siswa', value: totalSiswa, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Siswa Laki-laki (L)', value: countLaki, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Siswa Perempuan (P)', value: countPerempuan, icon: Users, color: 'text-pink-600', bg: 'bg-pink-50' },
    { label: 'Kelas Aktif', value: kelasAktifCount, icon: School, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const secondaryStats = [
    { label: 'Siswa Aktif', value: students.filter(s => matchStatusActive(s.status)).length, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Siswa Lulus', value: students.filter(s => String(s.status || '').toLowerCase() === 'lulus').length, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Keluar / Mutasi', value: students.filter(s => {
      const st = String(s.status || '').toLowerCase();
      return st === 'keluar' || st === 'pindah' || st === 'mutasi';
    }).length, color: 'text-rose-500', bg: 'bg-rose-50' },
  ];

  // Chart data 1: Active students by Class
  const classChartData = useMemo(() => {
    const counts: { [key: string]: number } = {};
    students.forEach(s => {
      if (s && matchStatusActive(s.status) && s.class) {
        const cleanClass = String(s.class).trim().toUpperCase().replace(/^KELAS\s*/i, '');
        if (cleanClass) {
          counts[cleanClass] = (counts[cleanClass] || 0) + 1;
        }
      }
    });
    return Object.keys(counts)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
      .map(cls => ({
        class: `Kelas ${cls}`,
        'Jumlah Siswa': counts[cls]
      }));
  }, [students]);

  // Chart data 2: Gender distribution of active students
  const genderChartData = useMemo(() => {
    const L = students.filter(s => matchStatusActive(s.status) && s.gender === 'L').length;
    const P = students.filter(s => matchStatusActive(s.status) && s.gender === 'P').length;
    return [
      { name: 'Laki-laki', value: L, color: '#3b82f6' },
      { name: 'Perempuan', value: P, color: '#ec4899' }
    ];
  }, [students]);

  const handleSyncToSheets = async () => {
    if (!settings.scriptUrl) {
      alert("Harap atur URL Google Apps Script di Pengaturan terlebih dahulu.");
      return;
    }
    try {
      setSyncStatus('Sinkronisasi...');
      setLoading(true);
      setIsSyncingGlobal(true);
      await fetchFromGAS(settings.scriptUrl, {
        action: 'sync',
        data: students,
        teachers: teachers
      });
      setSyncStatus('Berhasil disinkronkan ke Google Sheets!');
      setLastSyncedAt(new Date().toLocaleTimeString('id-ID'));
      setTimeout(() => setSyncStatus(''), 3000);
    } catch (e: any) {
      alert("Gagal: " + e.message);
      setSyncStatus('');
    } finally {
      setLoading(false);
      setIsSyncingGlobal(false);
    }
  };

  const handlePullFromSheets = async () => {
    if (!settings.scriptUrl) {
      alert("Harap atur URL Google Apps Script di Pengaturan terlebih dahulu.");
      return;
    }
    try {
      setSyncStatus('Mengunduh data...');
      setLoading(true);
      setIsSyncingGlobal(true);
      const res = await fetchFromGAS(settings.scriptUrl, { action: 'pull' });
      if (res.students) {
        setStudents(res.students);
      } else if (res.data) {
        setStudents(res.data);
      }
      if (res.teachers) {
        setTeachers(res.teachers);
      }
      setSyncStatus('Berhasil mengambil data dari Google Sheets!');
      setLastSyncedAt(new Date().toLocaleTimeString('id-ID'));
      setTimeout(() => setSyncStatus(''), 3000);
    } catch (e: any) {
      alert("Gagal: " + e.message);
      setSyncStatus('');
    } finally {
      setLoading(false);
      setIsSyncingGlobal(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        {settings.schoolLogoUrl && (
          <img 
            src={settings.schoolLogoUrl} 
            alt="Logo Sekolah" 
            className="w-16 h-16 rounded-2xl object-cover shadow-md bg-white border border-white/60"
            referrerPolicy="no-referrer"
          />
        )}
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-indigo-900">Dashboard</h2>
          <p className="text-gray-500 mt-1 font-medium">Ringkasan data siswa dan statistik kelas aktif.</p>
        </div>
      </div>

      {/* Ringkasan Statistik Utama */}
      <div>
        <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-3">Statistik Utama</h3>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="bg-white/60 backdrop-blur-md p-4 md:p-5 rounded-3xl border border-white/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 transition-all hover:bg-white/80">
                <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl ${s.bg} ${s.color} shadow-sm border border-white/60`}>
                  <Icon size={24} className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">{s.label}</p>
                  <p className="text-2xl sm:text-3xl font-black text-indigo-900 mt-1">{s.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status Siswa */}
      <div>
        <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-3">Status Murid</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {secondaryStats.map((s, i) => (
            <div key={i} className="bg-white/40 backdrop-blur-md p-4 rounded-2xl border border-white/50 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">{s.label}</span>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${s.bg} ${s.color}`}>{s.value} Siswa</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recharts Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart Class Distribution */}
        <div className="lg:col-span-2 bg-white/70 backdrop-blur-2xl p-5 sm:p-6 rounded-3xl border border-white/90 shadow-sm">
          <h3 className="text-lg font-bold text-indigo-900 mb-1">Distribusi Kelas</h3>
          <p className="text-xs text-gray-400 mb-4 font-medium">Jumlah siswa aktif di setiap kelas terdaftar</p>
          {classChartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400 font-medium">
              Tidak ada data kelas aktif.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="class" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: 'none', 
                      borderRadius: '12px', 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)' 
                    }} 
                  />
                  <Bar dataKey="Jumlah Siswa" fill="#6366f1" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Pie Chart Gender Distribution */}
        <div className="bg-white/70 backdrop-blur-2xl p-5 sm:p-6 rounded-3xl border border-white/90 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-indigo-900 mb-1">Proporsi Jenis Kelamin</h3>
            <p className="text-xs text-gray-400 mb-4 font-medium">Perbandingan Laki-laki dan Perempuan (Siswa Aktif)</p>
          </div>
          {students.filter(s => s.status === 'Aktif').length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 font-medium">
              Tidak ada data siswa aktif.
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-around">
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {genderChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                        border: 'none', 
                        borderRadius: '12px', 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)' 
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-around text-xs font-bold text-gray-600">
                {genderChartData.map((g, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                    <span>{g.name}: {g.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Google Sheets Integration Box */}
      <div className="bg-white/70 backdrop-blur-2xl p-5 sm:p-8 rounded-3xl sm:rounded-[2rem] border border-white/90 shadow-lg mt-8 w-full overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-indigo-900">Integrasi Database</h3>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-xs font-semibold text-green-600">Realtime Aktif</span>
          </div>
        </div>
        <p className="text-gray-600 mb-6 w-full text-sm sm:text-base leading-relaxed">
          Aplikasi PWA ini tersinkronisasi otomatis (tarik data tiap 30 detik) jika ada perubahan dari admin lain. 
          Namun, Anda tetap <b>HARUS</b> menekan tombol "Push Data" di bawah setelah melakukan <b>penambahan/perubahan</b> dari aplikasi Anda agar data tersimpan ke Google Sheets.
        </p>
        <div className="flex flex-col sm:flex-row flex-wrap gap-4">
          <button onClick={handleSyncToSheets} className="btn">
            <HardDriveUpload size={18} />
            Push Data ke Google Sheets
          </button>
          <button onClick={handlePullFromSheets} className="btn-outline">
            <RefreshCw size={18} />
            Tarik Data Manual
          </button>
        </div>
        {syncStatus && <p className="mt-4 text-sm text-indigo-600 font-bold bg-indigo-50 p-3 rounded-lg border border-indigo-100">{syncStatus}</p>}
      </div>
    </div>
  );
}
