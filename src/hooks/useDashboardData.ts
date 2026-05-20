import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Festplattenhersteller, Schraubentypen, Chips, Festplattenanalyse } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [festplattenhersteller, setFestplattenhersteller] = useState<Festplattenhersteller[]>([]);
  const [schraubentypen, setSchraubentypen] = useState<Schraubentypen[]>([]);
  const [chips, setChips] = useState<Chips[]>([]);
  const [festplattenanalyse, setFestplattenanalyse] = useState<Festplattenanalyse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [festplattenherstellerData, schraubentypenData, chipsData, festplattenanalyseData] = await Promise.all([
        LivingAppsService.getFestplattenhersteller(),
        LivingAppsService.getSchraubentypen(),
        LivingAppsService.getChips(),
        LivingAppsService.getFestplattenanalyse(),
      ]);
      setFestplattenhersteller(festplattenherstellerData);
      setSchraubentypen(schraubentypenData);
      setChips(chipsData);
      setFestplattenanalyse(festplattenanalyseData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [festplattenherstellerData, schraubentypenData, chipsData, festplattenanalyseData] = await Promise.all([
          LivingAppsService.getFestplattenhersteller(),
          LivingAppsService.getSchraubentypen(),
          LivingAppsService.getChips(),
          LivingAppsService.getFestplattenanalyse(),
        ]);
        setFestplattenhersteller(festplattenherstellerData);
        setSchraubentypen(schraubentypenData);
        setChips(chipsData);
        setFestplattenanalyse(festplattenanalyseData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const festplattenherstellerMap = useMemo(() => {
    const m = new Map<string, Festplattenhersteller>();
    festplattenhersteller.forEach(r => m.set(r.record_id, r));
    return m;
  }, [festplattenhersteller]);

  const schraubentypenMap = useMemo(() => {
    const m = new Map<string, Schraubentypen>();
    schraubentypen.forEach(r => m.set(r.record_id, r));
    return m;
  }, [schraubentypen]);

  const chipsMap = useMemo(() => {
    const m = new Map<string, Chips>();
    chips.forEach(r => m.set(r.record_id, r));
    return m;
  }, [chips]);

  return { festplattenhersteller, setFestplattenhersteller, schraubentypen, setSchraubentypen, chips, setChips, festplattenanalyse, setFestplattenanalyse, loading, error, fetchAll, festplattenherstellerMap, schraubentypenMap, chipsMap };
}