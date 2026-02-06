
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// Utilitaire pour mapper les objets Frontend vers les colonnes DB (camelCase -> snake_case)
const mapToDb = (obj: any) => {
  const mapped: any = {};
  const keys: Record<string, string> = {
    weddingDate: 'wedding_date',
    hasDowry: 'has_dowry',
    dowryDate: 'dowry_date',
    brideOrigin: 'bride_origin',
    groomOrigin: 'groom_origin',
    sameDay: 'same_day',
    cityHallDate: 'city_hall_date',
    guestCount: 'guest_count',
    deliveryTime: 'delivery_time',
    clientNotes: 'client_notes',
    packageType: 'package_type',
    packageDetail: 'package_detail',
    options: 'selected_options',
    albumTeaser: 'album_teaser',
    poleDVD: 'pole_dvd',
    poleFilm: 'pole_film',
    polePhoto: 'pole_photo',
    poleCom: 'pole_com',
    isLegacy: 'is_legacy',
    requiresSync: 'requires_sync',
    delayDays: 'delay_days',
    // Studio Mapping
    deliveryDays: 'delivery_days',
    startTime: 'start_time',
    endTime: 'end_time',
    // Payroll Mapping
    employeeId: 'employee_id',
    baseSalary: 'base_salary',
    absenceDays: 'absence_days',
    netSalary: 'net_salary',
    // Quote Mapping
    clientName: 'client_name',
    totalAmount: 'total_amount',
    // Visa Photo Mapping
    visaPhotoUrl: 'visa_photo_url',
    // Projects: équipe assignée (colonne créée sans guillemets → lowercase)
    assignedTeam: 'assignedteam'
  };

  Object.keys(obj).forEach(key => {
    const dbKey = keys[key] || key;
    let value = obj[key];

    // Normaliser toutes les dates optionnelles : ne jamais envoyer "" sur une colonne DATE
    if (
      (typeof value === 'string' && value.trim() === '') &&
      (dbKey.endsWith('_date') || dbKey === 'deadline')
    ) {
      value = null;
    }

    mapped[dbKey] = value;
  });
  return mapped;
};

export const projectsService = {
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('wedding_projects')
        .select('*')
        .order('wedding_date', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (err: any) {
      // Gérer proprement les requêtes annulées (AbortController / navigation)
      if (
        err?.name === 'AbortError' ||
        err?.message?.includes('aborted') ||
        err?.message?.includes('signal is aborted')
      ) {
        throw new Error('Requête annulée');
      }
      throw err;
    }
  },
  async create(project: any) {
    try {
      const dbData = mapToDb(project);
      const defaultPole = { currentStep: 0, assignedTo: '', status: 'pending' };
      const payload = {
        ...dbData,
        status: dbData.status ?? 'Planification',
        progress: dbData.progress ?? 0,
        amount: dbData.amount ?? 0,
        delay_days: dbData.delay_days ?? 0,
        is_legacy: dbData.is_legacy ?? false,
        requires_sync: dbData.requires_sync ?? false,
        pole_dvd: dbData.pole_dvd ?? defaultPole,
        pole_film: dbData.pole_film ?? defaultPole,
        pole_photo: dbData.pole_photo ?? defaultPole,
        pole_com: dbData.pole_com ?? defaultPole,
        client_feedbacks: dbData.client_feedbacks ?? [],
      };
      const { data, error } = await supabase
        .from('wedding_projects')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err: any) {
      // Gérer proprement les erreurs d'annulation côté réseau/Supabase
      if (
        err?.name === 'AbortError' ||
        err?.message?.includes('aborted') ||
        err?.message?.includes('signal is aborted')
      ) {
        throw new Error('Requête annulée (connexion interrompue ou navigation).');
      }
      throw err;
    }
  },
  async update(id: string, updates: any) {
    const dbData = mapToDb(updates);
    const { data, error } = await supabase
      .from('wedding_projects')
      .update({ ...dbData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async delete(id: string) {
    const { error } = await supabase.from('wedding_projects').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};

export const leadsService = {
  async getAll() {
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async create(lead: any) {
    const { data, error } = await supabase.from('leads').insert([lead]).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: any) {
    const { data, error } = await supabase.from('leads').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
};

export const teamService = {
  async getAll() {
    const { data, error } = await supabase.from('team_members').select('*').order('full_name', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  async create(member: any) {
    const { data, error } = await supabase.from('team_members').insert([member]).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: any) {
    const { data, error } = await supabase.from('team_members').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id: string) {
    const { error } = await supabase.from('team_members').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};

export const tasksService = {
  async getAll() {
    const { data, error } = await supabase.from('production_tasks').select('*').order('deadline', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  async create(task: any) {
    const { data, error } = await supabase.from('production_tasks').insert([task]).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: any) {
    const { data, error } = await supabase.from('production_tasks').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
};

// --- NOUVEAUX SERVICES POUR COUVRIR TOUT L'ESPACE MANAJA ---

export const studioService = {
  async getSessions() {
    const { data, error } = await supabase.from('studio_sessions').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async createSession(session: any) {
    // Nettoyage de l'ID temporaire s'il existe
    const { id, ...rest } = session;
    const dbData = mapToDb(rest);
    const { data, error } = await supabase.from('studio_sessions').insert([dbData]).select().single();
    if (error) throw error;
    return data;
  },
  async updateSession(id: string, updates: any) {
    const dbData = mapToDb(updates);
    const { data, error } = await supabase.from('studio_sessions').update(dbData).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async getExpenses() {
    const { data, error } = await supabase.from('studio_expenses').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async createExpense(expense: any) {
    const { id, ...rest } = expense;
    const { data, error } = await supabase.from('studio_expenses').insert([rest]).select().single();
    if (error) throw error;
    return data;
  }
};

export const financeService = {
  async getTransactions() {
    const { data, error } = await supabase.from('treasury_transactions').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async createTransaction(transaction: any) {
    const { id, ...rest } = transaction; // Remove temp ID
    const { data, error } = await supabase.from('treasury_transactions').insert([rest]).select().single();
    if (error) throw error;
    return data;
  }
};

export const payrollService = {
  async getAll() {
    const { data, error } = await supabase.from('payroll_entries').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async create(entry: any) {
    const { id, ...rest } = entry;
    const dbData = mapToDb(rest);
    const { data, error } = await supabase.from('payroll_entries').insert([dbData]).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: any) {
    const dbData = mapToDb(updates);
    const { data, error } = await supabase.from('payroll_entries').update(dbData).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
};

export const quotesService = {
  async getAll() {
    const { data, error } = await supabase.from('quotes').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async create(quote: any) {
    const dbData = mapToDb(quote);
    const { data, error } = await supabase.from('quotes').insert([dbData]).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: any) {
    const dbData = mapToDb(updates);
    const { data, error } = await supabase.from('quotes').update(dbData).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
};

export const invoicesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async create(invoice: { project_id?: string | null; client: string; total: number; paid?: number; due?: string | null; status?: string }) {
    const { data, error } = await supabase
      .from('invoices')
      .insert([invoice])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: any) {
    const { data, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

export const workflowsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('workflows')
      .select('*');
    if (error) throw error;
    return data || [];
  },
  async upsertMany(payload: { formula: string; steps: any[] }[]) {
    const rows = payload.map(p => ({
      formula: p.formula,
      steps: p.steps,
      updated_at: new Date().toISOString()
    }));
    const { data, error } = await supabase
      .from('workflows')
      .upsert(rows, { onConflict: 'formula' })
      .select();
    if (error) throw error;
    return data || [];
  }
};

export const biometricService = {
  async registerCredential(employeeId: string, credentialId: string, publicKey: string, deviceName?: string) {
    try {
      const { data, error } = await supabase
        .from('biometric_credentials')
        .insert({
          employee_id: employeeId,
          credential_id: credentialId,
          public_key: publicKey,
          device_name: deviceName || 'Unknown Device',
          last_used_at: new Date().toISOString()
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err: any) {
      // Gérer les erreurs AbortError
      if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
        throw new Error('Requête annulée');
      }
      throw err;
    }
  },
  async getCredentialsByEmployee(employeeId: string) {
    try {
      const { data, error } = await supabase
        .from('biometric_credentials')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (err: any) {
      // Gérer les erreurs AbortError
      if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
        throw new Error('Requête annulée');
      }
      throw err;
    }
  },
  async updateLastUsed(credentialId: string) {
    const { error } = await supabase
      .from('biometric_credentials')
      .update({ last_used_at: new Date().toISOString() })
      .eq('credential_id', credentialId);
    if (error) throw error;
  },
  async deleteCredential(credentialId: string) {
    const { error } = await supabase
      .from('biometric_credentials')
      .delete()
      .eq('credential_id', credentialId);
    if (error) throw error;
    return true;
  }
};

export const pointageService = {
  async createPointage(employeeId: string, type: 'IN' | 'OUT', method: 'FACE' | 'BIO' | 'VISA', visaPhotoUrl?: string) {
    const { data, error } = await supabase
      .from('pointage_entries')
      .insert({
        employee_id: employeeId,
        type,
        method,
        visa_photo_url: visaPhotoUrl || null,
        timestamp: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async getPointageByEmployee(employeeId: string) {
    const { data, error } = await supabase
      .from('pointage_entries')
      .select('*')
      .eq('employee_id', employeeId)
      .order('timestamp', { ascending: false });
    if (error) throw error;
    return data || [];
  }
};
