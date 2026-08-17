import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { Save, Copy, Check, Smartphone, Database, AlertCircle, Upload, Trash2, Image, Calendar } from 'lucide-react';
import { GAS_TEMPLATE } from '../lib/constants';
import { fetchFromGAS } from '../lib/api';
import QRCode from "react-qr-code";

export default function Settings() {
  const { settings, setSettings } = useStore();
  const [url, setUrl] = useState(settings.scriptUrl);
  const [appName, setAppName] = useState(settings.appName || 'EduConnect');
  const [schoolName, setSchoolName] = useState(settings.schoolName || 'SDN Citapen');
  const [tahunPelajaran, setTahunPelajaran] = useState(settings.tahunPelajaran || '2025/2026');
  const [folderId, setFolderId] = useState(settings.folderId || '');
  const [adminUser, setAdminUser] = useState(settings.adminUsername || 'admin');
  const [adminPass, setAdminPass] = useState(settings.adminPassword || 'admin');
  const [schoolLogoUrl, setSchoolLogoUrl] = useState(settings.schoolLogoUrl || '');
  const [copied, setCopied] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [initStatus, setInitStatus] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings.tahunPelajaran) setTahunPelajaran(settings.tahunPelajaran);
    if (settings.schoolName) setSchoolName(settings.schoolName);
  }, [settings.tahunPelajaran, settings.schoolName]);

  const shareConfigUrl = settings.scriptUrl ? `${window.location.origin}${window.location.pathname}?config=${encodeURIComponent(btoa(JSON.stringify({ scriptUrl: settings.scriptUrl, folderId: settings.folderId, appName: settings.appName, adminUsername: settings.adminUsername, adminPassword: settings.adminPassword, tahunPelajaran: settings.tahunPelajaran, schoolName: settings.schoolName })))}` : '';

  const handleSave = () => {
    const updatedSettings = { 
      ...settings, 
      scriptUrl: url, 
      appName, 
      schoolName,
      tahunPelajaran,
      folderId, 
      adminUsername: adminUser, 
      adminPassword: adminPass,
      schoolLogoUrl
    };
    
    setSettings(updatedSettings);
    
    // Persist to server backend so any device can load it
    fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedSettings),
    })
    .then(() => {
      setSaveMessage("Pengaturan Berhasil Disimpan & Tersinkronisasi Global!");
    })
    .catch((e) => {
      console.error("Failed to save settings on server:", e);
      setSaveMessage("Pengaturan Disimpan Lokal (Gagal sinkron server)");
    });

    setTimeout(() => setSaveMessage(''), 4000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1.5 * 1024 * 1024) { // 1.5MB limit
      alert("Ukuran gambar terlalu besar. Maksimal 1.5MB untuk performa optimal.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSchoolLogoUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setSchoolLogoUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleInitializeDatabase = async () => {
    if (!url) {
      setInitStatus("Harap masukkan URL Google Apps Script terlebih dahulu.");
      setTimeout(() => setInitStatus(''), 4000);
      return;
    }
    try {
      setIsInitializing(true);
      setInitStatus('Sedang membuat database secara otomatis...');
      const res = await fetchFromGAS(url, { action: 'setup' });
      if (res.success) {
        setInitStatus('Sukses! Google Sheet "DataSiswa" & "DataGuru" berhasil dibuat otomatis.');
        setTimeout(() => setInitStatus(''), 6000);
      } else {
        throw new Error(res.error || "Gagal membuat sheet");
      }
    } catch (e: any) {
      setInitStatus('Gagal: ' + e.message);
      setTimeout(() => setInitStatus(''), 6000);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(GAS_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-indigo-900">Pengaturan</h2>
        <p className="text-gray-500 mt-1 font-medium">Konfigurasi database dengan Google Apps Script.</p>
      </div>

      <div className="bg-white/70 backdrop-blur-2xl p-5 sm:p-8 rounded-3xl sm:rounded-[2rem] border border-white/90 shadow-lg">
        <h3 className="text-xl font-bold mb-6 text-indigo-900">Konfigurasi Umum</h3>
        <div className="space-y-4 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Nama Aplikasi</label>
              <input 
                type="text" 
                className="input w-full text-sm sm:text-base font-semibold" 
                placeholder="Contoh: EduConnect"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Nama Sekolah / Instansi</label>
              <input 
                type="text" 
                className="input w-full text-sm sm:text-base font-semibold" 
                placeholder="Contoh: SD Negeri 1 Sukanagara"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
              />
            </div>
          </div>

          {/* Tahun Pelajaran (Ajaran) */}
          <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="label text-indigo-900 font-bold flex items-center gap-2 mb-0">
                <Calendar size={18} className="text-indigo-600" />
                Tahun Pelajaran (Ajaran)
              </label>
              <span className="text-[11px] font-bold text-indigo-600 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                Aktif: {tahunPelajaran || '2025/2026'}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <input 
                type="text" 
                className="input w-full sm:w-1/2 text-sm sm:text-base font-extrabold text-indigo-950 bg-white" 
                placeholder="Contoh: 2025/2026"
                value={tahunPelajaran}
                onChange={(e) => setTahunPelajaran(e.target.value)}
              />
              <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                {['2024/2025', '2025/2026', '2026/2027', '2027/2028'].map((year) => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => setTahunPelajaran(year)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                      tahunPelajaran === year
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-indigo-700/80">
              Tahun pelajaran ini akan digunakan secara otomatis pada cetak daftar hadir, legger nilai, dokumen administrasi, serta rekapitulasi data.
            </p>
          </div>
          <div>
            <label className="label">Logo Sekolah</label>
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-indigo-50/30 border border-indigo-100/50">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center border border-indigo-100 shadow-sm overflow-hidden flex-shrink-0">
                {schoolLogoUrl ? (
                  <img src={schoolLogoUrl} alt="Logo Sekolah" className="w-full h-full object-cover animate-in fade-in duration-200" referrerPolicy="no-referrer" />
                ) : (
                  <Image className="w-8 h-8 text-indigo-300" />
                )}
              </div>
              
              <div className="flex-1 space-y-2 text-center sm:text-left w-full">
                <p className="text-xs font-semibold text-gray-500">
                  {schoolLogoUrl ? 'Logo sekolah aktif' : 'Gunakan logo kustom sekolah Anda'}
                </p>
                <p className="text-[10px] text-gray-400">Format yang didukung: PNG, JPG, GIF (Maks. 1.5MB)</p>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef} 
                    onChange={handleLogoUpload} 
                    className="hidden" 
                  />
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()} 
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95 duration-100"
                  >
                    <Upload size={14} /> Pilih Gambar
                  </button>
                  {schoolLogoUrl && (
                    <button 
                      type="button" 
                      onClick={handleRemoveLogo} 
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition active:scale-95 duration-100"
                    >
                      <Trash2 size={14} /> Hapus
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Username Login</label>
              <input 
                type="text" 
                className="input w-full text-sm sm:text-base" 
                placeholder="admin"
                value={adminUser}
                onChange={(e) => setAdminUser(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Password Login</label>
              <input 
                type="password" 
                className="input w-full text-sm sm:text-base" 
                placeholder="admin"
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
              />
            </div>
          </div>
        </div>

        <h3 className="text-xl font-bold mb-6 text-indigo-900">Integrasi Google Sheets & Drive</h3>
        
        <div className="space-y-4">
          <div>
            <label className="label">Google Apps Script Web App URL</label>
            <input 
              type="text" 
              className="input w-full text-sm sm:text-base" 
              placeholder="https://script.google.com/macros/s/.../exec"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-2">Dapatkan URL ini dari proses deploy Google Apps Script.</p>
          </div>
          <div>
            <label className="label">Folder ID Google Drive (Opsional)</label>
            <input 
              type="text" 
              className="input w-full text-sm sm:text-base" 
              placeholder="Contoh: 1BxiMVs0XzM... (Ambil dari URL folder)"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-2">Jika dikosongkan, script akan otomatis membuat folder "SISWA_UPLOADS".</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            <button onClick={handleSave} className="btn w-full sm:w-auto">
              <Save size={18} />
              Simpan Konfigurasi
            </button>

            {saveMessage && (
              <span className="p-2 px-4 rounded-xl bg-green-100 border border-green-200 text-green-700 text-sm font-semibold flex items-center gap-1.5 animate-pulse">
                <Check size={16} />
                {saveMessage}
              </span>
            )}
          </div>

          {/* Fitur Pembuatan Sheet Otomatis */}
          <div className="mt-6 p-6 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-4">
            <div>
              <h4 className="font-bold text-indigo-900 flex items-center gap-2">
                <Database size={18} className="text-indigo-600" />
                Pembuatan Sheet Otomatis (Anti-Error)
              </h4>
              <p className="text-xs text-indigo-700/80 mt-1 leading-relaxed">
                Untuk meminimalisir kesalahan manual, sistem dapat membuat semua sheet database yang dibutuhkan secara otomatis di Google Spreadsheet Anda (Sheet <strong>DataSiswa</strong> dan <strong>DataGuru</strong>).
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <button 
                type="button"
                onClick={handleInitializeDatabase} 
                disabled={isInitializing}
                className="btn w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-indigo-300"
              >
                {isInitializing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Membuat Sheet...
                  </>
                ) : (
                  <>
                    <Database size={16} />
                    Buat Sheet Otomatis
                  </>
                )}
              </button>

              {initStatus && (
                <span className={`p-2 px-4 rounded-xl text-sm font-medium flex items-center gap-1.5 ${
                  initStatus.startsWith('Gagal') 
                    ? 'bg-rose-100 border border-rose-200 text-rose-700' 
                    : initStatus.startsWith('Sukses')
                    ? 'bg-emerald-100 border border-emerald-200 text-emerald-700'
                    : 'bg-indigo-100 border border-indigo-200 text-indigo-700 animate-pulse'
                }`}>
                  <AlertCircle size={16} />
                  {initStatus}
                </span>
              )}
            </div>
          </div>
        </div>

        {shareConfigUrl && (
          <div className="mt-8 pt-8 border-t border-white/40">
            <h3 className="text-xl font-bold mb-4 text-indigo-900 flex items-center gap-2">
              <Smartphone size={24} className="text-indigo-600" />
              Hubungkan ke Handphone Anda
            </h3>
            <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 flex flex-col md:flex-row items-center gap-8">
              <div className="flex-shrink-0 bg-white p-3 rounded-2xl shadow-sm border border-indigo-50">
                <QRCode value={shareConfigUrl} size={150} level="M" />
              </div>
              <div>
                <h4 className="font-bold text-indigo-900 mb-2">Sinkronisasi Super Cepat!</h4>
                <p className="text-sm text-indigo-700/80 mb-4 leading-relaxed">
                  Buka aplikasi kamera atau pemindai (scanner) di Handphone Anda, dan scan QR Code di samping untuk membuka aplikasi versi Mobile. Konfigurasi Google Sheets Anda akan otomatis tersinkronisasi.
                </p>
                <div className="flex bg-white border border-indigo-100 rounded-lg overflow-hidden relative">
                  <input type="text" readOnly value={shareConfigUrl} className="w-full text-xs text-slate-500 p-2 outline-none cursor-text" />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 pt-8 border-t border-white/40">
          <h4 className="font-semibold text-indigo-900 mb-3 text-lg">Panduan Instalasi Script</h4>
          <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2 mb-6 leading-relaxed">
            <li>Buat Google Spreadsheet baru di Google Drive Anda.</li>
            <li>Klik menu <strong>Ekstensi</strong> {'>'} <strong>Apps Script</strong>.</li>
            <li>Hapus semua kode yang ada, copy paste kode di bawah ini <b>(Pastikan menyalin ulang karena ada tambahan izin Drive)</b>.</li>
            <li>Klik tombol <strong>Simpan</strong> (ikon Disket).</li>
            <li className="text-rose-600 font-bold">SANGAT PENTING UNTUK IZIN UPLOAD: Pilih fungsi <code>setup</code> di dropdown bagian atas editor, lalu klik <strong>Jalankan (Run)</strong>.</li>
            <li className="text-rose-600 font-bold">Akan muncul popup "Otorisasi Diperlukan". Klik Tinjau Izin {'>'} Pilih akun Anda {'>'} Klik Lanjutan (Advanced) di bawah {'>'} Klik Buka project (tidak aman) {'>'} Izinkan (Allow).</li>
            <li>Klik tombol biru <strong>Terapkan (Deploy)</strong> {'>'} <strong>Deployment Baru (New deployment)</strong>. <i>(Jika tidak buat deployment baru, izin tidak akan terupdate!)</i></li>
            <li>Pilih Jenis <strong>Aplikasi Web (Web App)</strong>.</li>
            <li>Atur Akses {'>'} Jalankan sebagai: <strong>Saya (Me)</strong>, Siapa yang memiliki akses: <strong>Siapa saja (Anyone)</strong>.</li>
            <li>Klik Terapkan.</li>
            <li>Copy URL Web App dan paste di form konfigurasi di atas.</li>
          </ol>

          <div className="relative">
            <button 
              onClick={handleCopy}
              className="absolute top-2 right-2 p-2 bg-slate-800 text-white rounded hover:bg-slate-700 transition"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
            <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-sm overflow-auto h-96">
              <code>{GAS_TEMPLATE}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
