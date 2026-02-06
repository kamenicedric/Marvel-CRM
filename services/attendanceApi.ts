export type AttendanceMode = 'SELFIE' | 'BIO';

export type AttendanceEntry = {
  id: string;
  employee_id: string;
  type: 'IN' | 'OUT';
  method: 'FACE' | 'BIO' | 'VISA';
  status?: 'PRESENT' | 'EN_RETARD' | 'REFUSE';
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

export async function attendanceHistory(employeeId: string, monthOffset = 0) {
  const params = new URLSearchParams({
    employeeId: encodeURIComponent(employeeId),
  });
  if (monthOffset !== 0) {
    params.append('monthOffset', String(monthOffset));
  }
  const res = await fetch(`/api/attendance/history?${params.toString()}`);
  const text = await res.text();
  if (!text) throw new Error('Réponse vide du serveur');
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`Réponse invalide: ${text.substring(0, 100)}`);
  }
  if (!res.ok) throw new Error(data?.error || 'Erreur récupération historique pointage');
  return data as { entries: AttendanceEntry[] };
}

export async function attendanceCheckIn(params: {
  employeeId: string;
  lat: number;
  lng: number;
  mode: AttendanceMode;
  selfieDataUrl?: string;
}) {
  try {
    const res = await fetch('/api/attendance/check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const text = await res.text();
    
    if (!text) {
      throw new Error(`Réponse vide du serveur (status: ${res.status})`);
    }
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      // Si ce n'est pas du JSON, c'est probablement une page HTML d'erreur
      if (text.includes('NOT_FOUND') || text.includes('404') || res.status === 404) {
        throw new Error(`Route API non trouvée. Vérifiez que le serveur de développement est démarré et accessible. Status: ${res.status}`);
      }
      throw new Error(`Réponse invalide (non-JSON): ${text.substring(0, 200)}`);
    }
    
    if (!res.ok) {
      const errorMsg = data?.error || data?.message || 'Erreur check-in';
      const details = data?.details ? ` (${data.details})` : '';
      throw new Error(`${errorMsg}${details}`);
    }
    
    return data as { entry: AttendanceEntry };
  } catch (error: any) {
    // Si c'est déjà une Error avec message, la relancer
    if (error instanceof Error) {
      throw error;
    }
    // Sinon, wrapper l'erreur
    throw new Error(`Erreur réseau: ${error?.message || String(error)}`);
  }
}

export async function attendanceCheckOut(params: {
  employeeId: string;
  lat: number;
  lng: number;
  mode: AttendanceMode;
  selfieDataUrl?: string;
}) {
  try {
    const res = await fetch('/api/attendance/check-out', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const text = await res.text();

    if (!text) {
      throw new Error(`Réponse vide du serveur (status: ${res.status})`);
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      if (text.includes('NOT_FOUND') || text.includes('404') || res.status === 404) {
        throw new Error(
          `Route API non trouvée pour le check-out. Vérifiez que le serveur de développement est démarré. Status: ${res.status}`,
        );
      }
      throw new Error(`Réponse invalide (non-JSON): ${text.substring(0, 200)}`);
    }

    if (!res.ok) {
      const errorMsg = data?.error || data?.message || 'Erreur check-out';
      const details = data?.details ? ` (${data.details})` : '';
      throw new Error(`${errorMsg}${details}`);
    }

    return data as { entry: AttendanceEntry };
  } catch (error: any) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Erreur réseau: ${error?.message || String(error)}`);
  }
}

