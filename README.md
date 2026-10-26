# Morning Star Desk

Internal operations software for **Morning Star Limousine** (Ras Al Khaimah): bookings, rentals, dispatch board, quotes, UAE tax invoices, credit notes, receipts, payments with VAT on/off, client accounts, chauffeurs, the 12-vehicle fleet, WhatsApp job sheets and confirmations, and a work-only AI assistant.

It runs on **Vercel** (website + server functions) with a **Turso** database.

```
public/index.html   the desk (all screens)
api/                server functions: login, data, save, settings, numbering, team, password, assistant
lib/                database, password hashing, sessions, roles
vercel.json         tells Vercel there is no build step and to serve /public
.env.example        the settings you must add in Vercel
```

---

## Set it up (about 20 minutes)

### 1. Create the database on Turso

1. Sign up at **turso.tech** (the free plan is plenty: 5 GB, 10 bookings a day uses a few MB a year).
2. Create a database, for example `morningstar-desk`. Pick the location nearest the UAE that Turso offers.
3. Copy two things from the database page:
   - the **database URL** (starts with `libsql://`)
   - a new **auth token** (Create token → read & write)

Using the Turso command line instead:

```bash
turso db create morningstar-desk
turso db show morningstar-desk --url
turso db tokens create morningstar-desk
```

The tables are created automatically the first time the app runs. You don't need to run any SQL.

### 2. Put the code on GitHub

Create a **private** repository and upload the **contents** of this folder so that the top of the repository looks exactly like this:

```
api/
lib/
public/
.env.example
.gitignore
README.md
package.json
vercel.json
```

On github.com: open the repository → **Add file → Upload files** → open the unzipped `morningstar-desk` folder on your computer, select **everything inside it** (the `api`, `lib` and `public` folders and the files) and drag it all into the upload box in one go, then **Commit changes**. Dragging the folders keeps them as folders. Don't pick the files one by one, and don't upload the `morningstar-desk` folder itself.

Do **not** upload a `.env` file with real values.

### 3. Deploy on Vercel

1. In Vercel: **Add New → Project →** import the GitHub repository.
2. Leave the build settings as they are (`vercel.json` handles them).
3. Open **Environment Variables** and add these:

| Name | Value |
|---|---|
| `TURSO_DATABASE_URL` | the `libsql://…` URL from step 1 |
| `TURSO_AUTH_TOKEN` | the token from step 1 |
| `SESSION_SECRET` | a long random string, 32+ characters ([how](#make-a-session-secret)) |
| `ADMIN_EMAIL` | e.g. `admin@morningstarlimo.com` |
| `ADMIN_PASSWORD` | a strong first password (12+ characters) |
| `ADMIN_NAME` | e.g. `Operations Admin` |
| `GEMINI_API_KEY` | optional, turns on the Desk assistant with Google Gemini ([how](#turn-on-the-ai-assistant-google-ai-studio)) |
| `AI_MODEL` | optional, leave empty to use `gemini-flash-latest` |
| `ANTHROPIC_API_KEY` | optional alternative to Gemini (used only when `GEMINI_API_KEY` is empty) |

4. Click **Deploy**.

### 4. First sign-in

1. Open your Vercel address and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
   On this first sign-in the desk saves the company details and the 12-vehicle fleet to the database.
2. Click the **key** icon (bottom left) and change your password.
3. **Settings:**
   - enter real **prices** (the rate card starts with sample numbers) and your **VAT TRN**
   - under **Invoicing**, add your bank name, account name, IBAN and SWIFT so they print on invoices
   - **Team → Add person** for each staff member, with the right role
4. **Fleet:** add plates, Mulkiya and insurance dates so renewals get flagged.
5. **Chauffeurs:** add your drivers and their document expiry dates.

Want to practise first? **Settings → Load examples** adds five months of sample bookings, invoices, chauffeurs and clients, so Reports have something to show. Remove them with **Clear examples, keep fleet** on the Today screen.

After the first admin exists, you can delete `ADMIN_PASSWORD` from Vercel. It is only used when the database has no users.

### Turn on the AI assistant (Google AI Studio)

1. Go to **aistudio.google.com**, sign in with the company Google account and choose **Get API key → Create API key**. Copy the key (it starts with `AIza`).
2. **Turn on billing** for that Google project (AI Studio shows **Set up billing** next to the key). On Google's free tier, what the assistant sends (bookings, customer names and phone numbers) can be used to improve Google's products. On the paid tier it isn't. Each question costs roughly 1 US cent; set a budget alert in Google Cloud if you like.
3. In Vercel: **Settings → Environment Variables → add `GEMINI_API_KEY`** with the key, then **Deployments → Redeploy**.
4. Sign in to the desk. The **Ask the desk** button appears at the bottom right.

The assistant only answers questions about this business (bookings, rentals, chauffeurs, fleet, invoices and payments) and can't change any records. `gemini-flash-latest` always points to Google's current Flash model, so it keeps working when Google retires old models. To pin a model, set `AI_MODEL` (for example `gemini-3.8-flash`).

### 5. Use your own address (optional)

Vercel → your project → **Settings → Domains** → add `desk.morningstarlimo.com`, then add the DNS record Vercel shows you at your domain provider.

---

## Features at a glance

- **Rentals** (menu after Bookings): self-drive and with-chauffeur hire, per day, week or month. Reserve, hand over (km, fuel, deposit, licence check), record the return, add traffic fines, then bill. Extra kilometres, refuelling, Salik, damage and fines are worked out automatically and only what hasn't been invoiced yet goes on the next invoice. Deposits can be used towards the bill or marked refunded. Printable rental agreement with your own terms. Rates and terms are in **Settings → Rentals**.
- **Tolls you control** (Settings → Tolls): Salik peak and off-peak, Darb (Abu Dhabi) and any toll you add, each with its own price. Bookings and rental returns get a box per toll, plus an "other tolls or parking" amount.
- **VAT is off by default.** New bookings, quotes, rentals and invoice lines start without VAT; tick it on for any single job. A VAT-registered company can switch the default on in **Settings → Rate card**.
- **Map links** on every booking: Google Maps and Waze for pickup and drop-off, and a driving route. Paste a Google Maps pin or coordinates for exact spots (villa gates, staff camps, hotel entrances). Links go into the chauffeur's WhatsApp job sheet automatically. No map API key or cost.
- **Flight status** link for airport pickups.
- **Dispatch timeline**: each chauffeur's day as bars, with overlapping trips flagged in red.
- **Day schedules on WhatsApp**: send a chauffeur all their jobs for the day in one message, with map and route links.
- **Repeat bookings** for staff and university shuttles: every weekday, Monday to Saturday, daily or weekly, up to 92 at once.
- **Reports**: revenue by month with comparison to the previous period, busiest weekdays, top clients, revenue by service and vehicle class, fleet use and a chauffeur ranking. Admin and Accounts only.
- **Backup and export** (Settings): one-click full backup, CSV exports of bookings, invoices and payments for Excel or the accountant, and restore from a backup.

## Invoicing

Under **Invoices and payments**:

- **To invoice** lists finished trips not yet billed, grouped by client. Tick a corporate client's trips for the month and press **Invoice ticked trips** for one monthly invoice; individual clients get one invoice per trip.
- **New invoice** bills anything else (for example a contract shuttle month) with free lines. VAT can be switched off per line.
- Invoices print as **Tax invoice** with your TRN, the client's TRN, the date of supply, VAT per line and the total in words. Without a TRN in Settings they print as plain **Invoice**.
- **Record payment** on an invoice spreads the money across its trips and creates a **receipt**.
- Issued invoices are never edited. Corrections go through a **credit note**, which needs a reason and can't exceed what's left on the invoice.
- Overdue invoices appear on the Today screen. A client account can be sent a WhatsApp **statement** of everything unpaid.
- **Print or save as PDF** and **Download** give you the invoice or receipt as a document to attach in WhatsApp or email.

Numbering is INV-1001, CN-1001 and so on, handed out by the server so it never repeats.
Check the invoice layout with your accountant before the first real invoice.

## Roles

| Role | Can open |
|---|---|
| Admin | everything, including Reports, Settings and Team |
| Dispatcher | Today, Bookings, Rentals, Dispatch, Quotes, Client accounts (view), Chauffeurs, Fleet |
| Accounts | Today, Bookings, Rentals, Quotes, Invoices and payments, Reports, Client accounts |

The server enforces these too. For example, a dispatcher cannot change settings, client accounts or invoices even by calling the server directly. Only admins and accounts staff issue invoices and credit notes.

## Security built in

- Passwords stored as scrypt hashes, never in plain text.
- Sign-in cookie is HttpOnly, Secure, SameSite=Strict and signed with `SESSION_SECRET`.
- Five wrong passwords lock an account for 15 minutes. An admin's password reset unlocks it.
- Turning a person off in Team cuts their access straight away.
- Requests from other websites are refused. Pages are marked no-index so search engines skip them.
- The assistant's scope rules live on the server, so they can't be removed from the browser. The AI key stays on the server and is never sent to the browser. It only answers about this business and cannot change records.
- Card checks store only cardholder, brand, last 4 digits and expiry. Never full card numbers.

## Not included yet

- **Automatic WhatsApp sending.** Messages open WhatsApp ready to send. Automatic sending needs the WhatsApp Business API (Meta Cloud API, Twilio or 360dialog).
- **Card payments.** Record payments and card checks here; take the money through your payment gateway's links.
- **Full bookkeeping.** Expenses, profit and loss and the VAT return stay with your accountant or accounting software; the desk gives them the invoices and receipts.
- **Password reset by email.** An admin resets passwords in Settings → Team.
- **Several people editing the same booking at the same moment.** The last save wins. Screens refresh every 30 seconds.

## Run it on your computer (for developers)

```bash
npm install
cp .env.example .env.local      # fill in real values
npx vercel dev                  # opens http://localhost:3000
```

### Make a session secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Hosting note

Vercel's free **Hobby** plan is for personal, non-commercial use. Software that runs a company's operations counts as commercial, so plan for **Vercel Pro**. The same code also runs on other Node hosts if you move later.
