import { Student } from '../types';

// Converts a File to Base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const fetchFromGAS = async (url: string, payload: any) => {
  if (!url) throw new Error("Google Apps Script URL is not configured. Go to Settings.");
  
  // Use POST to send data
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
     throw new Error("HTTP Error: " + response.status);
  }

  const text = await response.text();
  try {
    const data = JSON.parse(text);
    if (data.error) throw new Error(data.error);
    return data;
  } catch (e) {
    throw new Error(`Invalid response from server: ${text}`);
  }
};

export const uploadFileToGAS = async (url: string, file: File, folderId?: string, folderName: string = "SI_Siswa_Uploads") => {
  const base64Data = await fileToBase64(file);
  // Remove data:image/png;base64, prefix
  const base64Content = base64Data.split(',')[1];
  
  const payload = {
    action: 'upload',
    filename: file.name,
    mimeType: file.type,
    base64: base64Content,
    folderName,
    folderId
  };

  const res = await fetchFromGAS(url, payload);
  if (res.error) throw new Error(res.error);
  return res.url; // The Google Drive File URL
};
