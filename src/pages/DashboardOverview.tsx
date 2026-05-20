import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichFestplattenanalyse } from '@/lib/enrich';
import type { EnrichedFestplattenanalyse } from '@/types/enriched';
import type { Festplattenanalyse } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FestplattenanalyseDialog } from '@/components/dialogs/FestplattenanalyseDialog';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconPencil, IconTrash, IconSearch,
  IconDeviceFloppy, IconCpu, IconAdjustments, IconBuildingFactory2,
  IconCalendar, IconAlertTriangle, IconChartBar, IconX, IconChevronRight,
} from '@tabler/icons-react';

const APPGROUP_ID = '6a0dadfa6f8986c73f4b9039';
const REPAIR_ENDPOINT = '/claude/build/repair';

// Zustand-Farben
const ZUSTAND_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  neuwertig: { label: 'Neuwertig', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  gebraucht_ok: { label: 'Funktionsfähig', color: 'text-blue-700', bg: 'bg-blue-100' },
  gebraucht_defekt: { label: 'Defekt', color: 'text-amber-700', bg: 'bg-amber-100' },
  stark_beschaedigt: { label: 'Stark beschädigt', color: 'text-red-700', bg: 'bg-red-100' },
};

// Schnittstelle-Farben
const SCHNITTSTELLE_CONFIG: Record<string, string> = {
  sata: 'bg-violet-100 text-violet-700',
  ide: 'bg-orange-100 text-orange-700',
  sas: 'bg-cyan-100 text-cyan-700',
  nvme: 'bg-indigo-100 text-indigo-700',
  schnittstelle_sonstige: 'bg-muted text-muted-foreground',
};

export default function DashboardOverview() {
  const {
    festplattenhersteller, schraubentypen, chips, festplattenanalyse,
    festplattenherstellerMap, schraubentypenMap, chipsMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedFestplattenanalyse = enrichFestplattenanalyse(festplattenanalyse, { festplattenherstellerMap, schraubentypenMap, chipsMap });

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterZustand, setFilterZustand] = useState<string>('alle');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<EnrichedFestplattenanalyse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EnrichedFestplattenanalyse | null>(null);

  const filtered = useMemo(() => {
    return enrichedFestplattenanalyse.filter(r => {
      const q = search.toLowerCase();
      const matchSearch = !search
        || (r.fields.modellbezeichnung ?? '').toLowerCase().includes(q)
        || (r.fields.seriennummer ?? '').toLowerCase().includes(q)
        || (r.herstellerName ?? '').toLowerCase().includes(q);
      const zustandKey = r.fields.zustand?.key ?? '';
      const matchZustand = filterZustand === 'alle' || zustandKey === filterZustand;
      return matchSearch && matchZustand;
    });
  }, [enrichedFestplattenanalyse, search, filterZustand]);

  const selectedRecord = useMemo(
    () => filtered.find(r => r.record_id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId]
  );

  // Stats
  const totalKapazitaet = festplattenanalyse.reduce((sum, r) => sum + (r.fields.kapazitaet_gb ?? 0), 0);
  const defektCount = festplattenanalyse.filter(r => {
    const k = r.fields.zustand?.key ?? '';
    return k === 'gebraucht_defekt' || k === 'stark_beschaedigt';
  }).length;

  const handleCreate = async (fields: Festplattenanalyse['fields']) => {
    await LivingAppsService.createFestplattenanalyseEntry(fields as any);
    fetchAll();
  };

  const handleEdit = async (fields: Festplattenanalyse['fields']) => {
    if (!editRecord) return;
    await LivingAppsService.updateFestplattenanalyseEntry(editRecord.record_id, fields as any);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteFestplattenanalyseEntry(deleteTarget.record_id);
    if (selectedId === deleteTarget.record_id) setSelectedId(null);
    setDeleteTarget(null);
    fetchAll();
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-5">
      {/* Workflow-Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a
          href="#/intents/festplattenanalyse-assistent"
          className="flex items-center gap-4 bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <IconDeviceFloppy size={20} className="text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">Analyse-Assistent</p>
            <p className="text-xs text-muted-foreground line-clamp-2">Festplatte Schritt für Schritt analysieren: Hersteller, Schrauben, Chips &amp; Fazit dokumentieren</p>
          </div>
          <IconChevronRight size={18} className="text-muted-foreground shrink-0" />
        </a>
      </div>

      {/* KPI-Zeile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Analysen gesamt"
          value={String(festplattenanalyse.length)}
          description="Festplatten dokumentiert"
          icon={<IconDeviceFloppy size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Gesamtkapazität"
          value={totalKapazitaet >= 1000 ? `${(totalKapazitaet / 1000).toFixed(1)} TB` : `${totalKapazitaet} GB`}
          description="Aller analysierter Laufwerke"
          icon={<IconChartBar size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Defekte Laufwerke"
          value={String(defektCount)}
          description="Defekt oder stark beschädigt"
          icon={<IconAlertTriangle size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Hersteller"
          value={String(festplattenhersteller.length)}
          description={`${chips.length} Chips · ${schraubentypen.length} Schraubentypen`}
          icon={<IconBuildingFactory2 size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Haupt-Workspace: Liste + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
        {/* Linke Spalte: Filter + Liste */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          {/* Toolbar */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-0">
              <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
              <Input
                placeholder="Modell, Seriennummer, Hersteller…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <Button size="sm" onClick={() => { setEditRecord(null); setDialogOpen(true); }}>
              <IconPlus size={15} className="shrink-0 mr-1" />
              <span className="hidden sm:inline">Neue Analyse</span>
              <span className="sm:hidden">Neu</span>
            </Button>
          </div>

          {/* Zustand-Filter */}
          <div className="flex gap-1.5 flex-wrap">
            {(['alle', 'neuwertig', 'gebraucht_ok', 'gebraucht_defekt', 'stark_beschaedigt'] as const).map(key => (
              <button
                key={key}
                onClick={() => setFilterZustand(key)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                  filterZustand === key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                }`}
              >
                {key === 'alle' ? 'Alle' : (ZUSTAND_CONFIG[key]?.label ?? key)}
              </button>
            ))}
          </div>

          {/* Analysen-Liste */}
          <div className="space-y-2 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <IconDeviceFloppy size={40} stroke={1.5} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {search || filterZustand !== 'alle'
                    ? 'Keine Analysen gefunden.'
                    : 'Noch keine Festplatten-Analysen vorhanden.'}
                </p>
                {!search && filterZustand === 'alle' && (
                  <Button size="sm" variant="outline" onClick={() => { setEditRecord(null); setDialogOpen(true); }}>
                    <IconPlus size={14} className="mr-1" />Erste Analyse anlegen
                  </Button>
                )}
              </div>
            ) : (
              filtered.map(r => {
                const zustandKey = r.fields.zustand?.key ?? '';
                const zustandCfg = ZUSTAND_CONFIG[zustandKey];
                const schnittKey = r.fields.schnittstelle?.key ?? '';
                const schnittClass = SCHNITTSTELLE_CONFIG[schnittKey] ?? 'bg-muted text-muted-foreground';
                const isSelected = r.record_id === (selectedRecord?.record_id);

                return (
                  <div
                    key={r.record_id}
                    onClick={() => setSelectedId(r.record_id)}
                    className={`group rounded-xl border p-3 cursor-pointer transition-all hover:shadow-sm ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        <IconDeviceFloppy size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate leading-tight">
                          {r.fields.modellbezeichnung || '(Kein Modell)'}
                        </p>
                        {r.herstellerName && (
                          <p className="text-xs text-muted-foreground truncate">{r.herstellerName}</p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {r.fields.kapazitaet_gb != null && (
                            <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md font-mono">
                              {r.fields.kapazitaet_gb >= 1000
                                ? `${(r.fields.kapazitaet_gb / 1000).toFixed(1)} TB`
                                : `${r.fields.kapazitaet_gb} GB`}
                            </span>
                          )}
                          {r.fields.schnittstelle?.label && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${schnittClass}`}>
                              {r.fields.schnittstelle.label}
                            </span>
                          )}
                          {zustandCfg && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${zustandCfg.bg} ${zustandCfg.color}`}>
                              {zustandCfg.label}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); setEditRecord(r); setDialogOpen(true); }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Bearbeiten"
                        >
                          <IconPencil size={13} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteTarget(r); }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Löschen"
                        >
                          <IconTrash size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Rechte Spalte: Detail-Panel */}
        <div className="lg:col-span-3">
          {selectedRecord ? (
            <DetailPanel
              record={selectedRecord}
              onEdit={() => { setEditRecord(selectedRecord); setDialogOpen(true); }}
              onDelete={() => setDeleteTarget(selectedRecord)}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 py-20 gap-3">
              <IconDeviceFloppy size={40} stroke={1.5} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Wähle eine Analyse aus der Liste</p>
            </div>
          )}
        </div>
      </div>

      {/* Dialoge */}
      <FestplattenanalyseDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditRecord(null); }}
        onSubmit={editRecord ? handleEdit : handleCreate}
        defaultValues={editRecord
          ? {
              ...editRecord.fields,
              hersteller: editRecord.fields.hersteller
                ? editRecord.fields.hersteller
                : undefined,
            }
          : undefined}
        festplattenherstellerList={festplattenhersteller}
        schraubentypenList={schraubentypen}
        chipsList={chips}
        enablePhotoScan={AI_PHOTO_SCAN['Festplattenanalyse']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Festplattenanalyse']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Analyse löschen"
        description={`Möchtest du die Analyse „${deleteTarget?.fields.modellbezeichnung ?? 'diese Festplatte'}" wirklich löschen?`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function DetailPanel({
  record,
  onEdit,
  onDelete,
  onClose,
}: {
  record: EnrichedFestplattenanalyse;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const zustandKey = record.fields.zustand?.key ?? '';
  const zustandCfg = ZUSTAND_CONFIG[zustandKey];
  const schnittKey = record.fields.schnittstelle?.key ?? '';
  const schnittClass = SCHNITTSTELLE_CONFIG[schnittKey] ?? 'bg-muted text-muted-foreground';

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="bg-muted/40 px-5 py-4 border-b border-border">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <IconDeviceFloppy size={20} className="text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-base truncate">
              {record.fields.modellbezeichnung || '(Kein Modell)'}
            </h2>
            {record.fields.seriennummer && (
              <p className="text-xs text-muted-foreground font-mono truncate">SN: {record.fields.seriennummer}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button size="sm" variant="outline" onClick={onEdit} className="h-8 px-3">
              <IconPencil size={13} className="mr-1 shrink-0" />
              <span className="hidden sm:inline">Bearbeiten</span>
            </Button>
            <Button size="sm" variant="outline" onClick={onDelete} className="h-8 px-2 text-destructive hover:bg-destructive/10">
              <IconTrash size={13} />
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors lg:hidden"
            >
              <IconX size={15} />
            </button>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {zustandCfg && (
            <Badge className={`${zustandCfg.bg} ${zustandCfg.color} border-0 text-xs font-medium`}>
              {zustandCfg.label}
            </Badge>
          )}
          {record.fields.schnittstelle?.label && (
            <Badge className={`${schnittClass} border-0 text-xs font-medium`}>
              {record.fields.schnittstelle.label}
            </Badge>
          )}
          {record.fields.formfaktor?.label && (
            <Badge className="bg-muted text-muted-foreground border-0 text-xs font-medium">
              {record.fields.formfaktor.label}
            </Badge>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-5">
        {/* Technische Daten */}
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Technische Daten
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <DetailField
              label="Kapazität"
              value={record.fields.kapazitaet_gb != null
                ? (record.fields.kapazitaet_gb >= 1000
                    ? `${(record.fields.kapazitaet_gb / 1000).toFixed(1)} TB`
                    : `${record.fields.kapazitaet_gb} GB`)
                : undefined}
            />
            <DetailField label="Hersteller" value={record.herstellerName || undefined} />
            <DetailField label="Formfaktor" value={record.fields.formfaktor?.label} />
            <DetailField label="Schnittstelle" value={record.fields.schnittstelle?.label} />
          </div>
        </section>

        {/* Analyse-Info */}
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Analyse
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {record.fields.analysedatum && (
              <div className="col-span-2 flex items-center gap-2 text-sm">
                <IconCalendar size={14} className="text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Analysiert am:</span>
                <span className="font-medium">{formatDate(record.fields.analysedatum)}</span>
              </div>
            )}
          </div>
        </section>

        {/* Komponenten */}
        {(record.schraubenName || record.chipsName) && (
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Verbaute Komponenten
            </h3>
            <div className="space-y-2">
              {record.schraubenName && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
                  <IconAdjustments size={15} className="text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Schrauben</p>
                    <p className="text-sm font-medium truncate">{record.schraubenName}</p>
                  </div>
                </div>
              )}
              {record.chipsName && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
                  <IconCpu size={15} className="text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Chips</p>
                    <p className="text-sm font-medium truncate">{record.chipsName}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Auffälligkeiten & Fazit */}
        {record.fields.auffaelligkeiten && (
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Auffälligkeiten
            </h3>
            <p className="text-sm text-foreground bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 leading-relaxed">
              {record.fields.auffaelligkeiten}
            </p>
          </section>
        )}

        {record.fields.analyse_fazit && (
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Fazit der Analyse
            </h3>
            <p className="text-sm text-foreground bg-muted/40 rounded-lg px-3 py-2.5 leading-relaxed">
              {record.fields.analyse_fazit}
            </p>
          </section>
        )}

        {/* Foto */}
        {record.fields.analyse_foto && (
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Foto der zerlegten Festplatte
            </h3>
            <div className="rounded-xl overflow-hidden border border-border">
              <img
                src={record.fields.analyse_foto}
                alt="Zerlegte Festplatte"
                className="w-full object-cover max-h-64"
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value?: string }) {
  return (
    <div className="bg-muted/40 rounded-lg px-3 py-2.5">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-semibold truncate">{value || '—'}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 space-y-2">
          <Skeleton className="h-9 rounded-xl" />
          <Skeleton className="h-8 rounded-xl w-3/4" />
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <div className="lg:col-span-3">
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
