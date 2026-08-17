import React, { useState, useEffect } from 'react';
import { Home, Users, Settings as SettingsIcon, Menu, X, LogOut, FileOutput, CalendarCheck, TrendingUp, RefreshCw, GraduationCap, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import Dashboard from './pages/Dashboard';
import StudentsList from './pages/StudentsList';
import TeachersList from './pages/TeachersList';
import AlumniList from './pages/AlumniList';
import MutasiList from './pages/MutasiList';
import AttendancePrint from './pages/AttendancePrint';
import KenaikanKelas from './pages/KenaikanKelas';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { useStore } from './store';
import { fetchFromGAS } from './lib/api';

function App() {
  const { isAuthenticated, logout, settings, setSettings, setStudents, students, teachers, setTeachers, lastSyncedAt, isSyncingGlobal, setLastSyncedAt, setIsSyncingGlobal } = useStore();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'teachers' | 'alumni' | 'mutasi' | 'attendance' | 'kenaikan' | 'settings'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Load settings from server on mount
  useEffect(() => {
    const loadServerSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const serverSettings = await response.json();
          if (serverSettings && serverSettings.scriptUrl) {
            setSettings({
              ...useStore.getState().settings,
              ...serverSettings
            });
          }
        }
      } catch (e) {
        console.error("Failed to load settings from server:", e);
      }
    };
    loadServerSettings();
  }, [setSettings]);

  // Handle share configuration from query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const configParam = params.get('config');
    if (configParam) {
      try {
        const parsedConfig = JSON.parse(atob(decodeURIComponent(configParam)));
        if (parsedConfig.scriptUrl) {
          const newSettings = {
            ...settings,
            scriptUrl: parsedConfig.scriptUrl,
            folderId: parsedConfig.folderId || settings.folderId,
            appName: parsedConfig.appName || settings.appName,
            adminUsername: parsedConfig.adminUsername || settings.adminUsername,
            adminPassword: parsedConfig.adminPassword || settings.adminPassword,
          };
          setSettings(newSettings);
          
          // Also persist this newly scanned config to the server
          fetch('/api/settings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(newSettings),
          }).catch((err) => console.error("Failed to persist shared config on server:", err));

          alert('Konfigurasi sinkronisasi berhasil ditambahkan! Silahkan login dan datanya akan tersinkronisasi.');
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (e) {
        console.error("Invalid config URL");
      }
    }
  }, [setSettings, settings]);

  useEffect(() => {
    if (!isAuthenticated || !settings.scriptUrl) return;

    let isMounted = true;
    const fetchRealtimeData = async () => {
      try {
        setIsSyncing(true);
        setIsSyncingGlobal(true);
        const res = await fetchFromGAS(settings.scriptUrl, { action: 'pull' });
        if (isMounted) {
          const fetchedStudents: any[] = res.students || res.data || [];
          const localStudents = useStore.getState().students;

          let missingUrlsInRemote = false;
          const mergedStudents = fetchedStudents.map((remote: any) => {
            const local = localStudents.find(
              s => (s.id && s.id === remote.id) || (s.nis && String(s.nis).trim() === String(remote.nis).trim())
            );
            if (!local) return remote;

            const fotoUrl = remote.fotoUrl || local.fotoUrl || '';
            const kkUrl = remote.kkUrl || local.kkUrl || '';
            const akteUrl = remote.akteUrl || local.akteUrl || '';
            const ijazahUrl = remote.ijazahUrl || local.ijazahUrl || '';
            const berkasUrl = remote.berkasUrl || local.berkasUrl || '';

            if ((!remote.fotoUrl && local.fotoUrl) || (!remote.kkUrl && local.kkUrl) || (!remote.akteUrl && local.akteUrl)) {
              missingUrlsInRemote = true;
            }

            return {
              ...remote,
              id: remote.id || local.id,
              fotoUrl,
              kkUrl,
              akteUrl,
              ijazahUrl,
              berkasUrl,
            };
          });

          // Include any newly added local students that aren't on remote yet
          localStudents.forEach(local => {
            const exists = mergedStudents.some(
              m => (m.id && m.id === local.id) || (m.nis && String(m.nis).trim() === String(local.nis).trim())
            );
            if (!exists) {
              mergedStudents.push(local);
              missingUrlsInRemote = true;
            }
          });

          if (JSON.stringify(mergedStudents) !== JSON.stringify(localStudents)) {
            setStudents(mergedStudents);
          }

          // If remote had missing file URLs that local has, trigger sync to heal the Google Sheet!
          if (missingUrlsInRemote && settings.scriptUrl) {
            fetchFromGAS(settings.scriptUrl, {
              action: 'sync',
              data: mergedStudents,
              teachers: useStore.getState().teachers
            }).catch(e => console.error("Auto repair sync failed:", e));
          }

          const fetchedTeachers = res.teachers || [];
          if (JSON.stringify(fetchedTeachers) !== JSON.stringify(teachers)) {
            setTeachers(fetchedTeachers);
          }
          setLastSyncedAt(new Date().toLocaleTimeString('id-ID'));
        }
      } catch (e) {
        console.error("Auto sync failed:", e);
      } finally {
        if (isMounted) {
          setIsSyncing(false);
          setIsSyncingGlobal(false);
        }
      }
    };

    fetchRealtimeData(); 
    const interval = setInterval(fetchRealtimeData, 30000); 
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isAuthenticated, settings.scriptUrl, setStudents, setTeachers]);

  if (!isAuthenticated) {
    return <Login />;
  }

  const displayName = settings.schoolName || settings.appName || 'SDN Citapen';

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    setIsLoggingOut(true);
    setTimeout(() => {
      setIsLoggingOut(false);
      logout();
    }, 1000);
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'students', label: 'Data Siswa', icon: Users },
    { id: 'teachers', label: 'Data Guru', icon: GraduationCap },
    { id: 'alumni', label: 'Data Alumni', icon: Award },
    { id: 'mutasi', label: 'Mutasi Siswa', icon: FileOutput },
    { id: 'attendance', label: 'Menu Cetak', icon: CalendarCheck },
    { id: 'kenaikan', label: 'Kenaikan Kelas', icon: TrendingUp },
    { id: 'settings', label: 'Pengaturan', icon: SettingsIcon },
  ] as const;

  return (
    <div className="h-screen w-full bg-gradient-to-br from-[#e0e7ff] via-[#f3e8ff] to-[#fce7f3] flex flex-col md:flex-row font-sans text-gray-800">
      {isLoggingOut && (
        <div className="fixed inset-0 z-[9999] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
          <p className="text-indigo-900 font-medium">Sedang keluar...</p>
        </div>
      )}
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden animate-in fade-in transition-opacity"
        />
      )}

      {/* Mobile Top Bar */}
      <div className="md:hidden bg-indigo-600/90 backdrop-blur-md text-white p-3.5 px-4 flex justify-between items-center no-print z-50 shadow-md">
        <div className="flex items-center gap-2.5">
          {settings.schoolLogoUrl && (
            <img src={settings.schoolLogoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-cover bg-white" referrerPolicy="no-referrer" />
          )}
          <h1 className="font-bold text-base tracking-tight truncate">{displayName}</h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition active:scale-95">
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Floating Sidebar Toggle Button (Desktop Only, shows when sidebar is hidden/collapsed) */}
      {!isMobileMenuOpen && isSidebarCollapsed && (
        <button 
          onClick={() => setIsSidebarCollapsed(false)} 
          className="hidden md:flex fixed top-6 left-6 z-[45] p-3 bg-white/70 backdrop-blur-md border border-white/80 rounded-2xl shadow-lg shadow-indigo-100 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 hover:scale-[1.05] transition-all duration-300 animate-in fade-in zoom-in"
          title="Tampilkan Sidebar"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 bg-white/90 md:bg-white/30 backdrop-blur-xl border-r border-white/40 shadow-2xl md:shadow-[0_8px_32px_0_rgba(99,102,241,0.05)] p-6 flex flex-col transform transition-all duration-300 ease-in-out md:static md:translate-x-0 no-print flex-shrink-0 overflow-hidden",
        isMobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0",
        isSidebarCollapsed ? "md:w-0 md:p-0 md:border-r-0 md:opacity-0 md:pointer-events-none" : "md:w-64 md:opacity-100"
      )}>
        <div className="mb-10 hidden md:flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 truncate">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 flex-shrink-0 overflow-hidden">
              {settings.schoolLogoUrl ? (
                <img src={settings.schoolLogoUrl} alt="Logo" className="w-full h-full object-cover bg-white" referrerPolicy="no-referrer" />
              ) : (
                <Users className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-xl tracking-tight text-indigo-950 truncate">{displayName}</span>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100/80 px-2 py-0.5 rounded-md border border-indigo-200/50 self-start mt-0.5 font-mono">
                TP {settings.tahunPelajaran || '2025/2026'}
              </span>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarCollapsed(true)} 
            className="p-1.5 hover:bg-white/60 text-gray-400 hover:text-indigo-600 rounded-lg transition-all"
            title="Sembunyikan Sidebar"
          >
            <X size={16} />
          </button>
        </div>
        <nav className="flex-1 space-y-2 overflow-y-auto mt-6 md:mt-0 pr-2">
          <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4 hidden md:block">Menu Utama</div>
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsMobileMenuOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 p-3 sm:px-4 sm:py-3 rounded-xl transition-all text-left font-medium active:scale-95 duration-150",
                  activeTab === tab.id 
                    ? "bg-white/90 md:bg-white/70 text-indigo-700 shadow-md shadow-indigo-100/30 border border-white/80 scale-[1.02]" 
                    : "text-gray-600 hover:bg-white/60 md:hover:bg-white/40 border border-transparent hover:scale-[1.01]"
                )}
              >
                <Icon size={20} className={cn("transition-transform duration-300", activeTab === tab.id ? "scale-110 text-indigo-600" : "group-hover:scale-110")} />
                <span className="transition-all duration-300">{tab.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="mt-auto pt-4 border-t border-white/20 space-y-3">
          {/* Status Sinkronisasi - Berada di atas tombol logout */}
          {(isSyncingGlobal || lastSyncedAt) && (
            <div className={cn(
              "p-3 rounded-2xl shadow-xs border backdrop-blur-md flex items-center gap-2.5 transition-all duration-300",
              isSyncingGlobal 
                ? "bg-indigo-600/90 text-white border-indigo-500/50" 
                : "bg-white/80 text-gray-800 border-white/80 shadow-indigo-100/50"
            )}>
              <div className="flex items-center justify-center">
                {isSyncingGlobal ? (
                  <RefreshCw size={16} className="animate-spin text-indigo-600" />
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold leading-tight truncate">
                  {isSyncingGlobal ? "Mensinkronkan..." : "Tersinkronisasi"}
                </p>
                {lastSyncedAt && (
                  <p className={cn(
                    "text-[10px] mt-0.5 font-medium leading-none truncate",
                    isSyncingGlobal ? "text-indigo-200" : "text-gray-400"
                  )}>
                    Terakhir diperbarui: {lastSyncedAt}
                  </p>
                )}
              </div>
            </div>
          )}

          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left font-medium text-rose-600 hover:bg-rose-50 border border-transparent active:scale-95 duration-150"
          >
            <LogOut size={20} />
            <span>Keluar</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 md:p-8 h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="w-full"
          >
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'students' && <StudentsList />}
            {activeTab === 'teachers' && <TeachersList />}
            {activeTab === 'alumni' && <AlumniList />}
            {activeTab === 'mutasi' && <MutasiList />}
            {activeTab === 'attendance' && <AttendancePrint />}
            {activeTab === 'kenaikan' && <KenaikanKelas />}
            {activeTab === 'settings' && <Settings />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl p-6 border border-gray-100 text-center space-y-6">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto border border-rose-100">
              <LogOut size={28} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Konfirmasi Keluar</h3>
              <p className="text-gray-500 text-sm mt-1">Apakah Anda yakin ingin keluar dari aplikasi dan menghapus sesi saat ini?</p>
            </div>
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 font-semibold transition"
              >
                Batal
              </button>
              <button 
                type="button" 
                onClick={handleConfirmLogout}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md transition animate-pulse"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
