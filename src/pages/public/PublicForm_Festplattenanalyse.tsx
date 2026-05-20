import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { lookupKey } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '6a0dade197bb7deffcfef807';
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

export default function PublicFormFestplattenanalyse() {
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
          <h1 className="text-2xl font-bold text-foreground">Festplattenanalyse — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="modellbezeichnung">Modellbezeichnung</Label>
            <Input
              id="modellbezeichnung"
              value={fields.modellbezeichnung ?? ''}
              onChange={e => setFields(f => ({ ...f, modellbezeichnung: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seriennummer">Seriennummer</Label>
            <Input
              id="seriennummer"
              value={fields.seriennummer ?? ''}
              onChange={e => setFields(f => ({ ...f, seriennummer: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kapazitaet_gb">Kapazität (GB)</Label>
            <Input
              id="kapazitaet_gb"
              type="number"
              value={fields.kapazitaet_gb ?? ''}
              onChange={e => setFields(f => ({ ...f, kapazitaet_gb: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
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
          <div className="space-y-2">
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
          <div className="space-y-2">
            <Label htmlFor="analysedatum">Analysedatum</Label>
            <Input
              id="analysedatum"
              type="date"
              value={fields.analysedatum ?? ''}
              onChange={e => setFields(f => ({ ...f, analysedatum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
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
          <div className="space-y-2">
            <Label htmlFor="schrauben">Verwendete Schrauben</Label>
            <Input
              id="schrauben"
              value={fields.schrauben ?? ''}
              onChange={e => setFields(f => ({ ...f, schrauben: e.target.value }))}
              placeholder="Record URL"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chips">Verbaute Chips</Label>
            <Input
              id="chips"
              value={fields.chips ?? ''}
              onChange={e => setFields(f => ({ ...f, chips: e.target.value }))}
              placeholder="Record URL"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="auffaelligkeiten">Auffälligkeiten</Label>
            <Textarea
              id="auffaelligkeiten"
              value={fields.auffaelligkeiten ?? ''}
              onChange={e => setFields(f => ({ ...f, auffaelligkeiten: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="analyse_fazit">Fazit der Analyse</Label>
            <Textarea
              id="analyse_fazit"
              value={fields.analyse_fazit ?? ''}
              onChange={e => setFields(f => ({ ...f, analyse_fazit: e.target.value }))}
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
