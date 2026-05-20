// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Festplattenhersteller {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    hersteller_name?: string;
    hersteller_kuerzel?: string;
    herkunftsland?: string;
    gruendungsjahr?: number;
    webseite?: string;
    email_kontakt?: string;
    anmerkungen?: string;
  };
}

export interface Schraubentypen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    schrauben_bezeichnung?: string;
    schrauben_typ?: LookupValue;
    kopfform?: LookupValue;
    laenge_mm?: number;
    durchmesser_mm?: number;
    material?: LookupValue;
    beschichtung?: string;
    schrauben_anmerkungen?: string;
  };
}

export interface Chips {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    chip_bezeichnung?: string;
    chip_hersteller?: string;
    chip_funktion?: LookupValue;
    chip_anzahl?: number;
    chip_gehaeuse?: string;
    chip_spannung?: string;
    chip_takt?: string;
    chip_foto?: string;
    chip_anmerkungen?: string;
  };
}

export interface Festplattenanalyse {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    modellbezeichnung?: string;
    seriennummer?: string;
    kapazitaet_gb?: number;
    formfaktor?: LookupValue;
    schnittstelle?: LookupValue;
    analysedatum?: string; // Format: YYYY-MM-DD oder ISO String
    zustand?: LookupValue;
    hersteller?: string; // applookup -> URL zu 'Festplattenhersteller' Record
    schrauben?: string;
    chips?: string;
    auffaelligkeiten?: string;
    analyse_foto?: string;
    analyse_fazit?: string;
  };
}

export const APP_IDS = {
  FESTPLATTENHERSTELLER: '6a0dadd9612901432991c84c',
  SCHRAUBENTYPEN: '6a0daddf108135c4775e0889',
  CHIPS: '6a0dade03c3e2ec66b6b48dc',
  FESTPLATTENANALYSE: '6a0dade197bb7deffcfef807',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'schraubentypen': {
    schrauben_typ: [{ key: "phillips", label: "Phillips (Kreuzschlitz)" }, { key: "schlitz", label: "Schlitz" }, { key: "torx", label: "Torx" }, { key: "hex", label: "Hex / Inbus" }, { key: "sonstige", label: "Sonstige" }],
    kopfform: [{ key: "flachkopf", label: "Flachkopf" }, { key: "linsenkopf", label: "Linsenkopf" }, { key: "zylinderkopf", label: "Zylinderkopf" }, { key: "senkkopf", label: "Senkkopf" }, { key: "kopf_sonstige", label: "Sonstige" }],
    material: [{ key: "stahl", label: "Stahl" }, { key: "edelstahl", label: "Edelstahl" }, { key: "aluminium", label: "Aluminium" }, { key: "titan", label: "Titan" }, { key: "material_sonstige", label: "Sonstige" }],
  },
  'chips': {
    chip_funktion: [{ key: "controller", label: "Controller" }, { key: "cache", label: "Cache / Puffer" }, { key: "motor_controller", label: "Motor-Controller" }, { key: "spannungsregler", label: "Spannungsregler" }, { key: "lese_schreib_verstaerker", label: "Schreib-/Lesekopf-Verstärker" }, { key: "funktion_sonstige", label: "Sonstige" }],
  },
  'festplattenanalyse': {
    formfaktor: [{ key: "formfaktor_3_5", label: "3,5 Zoll" }, { key: "formfaktor_2_5", label: "2,5 Zoll" }, { key: "formfaktor_1_8", label: "1,8 Zoll" }, { key: "formfaktor_sonstige", label: "Sonstige" }],
    schnittstelle: [{ key: "sata", label: "SATA" }, { key: "ide", label: "IDE / PATA" }, { key: "sas", label: "SAS" }, { key: "nvme", label: "NVMe" }, { key: "schnittstelle_sonstige", label: "Sonstige" }],
    zustand: [{ key: "neuwertig", label: "Neuwertig" }, { key: "gebraucht_ok", label: "Gebraucht – funktionsfähig" }, { key: "gebraucht_defekt", label: "Gebraucht – defekt" }, { key: "stark_beschaedigt", label: "Stark beschädigt" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'festplattenhersteller': {
    'hersteller_name': 'string/text',
    'hersteller_kuerzel': 'string/text',
    'herkunftsland': 'string/text',
    'gruendungsjahr': 'number',
    'webseite': 'string/url',
    'email_kontakt': 'string/email',
    'anmerkungen': 'string/textarea',
  },
  'schraubentypen': {
    'schrauben_bezeichnung': 'string/text',
    'schrauben_typ': 'lookup/select',
    'kopfform': 'lookup/select',
    'laenge_mm': 'number',
    'durchmesser_mm': 'number',
    'material': 'lookup/select',
    'beschichtung': 'string/text',
    'schrauben_anmerkungen': 'string/textarea',
  },
  'chips': {
    'chip_bezeichnung': 'string/text',
    'chip_hersteller': 'string/text',
    'chip_funktion': 'lookup/select',
    'chip_anzahl': 'number',
    'chip_gehaeuse': 'string/text',
    'chip_spannung': 'string/text',
    'chip_takt': 'string/text',
    'chip_foto': 'file',
    'chip_anmerkungen': 'string/textarea',
  },
  'festplattenanalyse': {
    'modellbezeichnung': 'string/text',
    'seriennummer': 'string/text',
    'kapazitaet_gb': 'number',
    'formfaktor': 'lookup/select',
    'schnittstelle': 'lookup/select',
    'analysedatum': 'date/date',
    'zustand': 'lookup/select',
    'hersteller': 'applookup/select',
    'schrauben': 'multipleapplookup/select',
    'chips': 'multipleapplookup/select',
    'auffaelligkeiten': 'string/textarea',
    'analyse_foto': 'file',
    'analyse_fazit': 'string/textarea',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateFestplattenhersteller = StripLookup<Festplattenhersteller['fields']>;
export type CreateSchraubentypen = StripLookup<Schraubentypen['fields']>;
export type CreateChips = StripLookup<Chips['fields']>;
export type CreateFestplattenanalyse = StripLookup<Festplattenanalyse['fields']>;