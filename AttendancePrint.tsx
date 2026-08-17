import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import { matchClass, matchStatusActive, getActiveClasses, getAllClasses } from '../lib/utils';
import { 
  Printer, Filter, Calendar as CalendarIcon, FileSpreadsheet, 
  Award, FileText, BookOpen, Layers, CheckSquare, UserCheck, School
} from 'lucide-react';

export default function AttendancePrint() {
  const { students, teachers, settings } = useStore();
  const activeClasses = useMemo(() => getActiveClasses(students), [students]);
  const allClasses = useMemo(() => getAllClasses(students), [students]);

  const [printTab, setPrintTab] = useState<'hadir' | 'nilai' | 'administrasi'>('hadir');
  const [selectedClass, setSelectedClass] = useState<string>('');

  const kepsek = useMemo(() => {
    return teachers.find(t => t.class === 'Kepala Sekolah' || (t.class && t.class.toLowerCase().includes('kepala')));
  }, [teachers]);

  const waliKelas = useMemo(() => {
    return teachers.find(t => matchClass(t.class, selectedClass));
  }, [teachers, selectedClass]);
  
  useEffect(() => {
    if (activeClasses.length > 0 && (!selectedClass || !activeClasses.includes(selectedClass))) {
      setSelectedClass(activeClasses[0]);
    }
  }, [activeClasses, selectedClass]);

  // Attendance state
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Grade ledger state
  const subjects = [
    "Pendidikan Pancasila",
    "Bahasa Indonesia",
    "Matematika",
    "IPAS (Ilmu Pengetahuan Alam dan Sosial)",
    "Pendidikan Agama dan Budi Pekerti",
    "PJOK (Pendidikan Jasmani & Kesehatan)",
    "Seni Budaya dan Prakarya",
    "Bahasa Daerah / Muatan Lokal",
    "Bahasa Inggris"
  ];
  const [selectedSubject, setSelectedSubject] = useState<string>(subjects[0]);
  const [selectedSemester, setSelectedSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(settings.tahunPelajaran || '2025/2026');

  useEffect(() => {
    if (settings.tahunPelajaran) {
      setSelectedAcademicYear(settings.tahunPelajaran);
    }
  }, [settings.tahunPelajaran]);

  // Administrasi Sub-tab
  const [adminSection, setAdminSection] = useState<'cover' | 'rekap' | 'jurnal'>('cover');

  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const years = Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i);

  // Active students for selected class
  const classStudents = useMemo(() => {
    if (!students) return [];
    return students
      .filter(s => {
        if (!s) return false;
        return matchStatusActive(s.status) && matchClass(s.class, selectedClass);
      })
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'id'));
  }, [students, selectedClass]);

  const countL = useMemo(() => classStudents.filter(s => s.gender === 'L').length, [classStudents]);
  const countP = useMemo(() => classStudents.filter(s => s.gender === 'P').length, [classStudents]);

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const dayColumns = Array.from({length: daysInMonth}, (_, i) => i + 1);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Top Header & Navigation Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-indigo-900">Cetak & Administrasi Kelas</h2>
          <p className="text-gray-500 mt-1 font-medium">Cetak Daftar Hadir, Format Penilaian Nilai, dan Berkas Administrasi Kelas.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-white/70 backdrop-blur-xl p-1.5 rounded-2xl border border-white/80 shadow-md">
          <button
            onClick={() => setPrintTab('hadir')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              printTab === 'hadir'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                : 'text-gray-600 hover:text-indigo-900 hover:bg-white/50'
            }`}
          >
            <CalendarIcon size={16} />
            Daftar Hadir
          </button>
          <button
            onClick={() => setPrintTab('nilai')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              printTab === 'nilai'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                : 'text-gray-600 hover:text-indigo-900 hover:bg-white/50'
            }`}
          >
            <Award size={16} />
            Daftar Nilai
          </button>
          <button
            onClick={() => setPrintTab('administrasi')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              printTab === 'administrasi'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                : 'text-gray-600 hover:text-indigo-900 hover:bg-white/50'
            }`}
          >
            <BookOpen size={16} />
            Administrasi Kelas
          </button>
        </div>
      </div>

      {/* Control Filter Bar (No Print) */}
      <div className="bg-white/40 p-4 rounded-3xl border border-white/60 shadow-sm backdrop-blur-md no-print">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 w-full">
          {/* Class Filter */}
          <div className="relative">
            <Filter className="absolute left-4 top-3.5 text-gray-400" size={18} />
            <select 
              className="w-full bg-white/80 backdrop-blur-lg border border-white px-5 py-3 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 pl-11 appearance-none font-medium text-gray-700 text-sm"
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

          {/* Dynamic Filter Controls Based on Tab */}
          {printTab === 'hadir' && (
            <>
              <div className="relative">
                <CalendarIcon className="absolute left-4 top-3.5 text-gray-400" size={18} />
                <select 
                  className="w-full bg-white/80 backdrop-blur-lg border border-white px-5 py-3 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 pl-11 appearance-none font-medium text-gray-700 text-sm"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                >
                  {months.map((m, idx) => <option key={m} value={idx}>{m}</option>)}
                </select>
              </div>

              <div className="relative">
                <select 
                  className="w-full bg-white/80 backdrop-blur-lg border border-white px-5 py-3 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 px-4 appearance-none font-medium text-gray-700 text-sm"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </>
          )}

          {printTab === 'nilai' && (
            <>
              <div className="relative col-span-1 sm:col-span-2">
                <select 
                  className="w-full bg-white/80 backdrop-blur-lg border border-white px-4 py-3 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 appearance-none font-medium text-gray-700 text-sm"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                >
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="relative">
                <select 
                  className="w-full bg-white/80 backdrop-blur-lg border border-white px-4 py-3 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 appearance-none font-medium text-gray-700 text-sm"
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value as any)}
                >
                  <option value="Ganjil">Semester Ganjil</option>
                  <option value="Genap">Semester Genap</option>
                </select>
              </div>
            </>
          )}

          {printTab === 'administrasi' && (
            <div className="relative col-span-1 sm:col-span-3 flex gap-2">
              <button 
                onClick={() => setAdminSection('cover')}
                className={`flex-1 py-2.5 px-3 rounded-2xl font-bold text-xs border transition ${
                  adminSection === 'cover' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white/80 text-gray-700 border-white hover:bg-white'
                }`}
              >
                Cover & Pengesahan
              </button>
              <button 
                onClick={() => setAdminSection('rekap')}
                className={`flex-1 py-2.5 px-3 rounded-2xl font-bold text-xs border transition ${
                  adminSection === 'rekap' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white/80 text-gray-700 border-white hover:bg-white'
                }`}
              >
                Daftar & Rekap Siswa
              </button>
              <button 
                onClick={() => setAdminSection('jurnal')}
                className={`flex-1 py-2.5 px-3 rounded-2xl font-bold text-xs border transition ${
                  adminSection === 'jurnal' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white/80 text-gray-700 border-white hover:bg-white'
                }`}
              >
                Jurnal Mengajar
              </button>
            </div>
          )}

          {/* Print Button */}
          <button onClick={handlePrint} className="btn justify-center w-full shadow-lg shadow-indigo-200">
            <Printer className="mr-2" size={18} /> Cetak Dokumen
          </button>
        </div>
      </div>

      {classStudents.length === 0 ? (
        <div className="bg-white/70 p-12 rounded-[2rem] border border-white/90 shadow-sm text-center no-print">
           <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
           <h3 className="text-xl font-bold text-gray-700">Tidak ada siswa aktif di Kelas {selectedClass}</h3>
           <p className="text-gray-500 mt-2">Silakan tambahkan siswa di menu Data Siswa terlebih dahulu.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto p-3 sm:p-6 print:shadow-none print:border-none print:p-0 print:overflow-visible">
          
          {/* TAB 1: CETAK DAFTAR HADIR */}
          {printTab === 'hadir' && (
            <div className="printable-container print-single-page min-w-[900px] print:min-w-0">
              <div className="text-center mb-4 print:mb-2">
                <h1 className="text-xl print:text-base font-bold uppercase mb-0.5 tracking-tight">DAFTAR HADIR SISWA</h1>
                <h2 className="text-sm print:text-xs font-semibold text-gray-800">
                  {(settings.schoolName || settings.appName || 'SDN Citapen').toUpperCase()} &nbsp;|&nbsp; KELAS: {selectedClass} &nbsp;|&nbsp; BULAN: {months[selectedMonth].toUpperCase()} {selectedYear}
                </h2>
              </div>

              <table className="w-full text-xs text-left border-collapse border border-black print-table">
                <colgroup>
                  <col className="w-[3%]" />
                  <col className="w-[12%]" />
                  <col className="w-[28%]" />
                  <col className="w-[3%]" />
                  {dayColumns.map(d => (
                    <col key={d} className="w-[1.5%]" />
                  ))}
                  <col className="w-[2%]" />
                  <col className="w-[2%]" />
                  <col className="w-[2%]" />
                </colgroup>
                <thead>
                  <tr>
                    <th rowSpan={2} className="border border-black p-1 text-center font-bold">No</th>
                    <th rowSpan={2} className="border border-black p-1 text-center font-bold">NIS/NISN</th>
                    <th rowSpan={2} className="border border-black p-1 font-bold">Nama Lengkap</th>
                    <th rowSpan={2} className="border border-black p-1 text-center font-bold">L/P</th>
                    <th colSpan={daysInMonth} className="border border-black p-0.5 text-center font-bold">Tanggal</th>
                    <th colSpan={3} className="border border-black p-0.5 text-center font-bold">Ket.</th>
                  </tr>
                  <tr>
                    {dayColumns.map(d => (
                      <th key={d} className="border border-black p-0.5 text-center text-[10px] print:text-[8px] font-semibold">{d}</th>
                    ))}
                    <th className="border border-black p-0.5 text-center text-[10px] print:text-[8px] font-bold">S</th>
                    <th className="border border-black p-0.5 text-center text-[10px] print:text-[8px] font-bold">I</th>
                    <th className="border border-black p-0.5 text-center text-[10px] print:text-[8px] font-bold">A</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map((s, idx) => {
                    const len = s.name ? s.name.trim().length : 0;
                    const nameFontClass = len > 32 
                      ? "text-[8px] print:text-[7.5px] leading-tight" 
                      : len > 24 
                        ? "text-[9px] print:text-[8px] leading-tight" 
                        : len > 18 
                          ? "text-[10px] print:text-[8.5px] leading-tight" 
                          : "text-xs print:text-[9px]";

                    return (
                      <tr key={s.id}>
                        <td className="border border-black p-0.5 print:p-[1px] text-center font-medium text-[10px] print:text-[8px]">{idx + 1}</td>
                        <td className="border border-black p-0.5 print:p-[1px] text-center text-[10px] print:text-[7.5px] font-mono leading-none">
                          {s.nis && s.nisn ? `${s.nis}/${s.nisn}` : (s.nis || s.nisn || '-')}
                        </td>
                        <td className={`border border-black p-0.5 print:p-[1px] font-bold uppercase whitespace-normal break-words ${nameFontClass}`}>
                          {s.name}
                        </td>
                        <td className="border border-black p-0.5 print:p-[1px] text-center font-medium text-[10px] print:text-[8px]">{s.gender}</td>
                        {dayColumns.map(d => (
                          <td key={d} className="border border-black p-0.5 print:p-[1px]"></td>
                        ))}
                        <td className="border border-black p-0.5 print:p-[1px]"></td>
                        <td className="border border-black p-0.5 print:p-[1px]"></td>
                        <td className="border border-black p-0.5 print:p-[1px]"></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="flex justify-between mt-6 print:mt-3 px-6 text-xs print:text-[8.5pt]">
                <div className="text-center">
                  <p className="mb-12 print:mb-6">Mengetahui,<br/>Kepala Sekolah</p>
                  <p className="font-bold underline">{kepsek?.name || '_________________________'}</p>
                  <p>NIP. {kepsek?.nip || '-'}</p>
                </div>
                <div className="text-center">
                  <p className="mb-12 print:mb-6">...................., {months[selectedMonth]} {selectedYear}<br/>Guru Kelas {selectedClass}</p>
                  <p className="font-bold underline">{waliKelas?.name || '_________________________'}</p>
                  <p>NIP. {waliKelas?.nip || '-'}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CETAK DAFTAR NILAI */}
          {printTab === 'nilai' && (
            <div className="printable-container print-single-page min-w-[900px] print:min-w-0">
              <div className="text-center mb-4 print:mb-2">
                <h1 className="text-xl print:text-base font-bold uppercase mb-0.5 tracking-tight">DAFTAR FORMAT PENILAIAN SISWA</h1>
                <h2 className="text-sm print:text-xs font-semibold text-gray-800 uppercase">
                  MATA PELAJARAN: {selectedSubject} &nbsp;|&nbsp; KELAS: {selectedClass} &nbsp;|&nbsp; SEMESTER {selectedSemester.toUpperCase()} T.A {selectedAcademicYear}
                </h2>
              </div>

              <table className="w-full text-xs text-left border-collapse border border-black print-table">
                <thead>
                  <tr className="bg-gray-100 print:bg-transparent">
                    <th rowSpan={2} className="border border-black p-1 text-center font-bold w-8">No</th>
                    <th rowSpan={2} className="border border-black p-1 text-center font-bold w-32">NIS / NISN</th>
                    <th rowSpan={2} className="border border-black p-1 font-bold">Nama Lengkap</th>
                    <th rowSpan={2} className="border border-black p-1 text-center font-bold w-10">L/P</th>
                    <th colSpan={5} className="border border-black p-1 text-center font-bold">Nilai Formatif (TP)</th>
                    <th colSpan={2} className="border border-black p-1 text-center font-bold">Sumatif</th>
                    <th rowSpan={2} className="border border-black p-1 text-center font-bold w-14">Nilai Akhir</th>
                    <th rowSpan={2} className="border border-black p-1 text-center font-bold w-14">Predikat</th>
                  </tr>
                  <tr className="bg-gray-50 print:bg-transparent text-[10px] print:text-[8px]">
                    <th className="border border-black p-1 text-center w-10">TP 1</th>
                    <th className="border border-black p-1 text-center w-10">TP 2</th>
                    <th className="border border-black p-1 text-center w-10">TP 3</th>
                    <th className="border border-black p-1 text-center w-10">TP 4</th>
                    <th className="border border-black p-1 text-center w-12 font-bold">Rata2</th>
                    <th className="border border-black p-1 text-center w-12">STS</th>
                    <th className="border border-black p-1 text-center w-12">SAS</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map((s, idx) => {
                    const len = s.name ? s.name.trim().length : 0;
                    const nameFontClass = len > 30 ? "text-[9px] print:text-[8px] leading-tight" : "text-xs print:text-[9px]";

                    return (
                      <tr key={s.id}>
                        <td className="border border-black p-1 text-center font-medium text-[10px] print:text-[8px]">{idx + 1}</td>
                        <td className="border border-black p-1 text-center text-[10px] print:text-[7.5px] font-mono leading-none">
                          {s.nis && s.nisn ? `${s.nis}/${s.nisn}` : (s.nis || s.nisn || '-')}
                        </td>
                        <td className={`border border-black p-1 font-bold uppercase whitespace-normal break-words ${nameFontClass}`}>
                          {s.name}
                        </td>
                        <td className="border border-black p-1 text-center font-medium text-[10px] print:text-[8px]">{s.gender}</td>
                        <td className="border border-black p-1"></td>
                        <td className="border border-black p-1"></td>
                        <td className="border border-black p-1"></td>
                        <td className="border border-black p-1"></td>
                        <td className="border border-black p-1 bg-gray-50/50 print:bg-transparent"></td>
                        <td className="border border-black p-1"></td>
                        <td className="border border-black p-1"></td>
                        <td className="border border-black p-1 bg-gray-50/50 print:bg-transparent"></td>
                        <td className="border border-black p-1"></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="flex justify-between mt-6 print:mt-3 px-6 text-xs print:text-[8.5pt]">
                <div className="text-center">
                  <p className="mb-12 print:mb-6">Mengetahui,<br/>Kepala Sekolah</p>
                  <p className="font-bold underline">{kepsek?.name || '_________________________'}</p>
                  <p>NIP. {kepsek?.nip || '-'}</p>
                </div>
                <div className="text-center">
                  <p className="mb-12 print:mb-6">...................., {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>Guru Pengampu / Wali Kelas {selectedClass}</p>
                  <p className="font-bold underline">{waliKelas?.name || '_________________________'}</p>
                  <p>NIP. {waliKelas?.nip || '-'}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ADMINISTRASI KELAS */}
          {printTab === 'administrasi' && (
            <div className="printable-container min-w-[750px] print:min-w-0">
              
              {/* SECTION A: COVER & PENGESAHAN */}
              {adminSection === 'cover' && (
                <div className="border-4 border-double border-indigo-950 p-8 sm:p-12 text-center my-4 print:my-0 rounded-2xl print:rounded-none max-w-2xl mx-auto print:max-w-none print:border-black">
                  <div className="my-6">
                    {settings.schoolLogoUrl ? (
                      <img src={settings.schoolLogoUrl} alt="Logo" className="w-24 h-24 mx-auto mb-4 object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <School className="w-20 h-20 text-indigo-900 mx-auto mb-4 print:text-black" />
                    )}
                    <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-indigo-950 print:text-black mb-2">
                      BERKAS ADMINISTRASI KELAS {selectedClass}
                    </h1>
                    <p className="text-lg font-bold text-gray-700 print:text-black uppercase tracking-wider">
                      {settings.schoolName || settings.appName || 'SDN Citapen'}
                    </p>
                    <p className="text-sm font-semibold text-gray-500 print:text-black mt-1">
                      TAHUN PELAJARAN {selectedAcademicYear}
                    </p>
                  </div>

                  <div className="my-12 py-8 border-y-2 border-dashed border-indigo-200 print:border-black text-left max-w-md mx-auto space-y-3 text-sm font-medium">
                    <div className="flex justify-between">
                      <span className="text-gray-600 print:text-black">Satuan Pendidikan:</span>
                      <span className="font-bold text-gray-900 print:text-black">{settings.schoolName || settings.appName || 'SDN Citapen'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 print:text-black">Kelas / Rombel:</span>
                      <span className="font-bold text-gray-900 print:text-black">Kelas {selectedClass}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 print:text-black">Wali Kelas:</span>
                      <span className="font-bold text-gray-900 print:text-black">{waliKelas?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 print:text-black">NIP Wali Kelas:</span>
                      <span className="font-mono font-bold text-gray-900 print:text-black">{waliKelas?.nip || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 print:text-black">Jumlah Murid:</span>
                      <span className="font-bold text-gray-900 print:text-black">{classStudents.length} Siswa ({countL} L / {countP} P)</span>
                    </div>
                  </div>

                  <div className="flex justify-between mt-16 px-6 text-xs text-center">
                    <div>
                      <p className="mb-16">Mengetahui,<br/>Kepala Sekolah</p>
                      <p className="font-bold underline">{kepsek?.name || '_________________________'}</p>
                      <p>NIP. {kepsek?.nip || '-'}</p>
                    </div>
                    <div>
                      <p className="mb-16">...................., {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>Wali Kelas {selectedClass}</p>
                      <p className="font-bold underline">{waliKelas?.name || '_________________________'}</p>
                      <p>NIP. {waliKelas?.nip || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION B: REKAPITULASI & DAFTAR SISWA */}
              {adminSection === 'rekap' && (
                <div className="space-y-6">
                  <div className="text-center mb-4 print:mb-2">
                    <h1 className="text-xl print:text-base font-bold uppercase mb-0.5 tracking-tight">REKAPITULASI & DAFTAR SISWA KELAS {selectedClass}</h1>
                    <h2 className="text-sm print:text-xs font-semibold text-gray-800">
                      JUMLAH TOTAL: {classStudents.length} SISWA (LAKI-LAKI: {countL} | PEREMPUAN: {countP})
                    </h2>
                  </div>

                  <table className="w-full text-xs text-left border-collapse border border-black print-table">
                    <thead>
                      <tr className="bg-gray-100 print:bg-transparent">
                        <th className="border border-black p-1.5 text-center font-bold w-8">No</th>
                        <th className="border border-black p-1.5 text-center font-bold w-28">NIS / NISN</th>
                        <th className="border border-black p-1.5 font-bold">Nama Lengkap</th>
                        <th className="border border-black p-1.5 text-center font-bold w-10">L/P</th>
                        <th className="border border-black p-1.5 font-bold w-40">Tempat, Tgl Lahir</th>
                        <th className="border border-black p-1.5 font-bold w-32">Nama Orang Tua</th>
                        <th className="border border-black p-1.5 font-bold">Alamat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classStudents.map((s, idx) => (
                        <tr key={s.id}>
                          <td className="border border-black p-1 text-center font-medium">{idx + 1}</td>
                          <td className="border border-black p-1 text-center font-mono text-[10px]">{s.nis} {s.nisn ? `/ ${s.nisn}` : ''}</td>
                          <td className="border border-black p-1 font-bold uppercase">{s.name}</td>
                          <td className="border border-black p-1 text-center font-medium">{s.gender}</td>
                          <td className="border border-black p-1 text-[10px]">
                            {s.pob ? `${s.pob}, ` : ''}{s.dob || '-'}
                          </td>
                          <td className="border border-black p-1 text-[10px]">{s.parentName || '-'}</td>
                          <td className="border border-black p-1 text-[10px]">{s.address || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="flex justify-between mt-8 px-6 text-xs text-center">
                    <div>
                      <p className="mb-14">Mengetahui,<br/>Kepala Sekolah</p>
                      <p className="font-bold underline">{kepsek?.name || '_________________________'}</p>
                      <p>NIP. {kepsek?.nip || '-'}</p>
                    </div>
                    <div>
                      <p className="mb-14">...................., {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>Wali Kelas {selectedClass}</p>
                      <p className="font-bold underline">{waliKelas?.name || '_________________________'}</p>
                      <p>NIP. {waliKelas?.nip || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION C: JURNAL / AGENDA HARIAN MENGAJAR */}
              {adminSection === 'jurnal' && (
                <div className="space-y-6">
                  <div className="text-center mb-4 print:mb-2">
                    <h1 className="text-xl print:text-base font-bold uppercase mb-0.5 tracking-tight">JURNAL AGENDA HARIAN MENGAJAR GURU</h1>
                    <h2 className="text-sm print:text-xs font-semibold text-gray-800">
                      KELAS: {selectedClass} &nbsp;|&nbsp; SEMESTER: {selectedSemester.toUpperCase()} &nbsp;|&nbsp; TAHUN AJARAN: {selectedAcademicYear}
                    </h2>
                  </div>

                  <table className="w-full text-xs text-left border-collapse border border-black print-table">
                    <thead>
                      <tr className="bg-gray-100 print:bg-transparent text-center font-bold">
                        <th className="border border-black p-2 w-8">No</th>
                        <th className="border border-black p-2 w-28">Hari / Tanggal</th>
                        <th className="border border-black p-2 w-32">Mata Pelajaran</th>
                        <th className="border border-black p-2 w-48">Materi / Tujuan Pembelajaran</th>
                        <th className="border border-black p-2">Kegiatan Pembelajaran & Catatan</th>
                        <th className="border border-black p-2 w-20">Absensi (S/I/A)</th>
                        <th className="border border-black p-2 w-20">Paraf Guru</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({length: 12}).map((_, idx) => (
                        <tr key={idx} className="h-10">
                          <td className="border border-black p-1 text-center font-medium">{idx + 1}</td>
                          <td className="border border-black p-1"></td>
                          <td className="border border-black p-1"></td>
                          <td className="border border-black p-1"></td>
                          <td className="border border-black p-1"></td>
                          <td className="border border-black p-1"></td>
                          <td className="border border-black p-1"></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="flex justify-between mt-8 px-6 text-xs text-center">
                    <div>
                      <p className="mb-14">Mengetahui,<br/>Kepala Sekolah</p>
                      <p className="font-bold underline">{kepsek?.name || '_________________________'}</p>
                      <p>NIP. {kepsek?.nip || '-'}</p>
                    </div>
                    <div>
                      <p className="mb-14">...................., {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>Guru Kelas {selectedClass}</p>
                      <p className="font-bold underline">{waliKelas?.name || '_________________________'}</p>
                      <p>NIP. {waliKelas?.nip || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      )}
    </div>
  );
}
