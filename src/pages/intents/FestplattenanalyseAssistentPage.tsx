import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import type { Festplattenhersteller, Schraubentypen, Chips, Festplattenanalyse } from '@/types/app';
import { FestplattenanalyseDialog } from '@/components/dialogs/FestplattenanalyseDialog';
import { FestplattenherstellerDialog } from '@/components/dialogs/FestplattenherstellerDialog';
import { SchraubentypenDialog } from '@/components/dialogs/SchraubentypenDialog';
import { ChipsDialog } from '@/components/dialogs/ChipsDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  IconDeviceFloppy,
  IconBuildingFactory2,
  IconAdjustments,
  IconCpu,
  IconCheck,
  IconChevronRight,
} from '@tabler/icons-react';

const STEPS = [
  { label: 'Festplatte' },
  { label: 'Hersteller' },
  { label: 'Schrauben' },
  { label: 'Chips' },
  { label: 'Abschluss' },
];

function extractIds(val: string | string[] | undefined): string[] {
  if (!val) return [];
  const arr = Array.isArray(val) ? val : val.split(',').map((s) => s.trim()).filter(Boolean);
  return arr.map((url) => extractRecordId(url)).filter((id): id is string => !!id);
}

export default function FestplattenanalyseAssistentPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [analysen, setAnalysen] = useState<Festplattenanalyse[]>([]);
  const [hersteller, setHersteller] = useState<Festplattenhersteller[]>([]);
  const [schrauben, setSchrauben] = useState<Schraubentypen[]>([]);
  const [chips, setChips] = useState<Chips[]>([]);

  const [selectedAnalyseId, setSelectedAnalyseId] = useState<string | null>(
    searchParams.get('analyseId') ?? null,
  );
  const [selectedHerstellerId, setSelectedHerstellerId] = useState<string | null>(null);
  const [selectedSchraubenIds, setSelectedSchraubenIds] = useState<string[]>([]);
  const [selectedChipsIds, setSelectedChipsIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentStep, setCurrentStep] = useState(() => {
    const urlStep = parseInt(searchParams.get('step') ?? '', 10);
    return urlStep >= 1 && urlStep <= 5 ? urlStep : 1;
  });

  const [fazit, setFazit] = useState('');
  const [auffaelligkeiten, setAuffaelligkeiten] = useState('');
  const [zustand, setZustand] = useState('neuwertig');
  const [done, setDone] = useState(false);

  const [analyseDialogOpen, setAnalyseDialogOpen] = useState(false);
  const [herstellerDialogOpen, setHerstellerDialogOpen] = useState(false);
  const [schraubenDialogOpen, setSchraubenDialogOpen] = useState(false);
  const [chipsDialogOpen, setChipsDialogOpen] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [a, h, s, c] = await Promise.all([
        LivingAppsService.getFestplattenanalyse(),
        LivingAppsService.getFestplattenhersteller(),
        LivingAppsService.getSchraubentypen(),
        LivingAppsService.getChips(),
      ]);
      setAnalysen(a);
      setHersteller(h);
      setSchrauben(s);
      setChips(c);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Sync URL params when step or analyseId changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (currentStep > 1) {
      params.set('step', String(currentStep));
    } else {
      params.delete('step');
    }
    if (selectedAnalyseId) {
      params.set('analyseId', selectedAnalyseId);
    } else {
      params.delete('analyseId');
    }
    setSearchParams(params, { replace: true });
  }, [currentStep, selectedAnalyseId]); // eslint-disable-line react-hooks/exhaustive-deps

  // When a Analyse is selected, pre-populate state from its fields
  useEffect(() => {
    if (!selectedAnalyseId) return;
    const analyse = analysen.find((a) => a.record_id === selectedAnalyseId);
    if (!analyse) return;
    // Pre-select Hersteller
    const herstellerId = extractRecordId(analyse.fields.hersteller);
    setSelectedHerstellerId(herstellerId);
    // Pre-select Schrauben
    setSelectedSchraubenIds(extractIds(analyse.fields.schrauben));
    // Pre-select Chips
    setSelectedChipsIds(extractIds(analyse.fields.chips));
    // Pre-fill Fazit / Auffaelligkeiten / Zustand
    setFazit(analyse.fields.analyse_fazit ?? '');
    setAuffaelligkeiten(analyse.fields.auffaelligkeiten ?? '');
    const zustandKey =
      typeof analyse.fields.zustand === 'object' && analyse.fields.zustand !== null
        ? (analyse.fields.zustand as { key: string }).key
        : typeof analyse.fields.zustand === 'string'
        ? analyse.fields.zustand
        : 'neuwertig';
    setZustand(zustandKey);
  }, [selectedAnalyseId, analysen]);

  const selectedAnalyse = analysen.find((a) => a.record_id === selectedAnalyseId) ?? null;

  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  // --- Step 3: handle Schrauben update ---
  const handleSchraubenWeiter = async () => {
    if (!selectedAnalyseId) return;
    setSaving(true);
    try {
      await LivingAppsService.updateFestplattenanalyseEntry(selectedAnalyseId, {
        schrauben: selectedSchraubenIds.map((id) =>
          createRecordUrl(APP_IDS.SCHRAUBENTYPEN, id),
        ) as unknown as string,
      });
      goToStep(4);
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  // --- Step 4: handle Chips update ---
  const handleChipsWeiter = async () => {
    if (!selectedAnalyseId) return;
    setSaving(true);
    try {
      await LivingAppsService.updateFestplattenanalyseEntry(selectedAnalyseId, {
        chips: selectedChipsIds.map((id) =>
          createRecordUrl(APP_IDS.CHIPS, id),
        ) as unknown as string,
      });
      goToStep(5);
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  // --- Step 5: Abschluss ---
  const handleAbschliessen = async () => {
    if (!selectedAnalyseId) return;
    setSaving(true);
    try {
      await LivingAppsService.updateFestplattenanalyseEntry(selectedAnalyseId, {
        auffaelligkeiten,
        analyse_fazit: fazit,
        zustand,
      });
      setDone(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const zustandOptions = LOOKUP_OPTIONS['festplattenanalyse']?.zustand ?? [];

  return (
    <IntentWizardShell
      title="Festplatten-Analyse-Assistent"
      subtitle="Schritt für Schritt zur vollständigen Dokumentation deiner Festplattenzerlegung"
      steps={STEPS}
      currentStep={currentStep}
      onStepChange={goToStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ── Schritt 1: Festplatte wählen ─────────────────────── */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <IconDeviceFloppy size={20} className="text-primary" />
              Festplatte auswählen
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Wähle eine bestehende Analyse aus oder lege eine neue an.
            </p>
          </div>

          <EntitySelectStep
            items={analysen.map((a) => ({
              id: a.record_id,
              title: a.fields.modellbezeichnung ?? '(Kein Modell)',
              subtitle: a.fields.seriennummer ?? undefined,
              status:
                a.fields.zustand && typeof a.fields.zustand === 'object'
                  ? { key: (a.fields.zustand as { key: string; label: string }).key, label: (a.fields.zustand as { key: string; label: string }).label }
                  : undefined,
              stats: [
                {
                  label: `${a.fields.kapazitaet_gb ?? '–'} GB`,
                  value:
                    a.fields.schnittstelle && typeof a.fields.schnittstelle === 'object'
                      ? (a.fields.schnittstelle as { label: string }).label
                      : a.fields.schnittstelle ?? '–',
                },
              ],
            }))}
            onSelect={(id) => setSelectedAnalyseId(id)}
            searchPlaceholder="Analyse suchen..."
            emptyText="Noch keine Analysen vorhanden."
            createLabel="Neue Festplatte anlegen"
            onCreateNew={() => setAnalyseDialogOpen(true)}
            createDialog={
              <FestplattenanalyseDialog
                open={analyseDialogOpen}
                onClose={() => setAnalyseDialogOpen(false)}
                onSubmit={async (fields) => {
                  const resp = await LivingAppsService.createFestplattenanalyseEntry(
                    fields as any,
                  );
                  await fetchAll();
                  const entries = Object.entries(resp ?? {});
                  if (entries.length > 0) setSelectedAnalyseId(entries[0][0]);
                  setAnalyseDialogOpen(false);
                }}
                defaultValues={undefined}
                festplattenherstellerList={hersteller}
                schraubentypenList={schrauben}
                chipsList={chips}
                enablePhotoScan={AI_PHOTO_SCAN['Festplattenanalyse']}
                enablePhotoLocation={AI_PHOTO_LOCATION['Festplattenanalyse']}
              />
            }
          />

          {selectedAnalyseId && (
            <div className="pt-2">
              <div className="rounded-xl border bg-primary/5 border-primary/20 px-4 py-3 flex items-center gap-3 mb-4">
                <IconCheck size={16} className="text-primary shrink-0" />
                <span className="text-sm font-medium text-primary truncate">
                  Ausgewählt: {selectedAnalyse?.fields.modellbezeichnung ?? selectedAnalyseId}
                </span>
              </div>
              <Button onClick={() => goToStep(2)} className="w-full sm:w-auto gap-2">
                Weiter
                <IconChevronRight size={16} />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Schritt 2: Hersteller zuweisen ───────────────────── */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <IconBuildingFactory2 size={20} className="text-primary" />
              Hersteller zuweisen
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Wähle den Hersteller der Festplatte aus oder lege einen neuen an.
            </p>
          </div>

          <EntitySelectStep
            items={hersteller.map((h) => ({
              id: h.record_id,
              title: h.fields.hersteller_name ?? '(Unbekannt)',
              subtitle:
                [h.fields.herkunftsland, h.fields.hersteller_kuerzel]
                  .filter(Boolean)
                  .join(' · ') || undefined,
              status: { key: 'hersteller', label: 'Hersteller' },
            }))}
            onSelect={(id) => setSelectedHerstellerId(id)}
            searchPlaceholder="Hersteller suchen..."
            emptyText="Noch keine Hersteller vorhanden."
            createLabel="Neuen Hersteller anlegen"
            onCreateNew={() => setHerstellerDialogOpen(true)}
            createDialog={
              <FestplattenherstellerDialog
                open={herstellerDialogOpen}
                onClose={() => setHerstellerDialogOpen(false)}
                onSubmit={async (fields) => {
                  const resp = await LivingAppsService.createFestplattenherstellerEntry(
                    fields as any,
                  );
                  await fetchAll();
                  const entries = Object.entries(resp ?? {});
                  if (entries.length > 0) setSelectedHerstellerId(entries[0][0]);
                  setHerstellerDialogOpen(false);
                }}
                defaultValues={undefined}
                enablePhotoScan={AI_PHOTO_SCAN['Festplattenhersteller']}
                enablePhotoLocation={AI_PHOTO_LOCATION['Festplattenhersteller']}
              />
            }
          />

          {selectedHerstellerId && (
            <div className="rounded-xl border bg-primary/5 border-primary/20 px-4 py-3 flex items-center gap-3">
              <IconCheck size={16} className="text-primary shrink-0" />
              <span className="text-sm font-medium text-primary truncate">
                Ausgewählt:{' '}
                {hersteller.find((h) => h.record_id === selectedHerstellerId)?.fields
                  .hersteller_name ?? selectedHerstellerId}
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button variant="outline" onClick={() => goToStep(1)}>
              Zurück
            </Button>
            <Button
              disabled={saving}
              onClick={async () => {
                if (!selectedAnalyseId || !selectedHerstellerId) {
                  goToStep(3);
                  return;
                }
                setSaving(true);
                try {
                  await LivingAppsService.updateFestplattenanalyseEntry(selectedAnalyseId, {
                    hersteller: createRecordUrl(
                      APP_IDS.FESTPLATTENHERSTELLER,
                      selectedHerstellerId,
                    ),
                  });
                  goToStep(3);
                } catch (err) {
                  alert(err instanceof Error ? err.message : String(err));
                } finally {
                  setSaving(false);
                }
              }}
              className="gap-2"
            >
              {saving ? 'Speichern...' : 'Weiter'}
              {!saving && <IconChevronRight size={16} />}
            </Button>
            <Button
              variant="ghost"
              onClick={() => goToStep(3)}
              disabled={saving}
            >
              Überspringen
            </Button>
          </div>
        </div>
      )}

      {/* ── Schritt 3: Schraubentypen verknüpfen ─────────────── */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <IconAdjustments size={20} className="text-primary" />
              Schraubentypen verknüpfen
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Wähle alle Schraubentypen aus, die in der Festplatte verbaut sind.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedSchraubenIds.length} Schraubentyp(en) ausgewählt
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSchraubenDialogOpen(true)}
              className="gap-1.5"
            >
              <span className="text-base leading-none">+</span>
              Neuen Schraubentyp anlegen
            </Button>
          </div>

          <SchraubentypenDialog
            open={schraubenDialogOpen}
            onClose={() => setSchraubenDialogOpen(false)}
            onSubmit={async (fields) => {
              const resp = await LivingAppsService.createSchraubentypenEntry(fields as any);
              await fetchAll();
              const entries = Object.entries(resp ?? {});
              if (entries.length > 0)
                setSelectedSchraubenIds((prev) => [...prev, entries[0][0]]);
              setSchraubenDialogOpen(false);
            }}
            defaultValues={undefined}
            enablePhotoScan={AI_PHOTO_SCAN['Schraubentypen']}
            enablePhotoLocation={AI_PHOTO_LOCATION['Schraubentypen']}
          />

          {schrauben.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Noch keine Schraubentypen vorhanden. Lege einen neuen an.
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {schrauben.map((s) => {
                const checked = selectedSchraubenIds.includes(s.record_id);
                const typLabel =
                  s.fields.schrauben_typ && typeof s.fields.schrauben_typ === 'object'
                    ? (s.fields.schrauben_typ as { label: string }).label
                    : s.fields.schrauben_typ ?? '';
                return (
                  <label
                    key={s.record_id}
                    className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setSelectedSchraubenIds((prev) =>
                          checked
                            ? prev.filter((id) => id !== s.record_id)
                            : [...prev, s.record_id],
                        );
                      }}
                      className="w-4 h-4 rounded"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {s.fields.schrauben_bezeichnung ?? '(Unbekannt)'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {typLabel}
                        {typLabel && (s.fields.laenge_mm || s.fields.durchmesser_mm)
                          ? ' · '
                          : ''}
                        {s.fields.laenge_mm != null ? `${s.fields.laenge_mm}mm` : ''}
                        {s.fields.laenge_mm != null && s.fields.durchmesser_mm != null
                          ? ' / '
                          : ''}
                        {s.fields.durchmesser_mm != null ? `∅${s.fields.durchmesser_mm}mm` : ''}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button variant="outline" onClick={() => goToStep(2)}>
              Zurück
            </Button>
            <Button onClick={handleSchraubenWeiter} disabled={saving} className="gap-2">
              {saving ? 'Speichern...' : 'Weiter'}
              {!saving && <IconChevronRight size={16} />}
            </Button>
          </div>
        </div>
      )}

      {/* ── Schritt 4: Chips verknüpfen ──────────────────────── */}
      {currentStep === 4 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <IconCpu size={20} className="text-primary" />
              Chips verknüpfen
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Wähle alle Chips aus, die auf der Festplatine verbaut sind.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedChipsIds.length} Chip(s) ausgewählt
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setChipsDialogOpen(true)}
              className="gap-1.5"
            >
              <span className="text-base leading-none">+</span>
              Neuen Chip anlegen
            </Button>
          </div>

          <ChipsDialog
            open={chipsDialogOpen}
            onClose={() => setChipsDialogOpen(false)}
            onSubmit={async (fields) => {
              const resp = await LivingAppsService.createChip(fields as any);
              await fetchAll();
              const entries = Object.entries(resp ?? {});
              if (entries.length > 0)
                setSelectedChipsIds((prev) => [...prev, entries[0][0]]);
              setChipsDialogOpen(false);
            }}
            defaultValues={undefined}
            enablePhotoScan={AI_PHOTO_SCAN['Chips']}
            enablePhotoLocation={AI_PHOTO_LOCATION['Chips']}
          />

          {chips.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Noch keine Chips vorhanden. Lege einen neuen an.
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {chips.map((c) => {
                const checked = selectedChipsIds.includes(c.record_id);
                const funktionLabel =
                  c.fields.chip_funktion && typeof c.fields.chip_funktion === 'object'
                    ? (c.fields.chip_funktion as { label: string }).label
                    : c.fields.chip_funktion ?? '';
                return (
                  <label
                    key={c.record_id}
                    className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setSelectedChipsIds((prev) =>
                          checked
                            ? prev.filter((id) => id !== c.record_id)
                            : [...prev, c.record_id],
                        );
                      }}
                      className="w-4 h-4 rounded"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {c.fields.chip_bezeichnung ?? '(Unbekannt)'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {funktionLabel}
                        {funktionLabel && c.fields.chip_hersteller ? ' · ' : ''}
                        {c.fields.chip_hersteller ?? ''}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button variant="outline" onClick={() => goToStep(3)}>
              Zurück
            </Button>
            <Button onClick={handleChipsWeiter} disabled={saving} className="gap-2">
              {saving ? 'Speichern...' : 'Weiter'}
              {!saving && <IconChevronRight size={16} />}
            </Button>
          </div>
        </div>
      )}

      {/* ── Schritt 5: Fazit & Abschluss ─────────────────────── */}
      {currentStep === 5 && !done && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <IconDeviceFloppy size={20} className="text-primary" />
              Fazit & Abschluss
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Fasse deine Analyse zusammen und schließe die Dokumentation ab.
            </p>
          </div>

          {/* Zusammenfassung */}
          <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
            <h3 className="font-semibold text-sm">Zusammenfassung</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <span className="text-muted-foreground">Modell</span>
              <span className="font-medium truncate">
                {selectedAnalyse?.fields.modellbezeichnung ?? '–'}
              </span>
              <span className="text-muted-foreground">Hersteller</span>
              <span className="font-medium truncate">
                {hersteller.find((h) => h.record_id === selectedHerstellerId)?.fields
                  .hersteller_name ?? '–'}
              </span>
              <span className="text-muted-foreground">Kapazität</span>
              <span className="font-medium">
                {selectedAnalyse?.fields.kapazitaet_gb != null
                  ? `${selectedAnalyse.fields.kapazitaet_gb} GB`
                  : '–'}
              </span>
              <span className="text-muted-foreground">Schraubentypen</span>
              <span className="font-medium">{selectedSchraubenIds.length}</span>
              <span className="text-muted-foreground">Chips</span>
              <span className="font-medium">{selectedChipsIds.length}</span>
            </div>
          </div>

          {/* Auffälligkeiten */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="auffaelligkeiten">
              Auffälligkeiten
            </label>
            <Textarea
              id="auffaelligkeiten"
              value={auffaelligkeiten}
              onChange={(e) => setAuffaelligkeiten(e.target.value)}
              placeholder="Beschreibe besondere Auffälligkeiten bei der Zerlegung..."
              rows={3}
            />
          </div>

          {/* Fazit */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="fazit">
              Analyse-Fazit
            </label>
            <Textarea
              id="fazit"
              value={fazit}
              onChange={(e) => setFazit(e.target.value)}
              placeholder="Dein abschließendes Fazit zur Festplattenanalyse..."
              rows={4}
            />
          </div>

          {/* Zustand */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Zustand</label>
            <div className="flex flex-wrap gap-2">
              {zustandOptions.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setZustand(opt.key)}
                  className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                    zustand === opt.key
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-background text-foreground border-input hover:bg-accent'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button variant="outline" onClick={() => goToStep(4)}>
              Zurück
            </Button>
            <Button onClick={handleAbschliessen} disabled={saving} className="gap-2">
              {saving ? 'Speichern...' : 'Analyse abschließen'}
              {!saving && <IconCheck size={16} />}
            </Button>
          </div>
        </div>
      )}

      {/* ── Erfolgs-Screen ────────────────────────────────────── */}
      {currentStep === 5 && done && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center">
            <IconCheck size={28} className="text-green-500" />
          </div>
          <h2 className="text-xl font-bold">Analyse abgeschlossen!</h2>
          <p className="text-muted-foreground text-center max-w-sm">
            Die Festplattenanalyse wurde erfolgreich dokumentiert.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setDone(false);
                setSelectedAnalyseId(null);
                setSelectedHerstellerId(null);
                setSelectedSchraubenIds([]);
                setSelectedChipsIds([]);
                setFazit('');
                setAuffaelligkeiten('');
                setZustand('neuwertig');
                setCurrentStep(1);
              }}
            >
              Neue Analyse starten
            </Button>
            <Button asChild>
              <a href="#/festplattenanalyse">Alle Analysen ansehen</a>
            </Button>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
