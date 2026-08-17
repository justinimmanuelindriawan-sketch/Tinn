import React, { useState } from 'react';
import { useStore } from '../store';
import { Lock, User, Eye, EyeOff, ShieldCheck, Quote, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Login() {
  const { login, settings } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const schoolName = settings?.schoolName || 'SDN Citapen';
  const subtitle = (settings?.appName && settings.appName.trim().toLowerCase() !== schoolName.trim().toLowerCase()) 
    ? settings.appName 
    : 'Sistem Informasi Siswa';
  const tahunPelajaran = settings?.tahunPelajaran || '2025/2026';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const correctUsername = settings?.adminUsername || 'admin';
    const correctPassword = settings?.adminPassword || 'admin';
    
    if (username === correctUsername && password === correctPassword) {
      setIsLoggingIn(true);
      setTimeout(() => {
        setIsLoggingIn(false);
        login();
      }, 800);
    } else {
      setError('Username atau password yang Anda masukkan tidak valid');
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 flex items-center justify-center p-3 sm:p-6 lg:p-8 font-sans text-slate-800 relative overflow-hidden select-none">
      
      {/* 1. TRANSPARENT VECTOR LINE ART BACKGROUND (BEHIND LOGIN CARD) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-end justify-center opacity-30">
        <svg 
          className="w-full h-[380px] sm:h-[450px] min-w-[1000px] text-blue-200/30" 
          viewBox="0 0 1440 320" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Repeated City / School Buildings Line Art Pattern Overlay */}
          <path d="M0 320V220H40V260H70V180H120V320H150V200H210V150H260V320H280V240H320V190H370V320H400V160H450V230H490V320H520V180H580V320H620V210H680V140H740V320H770V230H820V170H880V320H910V190H970V130H1030V320H1070V220H1120V320H1160V170H1220V320H1260V200H1320V150H1380V320H1440V320H0Z" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" fill="none" />
          
          {/* Architectural Lines & Grid Details */}
          <line x1="120" y1="180" x2="120" y2="320" stroke="currentColor" strokeWidth="1" />
          <line x1="210" y1="150" x2="210" y2="320" stroke="currentColor" strokeWidth="1" />
          <line x1="260" y1="150" x2="260" y2="320" stroke="currentColor" strokeWidth="1" />
          <line x1="370" y1="190" x2="370" y2="320" stroke="currentColor" strokeWidth="1" />
          <line x1="450" y1="160" x2="450" y2="320" stroke="currentColor" strokeWidth="1" />
          <line x1="580" y1="180" x2="580" y2="320" stroke="currentColor" strokeWidth="1" />
          <line x1="680" y1="140" x2="680" y2="320" stroke="currentColor" strokeWidth="1" />
          <line x1="740" y1="140" x2="740" y2="320" stroke="currentColor" strokeWidth="1" />
          <line x1="880" y1="170" x2="880" y2="320" stroke="currentColor" strokeWidth="1" />
          <line x1="970" y1="130" x2="970" y2="320" stroke="currentColor" strokeWidth="1" />
          <line x1="1030" y1="130" x2="1030" y2="320" stroke="currentColor" strokeWidth="1" />
          <line x1="1220" y1="170" x2="1220" y2="320" stroke="currentColor" strokeWidth="1" />
          <line x1="1320" y1="150" x2="1320" y2="320" stroke="currentColor" strokeWidth="1" />

          {/* Windows Line Repeats */}
          <path d="M165 215H195M165 235H195M165 255H195M165 275H195" stroke="currentColor" strokeWidth="1" />
          <path d="M225 170H245M225 190H245M225 210H245M225 230H245M225 250H245" stroke="currentColor" strokeWidth="1" />
          <path d="M415 180H435M415 200H435M415 220H435M415 240H435" stroke="currentColor" strokeWidth="1" />
          <path d="M700 160H720M700 185H720M700 210H720M700 235H720M700 260H720" stroke="currentColor" strokeWidth="1" />
          <path d="M990 150H1010M990 175H1010M990 200H1010M990 225H1010M990 250H1010" stroke="currentColor" strokeWidth="1" />

          {/* Soft Trees Line Art */}
          <circle cx="90" cy="270" r="25" stroke="currentColor" strokeWidth="1.2" />
          <line x1="90" y1="295" x2="90" y2="320" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="345" cy="265" r="22" stroke="currentColor" strokeWidth="1.2" />
          <line x1="345" y1="287" x2="345" y2="320" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="600" cy="260" r="28" stroke="currentColor" strokeWidth="1.2" />
          <line x1="600" y1="288" x2="600" y2="320" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="850" cy="265" r="24" stroke="currentColor" strokeWidth="1.2" />
          <line x1="850" y1="289" x2="850" y2="320" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="1140" cy="260" r="26" stroke="currentColor" strokeWidth="1.2" />
          <line x1="1140" y1="286" x2="1140" y2="320" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Ambient Radial Lighting for Depth */}
      <div className="absolute top-0 left-1/4 w-[32rem] sm:w-[40rem] h-[32rem] sm:h-[40rem] bg-blue-500/20 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[36rem] sm:w-[44rem] h-[36rem] sm:h-[44rem] bg-cyan-500/15 rounded-full blur-[140px] pointer-events-none" />

      {/* MAIN LOGIN CONTAINER CARD */}
      <motion.div 
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md md:max-w-5xl bg-[#fcfdff] rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] border border-white/60 shadow-2xl shadow-indigo-950/40 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[500px] sm:min-h-[580px] relative z-10"
      >
        
        {/* LEFT COLUMN - FORM SECTION */}
        <div className="md:col-span-6 lg:col-span-5 p-6 sm:p-8 md:p-9 lg:p-12 flex flex-col justify-between bg-white relative z-10 border-r border-slate-100">
          
          {/* Header & Logo */}
          <div>
            <div className="flex items-center gap-3 mb-6 sm:mb-8">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 shrink-0 overflow-hidden p-0.5">
                {settings?.schoolLogoUrl ? (
                  <img src={settings.schoolLogoUrl} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                ) : (
                  <GraduationCap className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="min-w-0">
                <span className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight block truncate">{schoolName}</span>
                <span className="text-[11px] font-bold text-indigo-600 tracking-wide block uppercase truncate">
                  {subtitle}
                </span>
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="mb-6 sm:mb-8">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Masuk Akun</h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1.5 sm:mt-2 leading-relaxed">
                Selamat datang kembali! Silakan masukkan kredensial Anda untuk mengakses sistem.
              </p>
            </div>

            {/* Login Form (User & Password Only) */}
            <form onSubmit={handleLogin} className="space-y-4">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1, x: [0, -5, 5, -3, 3, 0] }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.35 }}
                    className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl font-semibold text-center shadow-xs flex items-center justify-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Username <span className="text-rose-500">*</span></span>
                </label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors w-4 h-4" />
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username" 
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-slate-50/80 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all outline-hidden"
                    required
                    disabled={isLoggingIn}
                    autoFocus
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Password <span className="text-rose-500">*</span></span>
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors w-4 h-4" />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password" 
                    className="w-full pl-10 pr-10 py-2.5 sm:py-3 bg-slate-50/80 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all outline-hidden"
                    required
                    disabled={isLoggingIn}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-indigo-600 transition-colors p-0.5 rounded-lg focus:outline-hidden cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit Action Button */}
              <motion.button 
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit" 
                disabled={isLoggingIn} 
                className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold py-3 sm:py-3.5 px-6 rounded-2xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all duration-200 flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed mt-5 sm:mt-6"
              >
                {isLoggingIn ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>Masuk Aplikasi</span>
                )}
              </motion.button>
            </form>
          </div>

          {/* Bottom Security Notice */}
          <div className="mt-6 sm:mt-8 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] font-medium text-slate-400 flex items-center justify-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>Sistem Terenkripsi & Terintegrasi • TP {tahunPelajaran}</span>
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN - QUOTE & FLUSH PRECISION VECTOR ARTWORK */}
        <div className="hidden md:flex md:col-span-6 lg:col-span-7 bg-[#f6f8fc] p-6 md:p-8 lg:p-12 flex-col justify-between relative overflow-hidden">
          
          {/* Testimonial / Quote Section */}
          <div className="relative z-10 max-w-lg">
            <Quote className="w-8 h-8 lg:w-10 lg:h-10 text-amber-500 mb-2.5 sm:mb-3 rotate-180" />
            <p className="text-slate-800 font-bold text-sm lg:text-lg leading-relaxed tracking-tight">
              Aplikasi Sistem Informasi Siswa terpadu untuk kemudahan pengelolaan data absensi, leger nilai, mutasi akademik, serta rekam jejak siswa secara efisien.
            </p>

            <div className="flex items-center gap-3.5 mt-4 sm:mt-6">
              <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shadow-md shadow-indigo-200 border-2 border-white shrink-0">
                {schoolName.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">{schoolName}</h4>
                <p className="text-[11px] font-medium text-slate-500">Administrator & Manajemen Akademik</p>
              </div>
            </div>
          </div>

          {/* PRECISION VECTOR LINE ART (FLUSH AT BOTTOM RIGHT EDGE OF CARD) */}
          <div className="absolute bottom-0 right-0 left-0 w-full pointer-events-none flex items-end justify-end overflow-hidden pt-8 md:pt-12">
            <svg 
              className="w-full h-[180px] md:h-[210px] lg:h-[260px] text-slate-800" 
              viewBox="0 0 700 260" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Background Accent Geometry */}
              <rect x="420" y="80" width="220" height="180" fill="#e2e8f0" rx="4" />
              <rect x="240" y="110" width="160" height="150" fill="#edf2f7" rx="4" />
              <rect x="110" y="150" width="110" height="110" fill="#f1f5f9" rx="4" />
              <rect x="440" y="110" width="180" height="150" fill="#fef3c7" opacity="0.6" rx="4" />

              {/* Main School Building Vector Outline */}
              <path d="M50 260V180H100V260M100 260V140H220V260M220 260V100H410V260M410 260V60H650V260H680" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              
              {/* Roof Line Accents */}
              <path d="M90 140L160 110L230 140" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M200 100H430" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
              <path d="M390 60H670" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />

              {/* Clock Tower on Main School Building */}
              <rect x="580" y="80" width="50" height="100" stroke="#1e293b" strokeWidth="3" fill="#ffffff" />
              <circle cx="605" cy="110" r="14" stroke="#1e293b" strokeWidth="2.5" fill="#fef3c7" />
              <path d="M605 102V110H612" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />

              {/* Windows Grid */}
              {/* Lower Building Windows */}
              <rect x="120" y="160" width="22" height="35" stroke="#1e293b" strokeWidth="2" fill="#38bdf8" opacity="0.8" rx="2" />
              <rect x="155" y="160" width="22" height="35" stroke="#1e293b" strokeWidth="2" fill="#38bdf8" opacity="0.8" rx="2" />
              <rect x="190" y="160" width="22" height="35" stroke="#1e293b" strokeWidth="2" fill="#38bdf8" opacity="0.8" rx="2" />

              {/* Middle Building Windows */}
              <rect x="245" y="125" width="30" height="40" stroke="#1e293b" strokeWidth="2" fill="#ffffff" rx="2" />
              <rect x="290" y="125" width="30" height="40" stroke="#1e293b" strokeWidth="2" fill="#ffffff" rx="2" />
              <rect x="335" y="125" width="30" height="40" stroke="#1e293b" strokeWidth="2" fill="#ffffff" rx="2" />
              <rect x="380" y="125" width="20" height="40" stroke="#1e293b" strokeWidth="2" fill="#ffffff" rx="2" />

              <rect x="245" y="180" width="30" height="40" stroke="#1e293b" strokeWidth="2" fill="#ffffff" rx="2" />
              <rect x="290" y="180" width="30" height="40" stroke="#1e293b" strokeWidth="2" fill="#ffffff" rx="2" />
              <rect x="335" y="180" width="30" height="40" stroke="#1e293b" strokeWidth="2" fill="#ffffff" rx="2" />

              {/* Main Building Windows */}
              <rect x="430" y="80" width="35" height="45" stroke="#1e293b" strokeWidth="2" fill="#ffffff" rx="2" />
              <rect x="480" y="80" width="35" height="45" stroke="#1e293b" strokeWidth="2" fill="#ffffff" rx="2" />
              <rect x="530" y="80" width="35" height="45" stroke="#1e293b" strokeWidth="2" fill="#ffffff" rx="2" />

              <rect x="430" y="145" width="35" height="45" stroke="#1e293b" strokeWidth="2" fill="#3b82f6" opacity="0.8" rx="2" />
              <rect x="480" y="145" width="35" height="45" stroke="#1e293b" strokeWidth="2" fill="#3b82f6" opacity="0.8" rx="2" />
              <rect x="530" y="145" width="35" height="45" stroke="#1e293b" strokeWidth="2" fill="#3b82f6" opacity="0.8" rx="2" />

              {/* Entrance Pillars & Door */}
              <rect x="300" y="215" width="50" height="45" stroke="#1e293b" strokeWidth="2.5" fill="#ffffff" />
              <path d="M325 215V260" stroke="#1e293b" strokeWidth="2" />

              {/* Flag Pole */}
              <line x1="75" y1="260" x2="75" y2="100" stroke="#1e293b" strokeWidth="3" />
              <path d="M75 105L115 118L75 131Z" fill="#ef4444" stroke="#1e293b" strokeWidth="2" />

              {/* Vector Trees & Environment */}
              {/* Tree 1 */}
              <path d="M50 260C20 260 20 200 45 200C50 180 80 180 85 200C110 200 110 260 80 260Z" fill="#3b82f6" opacity="0.15" stroke="#1e293b" strokeWidth="2.5" />
              
              {/* Tree 2 */}
              <circle cx="215" cy="225" r="22" fill="#10b981" opacity="0.2" stroke="#1e293b" strokeWidth="2.5" />
              <line x1="215" y1="247" x2="215" y2="260" stroke="#1e293b" strokeWidth="3" />

              {/* Tree 3 */}
              <circle cx="650" cy="230" r="25" fill="#3b82f6" opacity="0.2" stroke="#1e293b" strokeWidth="2.5" />
              <line x1="650" y1="255" x2="650" y2="260" stroke="#1e293b" strokeWidth="3" />

              {/* Ground Baseline Line */}
              <line x1="0" y1="259" x2="700" y2="259" stroke="#1e293b" strokeWidth="4" />
            </svg>
          </div>

        </div>

      </motion.div>
    </div>
  );
}


