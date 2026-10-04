BDM Starter Prototype V2

New in V2
- Browser-side XLSX/XLSM/XLS/CSV import
- Reads first worksheet
- Maps the supplied 38-column Data format
- Saves dated snapshots in browser localStorage
- Compares current upload with previous snapshot
- Detects new, disappeared/dead, never traded, at-risk and critical accounts
- Basic movement reporting for sales and transactions
- Customer queues generated from imported data
- Activity history persists in localStorage
- Existing rapid call / quote workflow retained

Important:
- The Data tab does not contain telephone numbers, so real imported accounts show
  "Telephone not in Data tab". A second source/mapping is needed for phone numbers.
- This is still a local-browser prototype. Data is stored only on that browser/device.

V3 additions
- Mobile-first dashboard spacing and cards
- Customer % contacted this calendar period
- Lead strike rate = leads created / customers spoken to
- Number of leads
- Total lead value
- Total lead margin
- Weighted margin %
- Leads due for follow-up today
- Overdue leads
- Leads by category
- Dedicated Leads screen
- Quote workflow now captures lead category and creates a structured lead record
- Lead data persists in localStorage

Current prototype definition:
- A lead is created when "Quote given" is saved.
- "This period" currently means the current calendar month.

V4: action-first dashboard, 4-week periods from 29/12/2025, required-by date on each lead, period/category pipeline breakdown. 05/10/2026 = D1 W1 P11.

V5 additions
- Customer-contact percentage now uses the 4-week sales period, not calendar month
- Main navigation split into Home / New Calls / Leads / Stats
- New Calls tab groups customers by priority/category
- Period-specific sales messages in Settings for Urgent, At Risk, New, and Growth
- Sales messages can be set on D1 or changed at any point in that period
- Leads tab shows total lead value and total margin
- Leads tab can switch between All Leads / By Category / By Required Period
- Stats tab includes:
  calls made
  success rate getting through
  voicemails left
  conversations
  sales strike rate
  leads generated this week + values/margin
  leads generated this period + values/margin
  lead conversion rate
- Lead conversion = won leads / leads required in the current sales period

V6 additions
- HANDSOME trade-style theme. No Howdens logo or official branding assets are used.
- Multi-user setup with 4 digit PINs
- Default manager user for prototype: name Manager, PIN 1234
- PIN confirmation required before contact/lead saves and period settings saves
- User identity and timestamp saved into audit history
- Lead owner recorded as the user who creates the lead
- User setup in Settings
- Manager permission toggle
- User creation/deactivation requires a manager PIN
- Manager-only bottom navigation item appears for an authenticated manager
- Manager dashboard shows:
  lead totals by staff member
  lead sales value by staff
  margin £ / margin % by staff
  overdue leads and their owners
  lead follow-up calls due today and their owners
- PIN UI is phone-first with large numeric keypad

Prototype security note:
PIN hashes and business data are stored in browser localStorage. This is suitable for a prototype/demo, not production authentication or shared business data. A production version needs a backend database, real user authentication/authorization, and server-side audit logs.

V7 additions
- Lead owner is explicitly assignable to any active user.
- The user who saves the lead remains separately recorded in the audit trail.
- Lead category is restricted to Kitchen or Joinery.
- Every customer account keeps lead performance statistics:
  total leads, open leads, won leads, lost leads and success rate.
- Lead success rate is won / (won + lost), so open leads do not distort the rate.
- Customer screens display the account's lead success history.
- Manager reporting includes lead success by staff member.

V8 additions
- Theme revised to dark green / white / grey trade styling with no yellow.
- Manager-configurable call priority ranking.
- Priority categories include approaching closure, never traded, 12+ months lapsed, drastic spend reduction, low loyalty, kitchen-heavy, flooring-heavy, joinery-heavy, very loyal, one-off customers, new accounts with no first trade, high-value at risk and product-gap opportunities.
- Imported customer queues use the manager-defined order.
- Call duration capture with quick 1 / 2 / 5 / 10 / 15 minute buttons.
- Manager reporting includes calls per day, average call duration, time of day of calls and time of day of successful calls.

V9 theme correction
- Reworked to Howdens-inspired published brand palette:
  red #D22630
  black #000000
  grey #646363
  white #FFFFFF
  cream #F5F0E3
  dark blue-grey #28343C
- Removed all green/yellow styling from the visible UI.
- White header with red brand rule.
- HANDSOME remains the text brand in the logo position.
- Flatter, squarer card and form styling to match a trade/corporate internal tool.
- Red is used sparingly for active states, priority, alerts and key emphasis.
- No Howdens logo or copyrighted logo artwork is included.

V10 additions
- Lead workflow stages: Open, Contacted, Quoted, Awaiting decision, Won, Lost, On hold.
- Lost leads require a reason when edited to Lost.
- Follow-up management includes snooze by 2 days and overdue/today views.
- Lead ageing buckets: 0–7, 8–14, 15–28, 29+ days.
- Pipeline value and margin by lead stage.
- Customer opportunity scores and lead opportunity scores.
- Kitchen and Joinery performance: lead count, value, margin, win rate, average value.
- Staff targets: calls/day, conversations/day, leads/period, pipeline £, margin £.
- Period targets: sales £, margin £, lead count, customer-contact %.
- Manager target progress dashboards.
- Reason codes for unsuccessful calls / lost opportunities.
- Best time to call a customer inferred from recorded successful call history.
- Manager intervention list for overdue leads, aged leads, high-value leads with no follow-up, and staff overdue workload.
- Strict 6-digit quotation number validation.
- Quote number is required for quote-created leads.

V11 additions
- One-tap standard notes for spoke-to-customer and voicemail outcomes.
- Multiple quick notes can be combined before saving.
- Free-text notes remain available.
- Default notes include Rooster offers, P21 kitchen message, Trade Day, kitchen offers, joinery offers, project discussion and callback/no-work messages.
- Managers can edit the standard note lists in Settings; changes require manager PIN.

V12 workflow release
- New Account Nurture: four successful conversations while under 60 days / under three trades.
- Old Account Nurture: P12-P14 rescue sequence with manager-defined offers and spacing.
- Given Thanks: manager-set 30-day spend threshold with recent transaction context.
- Top 20 customer priority list with manager-defined period message.
- Single next-best-action suppression so nurture queues do not duplicate normal calls.
- Why-am-I-calling banner and workflow detail on customer screen.
- Given Thanks / nurture-specific one-tap notes.
- Survey booked outcome.
- Manager-defined daily targets for calls, conversations, leads and surveys.
- Monday-Friday target streak history with target-complete notification.
- Manager nurture and streak reporting.
