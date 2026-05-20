import type { EnrichedFestplattenanalyse } from '@/types/enriched';
import type { Chips, Festplattenanalyse, Festplattenhersteller, Schraubentypen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface FestplattenanalyseMaps {
  festplattenherstellerMap: Map<string, Festplattenhersteller>;
  schraubentypenMap: Map<string, Schraubentypen>;
  chipsMap: Map<string, Chips>;
}

export function enrichFestplattenanalyse(
  festplattenanalyse: Festplattenanalyse[],
  maps: FestplattenanalyseMaps
): EnrichedFestplattenanalyse[] {
  return festplattenanalyse.map(r => ({
    ...r,
    herstellerName: resolveDisplay(r.fields.hersteller, maps.festplattenherstellerMap, 'hersteller_name'),
    schraubenName: resolveDisplay(r.fields.schrauben, maps.schraubentypenMap, 'schrauben_bezeichnung'),
    chipsName: resolveDisplay(r.fields.chips, maps.chipsMap, 'chip_bezeichnung'),
  }));
}
