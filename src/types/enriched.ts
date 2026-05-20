import type { Festplattenanalyse } from './app';

export type EnrichedFestplattenanalyse = Festplattenanalyse & {
  herstellerName: string;
  schraubenName: string;
  chipsName: string;
};
