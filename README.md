# RenewalVault

A personal portal for documents, policies and certificates with expiry dates. It reminds you **before** each one expires, and each category has its own reminder period.

Built with React 18, Vite, Tailwind CSS, `lucide-react` and `date-fns`. Data stays in your browser's `localStorage`. There is no backend and no login.

---

## Run it

Requires **Node.js 18+**.

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build into dist/
npm run preview   # serve the production build locally
```

To try it quickly, open **Settings → Load sample data**. It adds 1–2 items per category with dates relative to today, so you can see every status, the popup and the bell straight away.

---

## How reminders work

| Category | Reminder |
|---|---|
| Driving License, Insurance, Vehicle RC, Medical Insurance, Health Safety Scheme | 1 month before expiry |
| PUC, Fixed Deposit | 5 days before expiry |
| Passport, Visa, Lift | 3 months before expiry |
| Others | on the Reminder Date you pick |

* `reminderDate = expiryDate − offset`, calculated with `subMonths` / `subDays`. Month-ends are clamped, so 31 Mar − 1 month = 28/29 Feb.
* Statuses compare calendar dates only. **Expired** means today is after the expiry date. **Expiring soon** means the reminder date ≤ today ≤ the expiry date. **Active** means today is before the reminder date.
* Statuses are recalculated on load, every 60 minutes, when the tab becomes visible again, and after every add, edit or renew.

### Alerts

1. **Popup on open.** It lists due and expired items, with Renew, Remind me tomorrow, Snooze 7 days and View. **Dismiss all for today** stops it reappearing until tomorrow.
2. **Bell** in the header. It lists every due and expired item, including snoozed ones.
3. **Toasts** confirm saves and deletes, and appear when an item enters its reminder window while the app is open.
4. **Desktop notifications.** Turn them on under Settings → Enable desktop alerts. You get one per due item per day while the app is open in a tab.
5. **Add to Calendar (.ics)** on every item. It downloads two all-day events, one on the reminder date and one on the expiry date, each with a 9:00 AM alarm. **Calendar alerts are the only reminders that work when the portal is closed**, so add your important items to your phone calendar.

---

## Add or change a category (edit only `src/config/categories.js`)

Everything is generated from the config: the sidebar, dashboard cards, the add picker, forms, item cards, search and CSV export.

1. Open `src/config/categories.js`.
2. Add an object to `CATEGORIES`:

```js
{
  id: 'pet-vaccination',            // unique and kebab-case; don't rename it once you have data
  label: 'Pet Vaccination',
  group: 'Health',                  // one of GROUPS (add a new group name to GROUPS if needed)
  icon: 'Syringe',                  // a lucide-react icon name (see note below)
  color: 'teal',                    // a key of COLORS
  titleField: 'petName',
  subtitleField: 'vaccine',
  reminder: { type: 'days', value: 14 },   // or { type: 'months', value: 2 } or { type: 'custom', field: 'reminderDate' }
  fields: [
    { key: 'petName', label: 'Pet Name', type: 'text', required: true },
    { key: 'vaccine', label: 'Vaccine', type: 'text', required: true },
    { key: 'certNo',  label: 'Certificate No.', type: 'text', required: true, sensitive: true, duplicateKey: true },
    { key: 'expiryDate', label: 'Expiry Date', type: 'date', required: true, isExpiry: true },
  ],
},
```

Field options: `type` (`text` | `date` | `textarea`), `required`, `isExpiry` (exactly one per category), `isReminder` (for custom reminders), `sensitive` (masked on cards with an eye toggle), `uppercase` (auto-uppercase and collapse spaces), `vehicle` (vehicle-number autocomplete), `duplicateKey` (duplicate warning), `renewable` (offered as an optional new value in the Renew dialog) and `placeholder`.

**Icons:** the 11 built-in icons are already registered. To use a new lucide icon, also add its name to the import list in `src/components/Icon.jsx`. Explicit imports keep the bundle small. This is the one exception to "only edit the config".

**Colours:** use one of the `COLORS` keys (indigo, emerald, sky, cyan, violet, fuchsia, orange, rose, teal, amber, slate). To add a new colour, copy an entry in `COLORS` and write the **full literal class names**. Tailwind removes class names it can't find in the source, so never build them like `` `bg-${color}-500` ``.

---

## Data and backups

* Everything is stored under a single versioned key, `renewalvault:v1`. If saved data is corrupted, the app starts empty, keeps a copy of the bad data under `renewalvault:v1:corrupt-<timestamp>` and shows a toast.
* **Settings → Export backup (JSON)** and **Import backup (JSON)**. Imports are validated, and invalid entries are skipped.
* **Export to CSV** opens in Excel or Google Sheets.
* Data lives in **this browser only**. Clearing site data or switching device or browser loses it unless you have a backup.

Item shape:

```js
{
  id, categoryId, values: { ... },
  reminderDate: 'YYYY-MM-DD',   // computed and stored
  snoozedUntil, lastNotifiedOn,
  renewalHistory: [{ oldExpiry, renewedOn, oldValues? }],
  createdAt, updatedAt
}
```

---

## Deploy for free

It's a static site. The build output is `dist/`.

### Netlify
1. Push the project to GitHub.
2. Netlify → **Add new site → Import an existing project** → pick the repo.
3. Build command: `npm run build`. Publish directory: `dist`. Deploy.

You can also run `npm run build` and drag the `dist` folder onto <https://app.netlify.com/drop>.

### Vercel
1. Push to GitHub.
2. Vercel → **Add New → Project** → import the repo. It detects Vite automatically (build `npm run build`, output `dist`). Deploy.

Each deployed URL has its own `localStorage`, so data from `localhost` doesn't carry over. Export a backup locally and import it on the live site.

---

## Project structure

```
src/
  config/categories.js        ← the only file you need to add categories
  utils/  dates.js reminders.js storage.js ics.js csv.js mask.js search.js sampleData.js download.js
  hooks/  useItems.js (state + persistence)  useReminders.js (statuses, timers, desktop alerts)  useTheme.js
  components/  Header Sidebar StatCards CategoryCard ItemCard ItemGrid ItemFormModal CategoryPicker
               ReminderPopup BellPanel RenewModal ConfirmDialog Modal Toast EmptyState StatusChip Icon ui
  pages/  Dashboard CategoryPage SearchResults Settings
```

---

## Ready for Phase 2

* **Cloud sync and login (Firebase or Supabase).** All persistence goes through `src/utils/storage.js` (`loadState`, `saveState`, `clearState`, `exportBackup`, `parseBackup`). Replace those functions with a cloud adapter, make them async and `await` them in `useItems.js`. Items already have stable UUIDs and `createdAt` / `updatedAt` for merging.
* **Email or WhatsApp reminders while the portal is closed.** Every item stores `reminderDate` and `lastNotifiedOn`, so a scheduled function (Supabase cron or Edge Function, Firebase scheduled function) can query `reminderDate <= today AND expiry >= today - N AND lastNotifiedOn != today` and send messages.
* **PIN lock.** Wrap `<App />` in `main.jsx` with a lock screen component.
* **Photo or PDF attachments.** Add an `attachments: []` array to the item shape (sanitised in `storage.js`) and store the files in cloud storage.
