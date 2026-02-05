
import { useState, useEffect, useCallback } from 'react';
import { supabase, projectsService, leadsService, tasksService } from '../lib/supabase.ts';
import { WeddingProject, Lead, ProductionTask } from '../types.ts';

export function useProjects() {
  const [projects, setProjects] = useState<WeddingProject[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('wedding_projects')
        .select('*')
        .order('wedding_date', { ascending: true });
        
      if (error) throw error;

      const transformed = (data || []).map((item: any) => ({
        id: item.id,
        couple: item.couple,
        weddingDate: item.wedding_date,
        country: item.country,
        amount: Number(item.amount || 0),
        status: item.status,
        progress: Number(item.progress || 0),
        delayDays: Number(item.delay_days || 0),
        isLegacy: !!item.is_legacy,
        requiresSync: !!item.requires_sync,
        formula: item.formula,
        packageType: item.package_type,
        packageDetail: item.package_detail,
        albumTeaser: item.album_teaser || '',
        teaser_data: item.teaser_data || null,
        hasDowry: !!item.has_dowry,
        dowryDate: item.dowry_date,
        brideOrigin: item.bride_origin,
        groomOrigin: item.groom_origin,
        sameDay: item.same_day !== undefined ? item.same_day : true,
        cityHallDate: item.city_hall_date,
        guestCount: item.guest_count || 0,
        deliveryTime: item.delivery_time || 80,
        clientNotes: item.client_notes,
        poleDVD: item.pole_dvd || { currentStep: 0, assignedTo: '', status: 'pending' },
        poleFilm: item.pole_film || { currentStep: 0, assignedTo: '', status: 'pending' },
        polePhoto: item.pole_photo || { currentStep: 0, assignedTo: '', status: 'pending' },
        poleCom: item.pole_com || { currentStep: 0, assignedTo: '', status: 'pending' },
        clientFeedbacks: item.client_feedbacks || [],
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
      setProjects(transformed);
    } catch (err) {
      console.error('CRITICAL DATABASE ERROR:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    const channel = supabase
      .channel('db-realtime-projects')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wedding_projects' }, () => {
        fetchProjects();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProjects]);

  return { projects, loading, refresh: fetchProjects };
}
