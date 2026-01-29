export type AttendanceMode = 'SELFIE' | 'BIO';

export type AttendanceEntry = {
  id: string;
  employee_id: string;
  type: 'IN' | 'OUT';
  method: 'FACE' | 'BIO';
  status: 'PRESENT' | 'EN_RETARD' | 'REFUSE';
  note?: string | null;
  lat?: number | null;
  lng?: number | null;
  distance_meters?: number | null;
  selfie_url?: string | null;
  timestamp: string;
};

export async function attendanceMe(employeeId: string) {
  const res = await fetch(`/api/attendance/me?employeeId=${encodeURIComponent(employeeId)}`);
  const text = await res.text();
  if (!text) throw new Error('Réponse vide du serveur');
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`Réponse invalide: ${text.substring(0, 100)}`);
  }
  if (!res.ok) throw new Error(data?.error || 'Erreur récupération pointage');
  return data as { entries: AttendanceEntry[] };
}

export async function attendanceCheckIn(params: {
  employeeId: string;
  lat: number;
  lng: number;
  mode: AttendanceMode;
  selfieDataUrl?: string;
}) {
  const res = await fetch('/api/attendance/check-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const text = await res.text();
  if (!text) throw new Error('Réponse vide du serveur');
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`Réponse invalide: ${text.substring(0, 100)}`);
  }
  if (!res.ok) throw new Error(data?.error || 'Erreur check-in');
  return data as { entry: AttendanceEntry };
}

