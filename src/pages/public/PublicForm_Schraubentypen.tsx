import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { lookupKey } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '6a0daddf108135c4775e0889';
const SUBMIT_PATH = `/rest/apps/${APP_ID}/records`;
const ALTCHA_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js';

async function submitPublicForm(fields: Record<string, unknown>, captchaToken: string) {
  const res = await fetch(`${PROXY_BASE}/api${SUBMIT_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Captcha-Token': captchaToken,
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Submission failed');
  }
  return res.json();
}


function cleanFields(fields: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (typeof value === 'object' && !Array.isArray(value) && 'key' in (value as any)) {
      cleaned[key] = (value as any).key;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item =>
        typeof item === 'object' && item !== null && 'key' in item ? item.key : item
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export default function PublicFormSchraubentypen() {
  const [fields, setFields] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captchaRef = useRef<HTMLElement | null>(null);

  // Load the ALTCHA web component script once per page.
  useEffect(() => {
    if (document.querySelector(`script[src="${ALTCHA_SCRIPT_SRC}"]`)) return;
    const s = document.createElement('script');
    s.src = ALTCHA_SCRIPT_SRC;
    s.defer = true;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return;
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const prefill: Record<string, any> = {};
    params.forEach((value, key) => { prefill[key] = value; });
    if (Object.keys(prefill).length) setFields(prev => ({ ...prefill, ...prev }));
  }, []);

  function readCaptchaToken(): string | null {
    const el = captchaRef.current as any;
    if (!el) return null;
    return el.value || el.getAttribute('value') || null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = readCaptchaToken();
    if (!token) {
      setError('Bitte warte auf die Spam-Prüfung und versuche es erneut.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicForm(cleanFields(fields), token);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Etwas ist schiefgelaufen. Bitte versuche es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Vielen Dank!</h2>
          <p className="text-muted-foreground">Deine Eingabe wurde erfolgreich übermittelt.</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setFields({}); }}>
            Weitere Eingabe
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Schraubentypen — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="schrauben_bezeichnung">Bezeichnung</Label>
            <Input
              id="schrauben_bezeichnung"
              value={fields.schrauben_bezeichnung ?? ''}
              onChange={e => setFields(f => ({ ...f, schrauben_bezeichnung: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="schrauben_typ">Schraubentyp</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.schrauben_typ) === 'phillips'}
                onClick={() => setFields(f => ({ ...f, schrauben_typ: (lookupKey(f.schrauben_typ) === 'phillips' ? undefined : 'phillips') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.schrauben_typ) === 'phillips'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Phillips (Kreuzschlitz)
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.schrauben_typ) === 'schlitz'}
                onClick={() => setFields(f => ({ ...f, schrauben_typ: (lookupKey(f.schrauben_typ) === 'schlitz' ? undefined : 'schlitz') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.schrauben_typ) === 'schlitz'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Schlitz
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.schrauben_typ) === 'torx'}
                onClick={() => setFields(f => ({ ...f, schrauben_typ: (lookupKey(f.schrauben_typ) === 'torx' ? undefined : 'torx') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.schrauben_typ) === 'torx'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Torx
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.schrauben_typ) === 'hex'}
                onClick={() => setFields(f => ({ ...f, schrauben_typ: (lookupKey(f.schrauben_typ) === 'hex' ? undefined : 'hex') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.schrauben_typ) === 'hex'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Hex / Inbus
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.schrauben_typ) === 'sonstige'}
                onClick={() => setFields(f => ({ ...f, schrauben_typ: (lookupKey(f.schrauben_typ) === 'sonstige' ? undefined : 'sonstige') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.schrauben_typ) === 'sonstige'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Sonstige
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="kopfform">Kopfform</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.kopfform) === 'flachkopf'}
                onClick={() => setFields(f => ({ ...f, kopfform: (lookupKey(f.kopfform) === 'flachkopf' ? undefined : 'flachkopf') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.kopfform) === 'flachkopf'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Flachkopf
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.kopfform) === 'linsenkopf'}
                onClick={() => setFields(f => ({ ...f, kopfform: (lookupKey(f.kopfform) === 'linsenkopf' ? undefined : 'linsenkopf') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.kopfform) === 'linsenkopf'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Linsenkopf
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.kopfform) === 'zylinderkopf'}
                onClick={() => setFields(f => ({ ...f, kopfform: (lookupKey(f.kopfform) === 'zylinderkopf' ? undefined : 'zylinderkopf') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.kopfform) === 'zylinderkopf'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Zylinderkopf
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.kopfform) === 'senkkopf'}
                onClick={() => setFields(f => ({ ...f, kopfform: (lookupKey(f.kopfform) === 'senkkopf' ? undefined : 'senkkopf') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.kopfform) === 'senkkopf'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Senkkopf
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.kopfform) === 'kopf_sonstige'}
                onClick={() => setFields(f => ({ ...f, kopfform: (lookupKey(f.kopfform) === 'kopf_sonstige' ? undefined : 'kopf_sonstige') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.kopfform) === 'kopf_sonstige'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Sonstige
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="laenge_mm">Länge (mm)</Label>
            <Input
              id="laenge_mm"
              type="number"
              value={fields.laenge_mm ?? ''}
              onChange={e => setFields(f => ({ ...f, laenge_mm: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="durchmesser_mm">Durchmesser (mm)</Label>
            <Input
              id="durchmesser_mm"
              type="number"
              value={fields.durchmesser_mm ?? ''}
              onChange={e => setFields(f => ({ ...f, durchmesser_mm: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="material">Material</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.material) === 'stahl'}
                onClick={() => setFields(f => ({ ...f, material: (lookupKey(f.material) === 'stahl' ? undefined : 'stahl') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.material) === 'stahl'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Stahl
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.material) === 'edelstahl'}
                onClick={() => setFields(f => ({ ...f, material: (lookupKey(f.material) === 'edelstahl' ? undefined : 'edelstahl') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.material) === 'edelstahl'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Edelstahl
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.material) === 'aluminium'}
                onClick={() => setFields(f => ({ ...f, material: (lookupKey(f.material) === 'aluminium' ? undefined : 'aluminium') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.material) === 'aluminium'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Aluminium
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.material) === 'titan'}
                onClick={() => setFields(f => ({ ...f, material: (lookupKey(f.material) === 'titan' ? undefined : 'titan') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.material) === 'titan'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Titan
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.material) === 'material_sonstige'}
                onClick={() => setFields(f => ({ ...f, material: (lookupKey(f.material) === 'material_sonstige' ? undefined : 'material_sonstige') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.material) === 'material_sonstige'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Sonstige
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="beschichtung">Beschichtung</Label>
            <Input
              id="beschichtung"
              value={fields.beschichtung ?? ''}
              onChange={e => setFields(f => ({ ...f, beschichtung: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="schrauben_anmerkungen">Anmerkungen</Label>
            <Textarea
              id="schrauben_anmerkungen"
              value={fields.schrauben_anmerkungen ?? ''}
              onChange={e => setFields(f => ({ ...f, schrauben_anmerkungen: e.target.value }))}
              rows={3}
            />
          </div>

          <altcha-widget
            ref={captchaRef as any}
            challengeurl={`${PROXY_BASE}/api/_challenge?path=${encodeURIComponent(SUBMIT_PATH)}`}
            auto="onsubmit"
            hidefooter
          />

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Wird gesendet...' : 'Absenden'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Powered by Klar
        </p>
      </div>
    </div>
  );
}
