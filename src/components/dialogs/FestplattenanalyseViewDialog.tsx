import type { Festplattenanalyse, Festplattenhersteller, Schraubentypen, Chips } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconFileText } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface FestplattenanalyseViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Festplattenanalyse | null;
  onEdit: (record: Festplattenanalyse) => void;
  festplattenherstellerList: Festplattenhersteller[];
  schraubentypenList: Schraubentypen[];
  chipsList: Chips[];
}

export function FestplattenanalyseViewDialog({ open, onClose, record, onEdit, festplattenherstellerList, schraubentypenList, chipsList }: FestplattenanalyseViewDialogProps) {
  function getFestplattenherstellerDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return festplattenherstellerList.find(r => r.record_id === id)?.fields.hersteller_name ?? '—';
  }

  function getSchraubentypenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return schraubentypenList.find(r => r.record_id === id)?.fields.schrauben_bezeichnung ?? '—';
  }

  function getChipsDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return chipsList.find(r => r.record_id === id)?.fields.chip_bezeichnung ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Festplattenanalyse anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Modellbezeichnung</Label>
            <p className="text-sm">{record.fields.modellbezeichnung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Seriennummer</Label>
            <p className="text-sm">{record.fields.seriennummer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kapazität (GB)</Label>
            <p className="text-sm">{record.fields.kapazitaet_gb ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Formfaktor</Label>
            <Badge variant="secondary">{record.fields.formfaktor?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Schnittstelle</Label>
            <Badge variant="secondary">{record.fields.schnittstelle?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Analysedatum</Label>
            <p className="text-sm">{formatDate(record.fields.analysedatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zustand der Festplatte</Label>
            <Badge variant="secondary">{record.fields.zustand?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Hersteller</Label>
            <p className="text-sm">{getFestplattenherstellerDisplayName(record.fields.hersteller)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Verwendete Schrauben</Label>
            <p className="text-sm">{getSchraubentypenDisplayName(record.fields.schrauben)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Verbaute Chips</Label>
            <p className="text-sm">{getChipsDisplayName(record.fields.chips)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Auffälligkeiten</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.auffaelligkeiten ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Foto der zerlegten Festplatte</Label>
            {record.fields.analyse_foto ? (
              <div className="relative w-full rounded-lg bg-muted overflow-hidden border">
                <img src={record.fields.analyse_foto} alt="" className="w-full h-auto object-contain" />
              </div>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Fazit der Analyse</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.analyse_fazit ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}