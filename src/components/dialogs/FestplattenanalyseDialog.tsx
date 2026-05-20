import { useState, useEffect, useRef, useCallback } from 'react';
import type { Festplattenanalyse, Festplattenhersteller, Schraubentypen, Chips } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId, createRecordUrl, cleanFieldsForApi, uploadFile, getUserProfile } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/Combobox';
import { Checkbox } from '@/components/ui/checkbox';
import { IconCamera, IconChevronDown, IconCircleCheck, IconClipboard, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromInput, extractPhotoMeta, reverseGeocode, dataUriToBlob } from '@/lib/ai';
import { lookupKey } from '@/lib/formatters';

interface FestplattenanalyseDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Festplattenanalyse['fields']) => Promise<void>;
  defaultValues?: Festplattenanalyse['fields'];
  festplattenherstellerList: Festplattenhersteller[];
  schraubentypenList: Schraubentypen[];
  chipsList: Chips[];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function FestplattenanalyseDialog({ open, onClose, onSubmit, defaultValues, festplattenherstellerList, schraubentypenList, chipsList, enablePhotoScan = true, enablePhotoLocation = true }: FestplattenanalyseDialogProps) {
  const [fields, setFields] = useState<Partial<Festplattenanalyse['fields']>>({});
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [usePersonalInfo, setUsePersonalInfo] = useState(() => {
    try { return localStorage.getItem('ai-use-personal-info') === 'true'; } catch { return false; }
  });
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [aiText, setAiText] = useState('');

  useEffect(() => {
    if (open) {
      setFields(defaultValues ?? {});
      setPreview(null);
      setScanSuccess(false);
      setAiText('');
    }
  }, [open, defaultValues]);
  useEffect(() => {
    try { localStorage.setItem('ai-use-personal-info', String(usePersonalInfo)); } catch {}
  }, [usePersonalInfo]);
  async function handleShowProfileInfo() {
    if (showProfileInfo) { setShowProfileInfo(false); return; }
    setProfileLoading(true);
    try {
      const p = await getUserProfile();
      setProfileData(p);
    } catch {
      setProfileData(null);
    } finally {
      setProfileLoading(false);
      setShowProfileInfo(true);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const clean = cleanFieldsForApi({ ...fields }, 'festplattenanalyse');
      await onSubmit(clean as Festplattenanalyse['fields']);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleAiExtract(file?: File) {
    if (!file && !aiText.trim()) return;
    setScanning(true);
    setScanSuccess(false);
    try {
      let uri: string | undefined;
      let gps: { latitude: number; longitude: number } | null = null;
      let geoAddr = '';
      const parts: string[] = [];
      if (file) {
        const [dataUri, meta] = await Promise.all([fileToDataUri(file), extractPhotoMeta(file)]);
        uri = dataUri;
        if (file.type.startsWith('image/')) setPreview(uri);
        gps = enablePhotoLocation ? meta?.gps ?? null : null;
        if (gps) {
          geoAddr = await reverseGeocode(gps.latitude, gps.longitude);
          parts.push(`Location coordinates: ${gps.latitude}, ${gps.longitude}`);
          if (geoAddr) parts.push(`Reverse-geocoded address: ${geoAddr}`);
        }
        if (meta?.dateTime) {
          parts.push(`Date taken: ${meta.dateTime.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')}`);
        }
      }
      const contextParts: string[] = [];
      if (parts.length) {
        contextParts.push(`<photo-metadata>\nThe following metadata was extracted from the photo\'s EXIF data:\n${parts.join('\n')}\n</photo-metadata>`);
      }
      contextParts.push(`<available-records field="hersteller" entity="Festplattenhersteller">\n${JSON.stringify(festplattenherstellerList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="schrauben" entity="Schraubentypen">\n${JSON.stringify(schraubentypenList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="chips" entity="Chips">\n${JSON.stringify(chipsList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "modellbezeichnung": string | null, // Modellbezeichnung\n  "seriennummer": string | null, // Seriennummer\n  "kapazitaet_gb": number | null, // Kapazität (GB)\n  "formfaktor": LookupValue | null, // Formfaktor (select one key: "formfaktor_3_5" | "formfaktor_2_5" | "formfaktor_1_8" | "formfaktor_sonstige") mapping: formfaktor_3_5=3,5 Zoll, formfaktor_2_5=2,5 Zoll, formfaktor_1_8=1,8 Zoll, formfaktor_sonstige=Sonstige\n  "schnittstelle": LookupValue | null, // Schnittstelle (select one key: "sata" | "ide" | "sas" | "nvme" | "schnittstelle_sonstige") mapping: sata=SATA, ide=IDE / PATA, sas=SAS, nvme=NVMe, schnittstelle_sonstige=Sonstige\n  "analysedatum": string | null, // YYYY-MM-DD\n  "zustand": LookupValue | null, // Zustand der Festplatte (select one key: "neuwertig" | "gebraucht_ok" | "gebraucht_defekt" | "stark_beschaedigt") mapping: neuwertig=Neuwertig, gebraucht_ok=Gebraucht – funktionsfähig, gebraucht_defekt=Gebraucht – defekt, stark_beschaedigt=Stark beschädigt\n  "hersteller": string | null, // Display name from Festplattenhersteller (see <available-records>)\n  "schrauben": string | null, // Display name from Schraubentypen (see <available-records>)\n  "chips": string | null, // Display name from Chips (see <available-records>)\n  "auffaelligkeiten": string | null, // Auffälligkeiten\n  "analyse_fazit": string | null, // Fazit der Analyse\n}`;
      const raw = await extractFromInput<Record<string, unknown>>(schema, {
        dataUri: uri,
        userText: aiText.trim() || undefined,
        photoContext,
        intent: DIALOG_INTENT,
      });
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        const applookupKeys = new Set<string>(["hersteller", "schrauben", "chips"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null) merged[k] = v;
        }
        const herstellerName = raw['hersteller'] as string | null;
        if (herstellerName) {
          const herstellerMatch = festplattenherstellerList.find(r => matchName(herstellerName!, [String(r.fields.hersteller_name ?? '')]));
          if (herstellerMatch) merged['hersteller'] = createRecordUrl(APP_IDS.FESTPLATTENHERSTELLER, herstellerMatch.record_id);
        }
        const schraubenName = raw['schrauben'] as string | null;
        if (schraubenName) {
          const schraubenMatch = schraubentypenList.find(r => matchName(schraubenName!, [String(r.fields.schrauben_bezeichnung ?? '')]));
          if (schraubenMatch) merged['schrauben'] = createRecordUrl(APP_IDS.SCHRAUBENTYPEN, schraubenMatch.record_id);
        }
        const chipsName = raw['chips'] as string | null;
        if (chipsName) {
          const chipsMatch = chipsList.find(r => matchName(chipsName!, [String(r.fields.chip_bezeichnung ?? '')]));
          if (chipsMatch) merged['chips'] = createRecordUrl(APP_IDS.CHIPS, chipsMatch.record_id);
        }
        return merged as Partial<Festplattenanalyse['fields']>;
      });
      // Upload scanned file to file fields
      if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
        try {
          const blob = dataUriToBlob(uri!);
          const fileUrl = await uploadFile(blob, file.name);
          setFields(prev => ({ ...prev, analyse_foto: fileUrl }));
        } catch (uploadErr) {
          console.error('File upload failed:', uploadErr);
        }
      }
      setAiText('');
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 3000);
    } catch (err) {
      console.error('Scan fehlgeschlagen:', err);
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleAiExtract(f);
    e.target.value = '';
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handleAiExtract(file);
    }
  }, []);

  const DIALOG_INTENT = defaultValues ? 'Festplattenanalyse bearbeiten' : 'Festplattenanalyse hinzufügen';

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[92vh] flex flex-col overflow-hidden p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle>{DIALOG_INTENT}</DialogTitle>
        </DialogHeader>
        {enablePhotoScan && (
          <details className="group border-b bg-muted/20">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-6 py-3 text-sm font-medium hover:bg-muted/40 transition-colors [&::-webkit-details-marker]:hidden">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <IconSparkles className="h-3.5 w-3.5 text-primary" />
              </span>
              <span className="flex-1">Mit Foto/Text füllen</span>
              <span className="text-xs text-muted-foreground">Versteht Fotos, Dokumente und Text und füllt alles für dich aus</span>
              <IconChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-6 pb-4 pt-1 space-y-3">
            <div className="flex items-start gap-2 pl-0.5">
              <Checkbox
                id="ai-use-personal-info"
                checked={usePersonalInfo}
                onCheckedChange={(v) => setUsePersonalInfo(!!v)}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground leading-snug">
                <Label htmlFor="ai-use-personal-info" className="text-xs font-normal text-muted-foreground cursor-pointer inline">
                  KI-Assistent darf zusätzlich Informationen zu meiner Person verwenden
                </Label>
                {' '}
                <button type="button" onClick={handleShowProfileInfo} className="text-xs text-primary hover:underline whitespace-nowrap">
                  {profileLoading ? 'Lade...' : '(mehr Infos)'}
                </button>
              </span>
            </div>
            {showProfileInfo && (
              <div className="rounded-md border bg-muted/50 p-2 text-xs max-h-40 overflow-y-auto">
                <p className="font-medium mb-1">Folgende Infos über dich können von der KI genutzt werden:</p>
                {profileData ? Object.values(profileData).map((v, i) => (
                  <span key={i}>{i > 0 && ", "}{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                )) : (
                  <span className="text-muted-foreground">Profil konnte nicht geladen werden</span>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !scanning && fileInputRef.current?.click()}
              className={`
                relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
                ${scanning
                  ? 'border-primary/40 bg-primary/5'
                  : scanSuccess
                    ? 'border-green-500/40 bg-green-50/50 dark:bg-green-950/20'
                    : dragOver
                      ? 'border-primary bg-primary/10 scale-[1.01]'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              {scanning ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconLoader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">KI analysiert...</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Felder werden automatisch ausgefüllt</p>
                  </div>
                </div>
              ) : scanSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <IconCircleCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Felder ausgefüllt!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Prüfe die Werte und passe sie ggf. an</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center">
                    <IconPhotoPlus className="h-7 w-7 text-primary/70" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Foto oder Dokument hierher ziehen oder auswählen</p>
                  </div>
                </div>
              )}

              {preview && !scanning && (
                <div className="absolute top-2 right-2">
                  <div className="relative group">
                    <img src={preview} alt="" className="h-10 w-10 rounded-md object-cover border shadow-sm" />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setPreview(null); }}
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-muted-foreground/80 text-white flex items-center justify-center"
                    >
                      <IconX className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                <IconCamera className="h-3.5 w-3.5 mr-1" />Kamera
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <IconUpload className="h-3.5 w-3.5 mr-1" />Foto wählen
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'application/pdf,.pdf';
                    fileInputRef.current.click();
                    setTimeout(() => { if (fileInputRef.current) fileInputRef.current.accept = 'image/*,application/pdf'; }, 100);
                  }
                }}>
                <IconFileText className="h-3.5 w-3.5 mr-1" />Dokument
              </Button>
            </div>

            <div className="relative">
              <Textarea
                placeholder="Text eingeben oder einfügen, z.B. Notizen, E-Mails, Beschreibungen..."
                value={aiText}
                onChange={e => {
                  setAiText(e.target.value);
                  const el = e.target;
                  el.style.height = 'auto';
                  el.style.height = Math.min(Math.max(el.scrollHeight, 56), 96) + 'px';
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && aiText.trim() && !scanning) {
                    e.preventDefault();
                    handleAiExtract();
                  }
                }}
                disabled={scanning}
                rows={2}
                className="pr-12 resize-none text-sm overflow-y-auto"
              />
              <button
                type="button"
                className="absolute right-2 top-2 h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                disabled={scanning}
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) setAiText(prev => prev ? prev + '\n' + text : text);
                  } catch {}
                }}
                title="Paste"
              >
                <IconClipboard className="h-4 w-4" />
              </button>
            </div>
            {aiText.trim() && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-9 text-xs"
                disabled={scanning}
                onClick={() => handleAiExtract()}
              >
                <IconSparkles className="h-3.5 w-3.5 mr-1.5" />Analysieren
              </Button>
            )}
            </div>
          </details>
        )}

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="modellbezeichnung">Modellbezeichnung</Label>
            <Input
              id="modellbezeichnung"
              value={fields.modellbezeichnung ?? ''}
              onChange={e => setFields(f => ({ ...f, modellbezeichnung: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="seriennummer">Seriennummer</Label>
            <Input
              id="seriennummer"
              value={fields.seriennummer ?? ''}
              onChange={e => setFields(f => ({ ...f, seriennummer: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kapazitaet_gb">Kapazität (GB)</Label>
            <Input
              id="kapazitaet_gb"
              type="number"
              value={fields.kapazitaet_gb ?? ''}
              onChange={e => setFields(f => ({ ...f, kapazitaet_gb: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="formfaktor">Formfaktor</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.formfaktor) === 'formfaktor_3_5'}
                onClick={() => setFields(f => ({ ...f, formfaktor: (lookupKey(f.formfaktor) === 'formfaktor_3_5' ? undefined : 'formfaktor_3_5') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.formfaktor) === 'formfaktor_3_5'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                3,5 Zoll
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.formfaktor) === 'formfaktor_2_5'}
                onClick={() => setFields(f => ({ ...f, formfaktor: (lookupKey(f.formfaktor) === 'formfaktor_2_5' ? undefined : 'formfaktor_2_5') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.formfaktor) === 'formfaktor_2_5'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                2,5 Zoll
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.formfaktor) === 'formfaktor_1_8'}
                onClick={() => setFields(f => ({ ...f, formfaktor: (lookupKey(f.formfaktor) === 'formfaktor_1_8' ? undefined : 'formfaktor_1_8') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.formfaktor) === 'formfaktor_1_8'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                1,8 Zoll
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.formfaktor) === 'formfaktor_sonstige'}
                onClick={() => setFields(f => ({ ...f, formfaktor: (lookupKey(f.formfaktor) === 'formfaktor_sonstige' ? undefined : 'formfaktor_sonstige') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.formfaktor) === 'formfaktor_sonstige'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Sonstige
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="schnittstelle">Schnittstelle</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.schnittstelle) === 'sata'}
                onClick={() => setFields(f => ({ ...f, schnittstelle: (lookupKey(f.schnittstelle) === 'sata' ? undefined : 'sata') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.schnittstelle) === 'sata'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                SATA
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.schnittstelle) === 'ide'}
                onClick={() => setFields(f => ({ ...f, schnittstelle: (lookupKey(f.schnittstelle) === 'ide' ? undefined : 'ide') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.schnittstelle) === 'ide'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                IDE / PATA
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.schnittstelle) === 'sas'}
                onClick={() => setFields(f => ({ ...f, schnittstelle: (lookupKey(f.schnittstelle) === 'sas' ? undefined : 'sas') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.schnittstelle) === 'sas'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                SAS
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.schnittstelle) === 'nvme'}
                onClick={() => setFields(f => ({ ...f, schnittstelle: (lookupKey(f.schnittstelle) === 'nvme' ? undefined : 'nvme') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.schnittstelle) === 'nvme'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                NVMe
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.schnittstelle) === 'schnittstelle_sonstige'}
                onClick={() => setFields(f => ({ ...f, schnittstelle: (lookupKey(f.schnittstelle) === 'schnittstelle_sonstige' ? undefined : 'schnittstelle_sonstige') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.schnittstelle) === 'schnittstelle_sonstige'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Sonstige
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="analysedatum">Analysedatum</Label>
            <Input
              id="analysedatum"
              type="date"
              value={fields.analysedatum ?? ''}
              onChange={e => setFields(f => ({ ...f, analysedatum: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="zustand">Zustand der Festplatte</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.zustand) === 'neuwertig'}
                onClick={() => setFields(f => ({ ...f, zustand: (lookupKey(f.zustand) === 'neuwertig' ? undefined : 'neuwertig') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.zustand) === 'neuwertig'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Neuwertig
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.zustand) === 'gebraucht_ok'}
                onClick={() => setFields(f => ({ ...f, zustand: (lookupKey(f.zustand) === 'gebraucht_ok' ? undefined : 'gebraucht_ok') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.zustand) === 'gebraucht_ok'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Gebraucht – funktionsfähig
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.zustand) === 'gebraucht_defekt'}
                onClick={() => setFields(f => ({ ...f, zustand: (lookupKey(f.zustand) === 'gebraucht_defekt' ? undefined : 'gebraucht_defekt') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.zustand) === 'gebraucht_defekt'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Gebraucht – defekt
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.zustand) === 'stark_beschaedigt'}
                onClick={() => setFields(f => ({ ...f, zustand: (lookupKey(f.zustand) === 'stark_beschaedigt' ? undefined : 'stark_beschaedigt') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.zustand) === 'stark_beschaedigt'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Stark beschädigt
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hersteller">Hersteller</Label>
            <Combobox
              id="hersteller"
              items={festplattenherstellerList.map(r => ({
                id: r.record_id,
                label: String(r.fields.hersteller_name ?? r.record_id),
              }))}
              value={extractRecordId(fields.hersteller)}
              onChange={id => setFields(f => ({ ...f, hersteller: id ? createRecordUrl(APP_IDS.FESTPLATTENHERSTELLER, id) : undefined }))}
              placeholder="Auswählen..."
              searchPlaceholder="Suchen…"
              emptyText="Kein Treffer"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="schrauben">Verwendete Schrauben</Label>
            <Combobox
              id="schrauben"
              items={schraubentypenList.map(r => ({
                id: r.record_id,
                label: String(r.fields.schrauben_bezeichnung ?? r.record_id),
              }))}
              value={extractRecordId(fields.schrauben)}
              onChange={id => setFields(f => ({ ...f, schrauben: id ? createRecordUrl(APP_IDS.SCHRAUBENTYPEN, id) : undefined }))}
              placeholder="Auswählen..."
              searchPlaceholder="Suchen…"
              emptyText="Kein Treffer"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="chips">Verbaute Chips</Label>
            <Combobox
              id="chips"
              items={chipsList.map(r => ({
                id: r.record_id,
                label: String(r.fields.chip_bezeichnung ?? r.record_id),
              }))}
              value={extractRecordId(fields.chips)}
              onChange={id => setFields(f => ({ ...f, chips: id ? createRecordUrl(APP_IDS.CHIPS, id) : undefined }))}
              placeholder="Auswählen..."
              searchPlaceholder="Suchen…"
              emptyText="Kein Treffer"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="auffaelligkeiten">Auffälligkeiten</Label>
            <Textarea
              id="auffaelligkeiten"
              value={fields.auffaelligkeiten ?? ''}
              onChange={e => setFields(f => ({ ...f, auffaelligkeiten: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="analyse_foto">Foto der zerlegten Festplatte</Label>
            {fields.analyse_foto ? (
              <div className="flex items-center gap-3 rounded-lg border p-2">
                <div className="relative h-14 w-14 shrink-0 rounded-md bg-muted overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <IconFileText size={20} className="text-muted-foreground" />
                  </div>
                  <img
                    src={fields.analyse_foto}
                    alt=""
                    className="relative h-full w-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate text-foreground">{fields.analyse_foto.split("/").pop()}</p>
                  <div className="flex gap-2 mt-1">
                    <label
                      className="text-xs text-primary hover:underline cursor-pointer"
                    >
                      Ändern
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const fileUrl = await uploadFile(file, file.name);
                            setFields(f => ({ ...f, analyse_foto: fileUrl }));
                          } catch (err) { console.error('Upload failed:', err); }
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => setFields(f => ({ ...f, analyse_foto: undefined }))}
                    >
                      Entfernen
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <label
                className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
              >
                <IconUpload size={20} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Datei hochladen</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const fileUrl = await uploadFile(file, file.name);
                      setFields(f => ({ ...f, analyse_foto: fileUrl }));
                    } catch (err) { console.error('Upload failed:', err); }
                  }}
                />
              </label>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="analyse_fazit">Fazit der Analyse</Label>
            <Textarea
              id="analyse_fazit"
              value={fields.analyse_fazit ?? ''}
              onChange={e => setFields(f => ({ ...f, analyse_fazit: e.target.value }))}
              rows={3}
            />
          </div>
          </div>
          <DialogFooter className="sticky bottom-0 border-t bg-background/95 backdrop-blur px-6 py-3 gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button
              type="submit"
              disabled={saving}
            >
              {saving ? 'Speichern...' : defaultValues ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}