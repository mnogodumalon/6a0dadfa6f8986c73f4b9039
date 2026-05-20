import type { Festplattenhersteller } from '@/types/app';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { IconPencil } from '@tabler/icons-react';

interface FestplattenherstellerViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Festplattenhersteller | null;
  onEdit: (record: Festplattenhersteller) => void;
}

export function FestplattenherstellerViewDialog({ open, onClose, record, onEdit }: FestplattenherstellerViewDialogProps) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Festplattenhersteller anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Herstellername</Label>
            <p className="text-sm">{record.fields.hersteller_name ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kürzel / Markenzeichen</Label>
            <p className="text-sm">{record.fields.hersteller_kuerzel ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Herkunftsland</Label>
            <p className="text-sm">{record.fields.herkunftsland ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gründungsjahr</Label>
            <p className="text-sm">{record.fields.gruendungsjahr ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Webseite</Label>
            <p className="text-sm">{record.fields.webseite ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kontakt-E-Mail</Label>
            <p className="text-sm">{record.fields.email_kontakt ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anmerkungen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.anmerkungen ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}