import { useRef, useState } from 'react';
import { Bell, BellOff, Download, Upload, FileSpreadsheet, Database, Sun, Moon, Monitor, Info } from 'lucide-react';
import { Button, Card, focusRing } from '../components/ui';
import { notificationsSupported } from '../hooks/useReminders';

function Section({ icon: Icon, title, description, children, tone = 'indigo' }) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
    red: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300',
  };
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex gap-4">
        <span className={`flex h-11 w-11 flex-none items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-slate-900 dark:text-white">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{description}</p>}
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </Card>
  );
}

export default function Settings({ settings, setSettings, itemCount, onExport, onImportFile, onCSV, onLoadSample, toast }) {
  const fileRef = useRef(null);
  const supported = notificationsSupported();
  const [permission, setPermission] = useState(supported ? Notification.permission : 'unsupported');

  const enableAlerts = async () => {
    try {
      const p = await Notification.requestPermission();
      setPermission(p);
      if (p === 'granted') {
        setSettings({ desktopAlerts: true });
        toast.success('Desktop alerts are on. You’ll get one alert per due item per day while RenewalVault is open.');
      } else if (p === 'denied') {
        toast.error('Notifications are blocked. Allow them in your browser’s site settings, then try again.');
      }
    } catch {
      toast.error('This browser could not enable notifications.');
    }
  };

  const testAlert = () => {
    try {
      new Notification('RenewalVault test alert', { body: 'Desktop alerts are working.', icon: '/favicon.svg' });
    } catch {
      toast.error('Could not show a test notification.');
    }
  };

  const alertsOn = settings.desktopAlerts && permission === 'granted';

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">Settings</h1>

      <Section icon={alertsOn ? Bell : BellOff} title="Desktop alerts" description="Get a system notification for each item that needs attention (once per item per day) while the portal is open in a tab.">
        {!supported ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">This browser doesn&apos;t support desktop notifications. Use “Add to Calendar” on each item for phone reminders.</p>
        ) : permission === 'denied' ? (
          <p className="text-sm text-red-700 dark:text-red-300">Notifications are blocked for this site. Allow them in your browser&apos;s site settings (the lock icon in the address bar), then reload.</p>
        ) : alertsOn ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={testAlert}>
              Send test alert
            </Button>
            <Button variant="ghost" onClick={() => setSettings({ desktopAlerts: false })}>
              <BellOff className="h-4 w-4" aria-hidden="true" /> Turn off
            </Button>
          </div>
        ) : (
          <Button onClick={permission === 'granted' ? () => setSettings({ desktopAlerts: true }) : enableAlerts}>
            <Bell className="h-4 w-4" aria-hidden="true" /> Enable desktop alerts
          </Button>
        )}
        <p className="mt-3 flex gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Info className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden="true" />
          For reminders when the portal is closed, use “Add to Calendar” on each item.
        </p>
      </Section>

      <Section icon={Sun} title="Theme" tone="amber">
        <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="radiogroup" aria-label="Theme">
          {[
            { id: 'light', label: 'Light', icon: Sun },
            { id: 'dark', label: 'Dark', icon: Moon },
            { id: 'system', label: 'System', icon: Monitor },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={settings.theme === id}
              onClick={() => setSettings({ theme: id })}
              className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3 text-sm font-semibold ${focusRing} ${
                settings.theme === id ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </Section>

      <Section icon={Database} title="Backup & export" tone="emerald" description={`Your data is stored only in this browser (${itemCount} item${itemCount === 1 ? '' : 's'}). Export a backup regularly.`}>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onExport}>
            <Download className="h-4 w-4" aria-hidden="true" /> Export backup (JSON)
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" aria-hidden="true" /> Import backup (JSON)
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            tabIndex={-1}
            aria-label="Choose backup file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImportFile(f);
              e.target.value = '';
            }}
          />
          <Button variant="secondary" onClick={onCSV} disabled={!itemCount}>
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" /> Export to CSV
          </Button>
          <Button variant="secondary" onClick={onLoadSample}>
            <Database className="h-4 w-4" aria-hidden="true" /> Load sample data
          </Button>
        </div>
      </Section>
    </div>
  );
}
