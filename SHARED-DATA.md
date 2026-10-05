# Shared-data integration (activation pending)

This draft adds protected Vercel APIs for the existing single-file BDM frontend.
The single-file index.html now has gated Clerk sign-in, verified user identity,
shared reads/writes, explicit initial migration and save/retry/conflict controls.
BDM_SHARED_ENABLED is off by default; account setup is available at /connect.html.

## Completed

- Clerk session verification and a trusted mapping to existing BDM user IDs.
- Access denied until Clerk privateMetadata contains bdmUserId and bdmRole.
- One shared depot dataset, with per-user targets preserved by existing user IDs.
- Server-side restrictions on staff administration, call credit and lead credit.
- Version checks to reject stale concurrent saves.
- An atomic database backup and actor record with each successful save.
- Public config endpoint exposes only the publishable key.
- Separate connect.html account setup page uses Clerk's JavaScript SDK. It does
  not expose customer data or replace the existing frontend's PIN system yet.

## Remaining integration

1. Install dependencies and run `npm test`.
2. Run db/schema.sql on an isolated Neon test branch first.
3. Create the owner's Clerk login, then securely link privateMetadata to the
   existing manager ID (normally U1) and bdmRole=manager. Do not auto-authorise
   the first public sign-up. Staff logins need their own existing IDs and role=staff.
4. Test the inlined JavaScript Clerk sign-in and shared storage flow in index.html,
   then set BDM_SHARED_ENABLED=true only once the owner is securely linked.
5. Download the browser backup, validate it, then upload it through PUT /api/shared
   with revision=0 as the linked manager. Do not erase the browser backup.
6. Test authenticated GET/PUT requests and migration. Save status remains pending
   until the server confirms; unsaved work stays in memory and can be downloaded.
   Conflicting saves are blocked, with explicit backup and reload controls.
   Shared backup restore is currently disabled pending a reviewed restore flow.
7. Verify sign-in/sign-out, revocation, two devices, conflict handling, interrupted
   saves, backup retrieval and user target isolation before production activation.

## Environment

Vercel already supplies CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and
DATABASE_URL. Never put the database URL or secret key into frontend code.
BDM_ALLOWED_ORIGINS defaults to https://bdm.semtexgym.com. For an isolated preview,
set its exact origin explicitly and use the preview Clerk keys and separate Neon
branch. Verify Neon isolation before running schema or migration commands.

BDM_BOOTSTRAP_MANAGER_EMAIL optionally permits one explicitly configured verified
primary email to link to the legacy manager ID on its first authenticated request.
The email is server configuration, never a client parameter. Existing/revoked
metadata is not overwritten. Remove the bootstrap environment variable after the
owner's mapping is confirmed. BDM_BOOTSTRAP_MANAGER_USER_ID defaults to U1.

GET /api/config returns the publishable key. GET /api/shared requires a Clerk
Bearer session token. PUT takes `{revision, data}` and returns the new revision.
403 means access is unlinked/inactive; 409 means the client must reload/reconcile.
Unknown data keys and non-manager report/settings writes are rejected.
Backups are full snapshots per save; add retention and tested restore tooling
before using this with sustained real customer traffic.
