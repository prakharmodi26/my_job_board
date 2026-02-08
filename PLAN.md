# Plan: Jobby Refactor — Profile Cleanup, Settings Page, Scoring Controls, Username Auth, Rebranding

## Overview
Major refactor covering: profile simplification, new Settings page, user-controllable scoring weights, OPT/CPT boost in scoring, cron schedule configuration, email-to-username auth migration, and MyJobBoard-to-Jobby rename.

---

## Step 1: Prisma Schema Changes

### 1a: User model — email to username
**File:** `prisma/schema.prisma`
- Rename `email` field to `username` on User model
- Change `@unique` constraint to `username`
- Keep `passwordHash`, `createdAt`, `updatedAt` as-is

### 1b: Profile model — remove deprecated fields
**File:** `prisma/schema.prisma`
- **Remove:** `primarySkills`, `secondarySkills`, `workAuthorization`, `locationRadius`, `timezonePreference`
- These are redundant: skills covered by `skills[]`, location covered by `preferredLocations[]`, workAuth unused in scoring
- **Also remove (moved to Settings):** `searchNumPages`, `recommendedNumPages`, `recommendedDatePosted`, `excludePublishers`
- Keep all other fields intact

### 1c: New Settings model
**File:** `prisma/schema.prisma`
```prisma
model Settings {
  id                      Int      @id @default(autoincrement())

  // Scoring weights (all default to current hardcoded values)
  weightSkillMatch        Int      @default(10)
  weightTargetTitle       Int      @default(10)
  weightRecencyDay1       Int      @default(30)
  weightRecencyDay3       Int      @default(20)
  weightRecencyWeek       Int      @default(10)
  weightRemoteMatch       Int      @default(15)
  weightWorkModeMatch     Int      @default(10)
  weightOnsiteMatch       Int      @default(5)
  weightSeniorityMatch    Int      @default(20)
  weightSeniorityMismatch Int      @default(-15)
  weightSalaryOverlap     Int      @default(15)
  weightSalaryBelow       Int      @default(-20)
  weightIndustryMatch     Int      @default(10)
  weightEducationMeet     Int      @default(5)
  weightEducationUnder    Int      @default(-10)
  weightCompanySize       Int      @default(10)
  weightExpMeet           Int      @default(10)
  weightExpClose          Int      @default(5)
  weightExpUnder          Int      @default(-15)
  weightCitizenship       Int      @default(-50)
  weightOptCptBoost       Int      @default(20)

  // Cron schedule (default: every 12 hours = 2x/day)
  cronSchedule            String   @default("0 */12 * * *")

  // Search settings (moved from Profile)
  searchNumPages          Int      @default(5)
  recommendedNumPages     Int      @default(3)
  recommendedDatePosted   String   @default("week")
  excludePublishers       String[] @default([])

  updatedAt               DateTime @updatedAt
}
```

### 1d: Run migration
```bash
npx prisma migrate dev --name "jobby-refactor"
```
Handle User `email` to `username` rename carefully in the migration SQL with `ALTER TABLE ... RENAME COLUMN`.

---

## Step 2: Backend Auth — email to username

### 2a: Auth middleware
**File:** `backend/src/middleware/auth.ts`
- Change `AuthPayload` interface: `email: string` to `username: string`
- Update `req.user` type

### 2b: Auth routes
**File:** `backend/src/routes/auth.ts`
- **POST /login**: Accept `username` + `password` (not email). Find user by `username`. JWT payload: `{ username, userId }`. Return `{ success: true, username }`.
- **GET /me**: Return `{ username: req.user!.username }`
- **Rename PATCH /email to PATCH /username**: Accept `username` in body. Update User's `username` field. Re-issue JWT with new username.
- **PATCH /password**: Change `req.user!.email` to `req.user!.username` for user lookup

---

## Step 3: Backend — Settings Routes

### 3a: New settings router
**File:** `backend/src/routes/settings.ts` (NEW)
- **GET /api/settings**: Load Settings (findFirst or create with defaults if none exists)
- **PUT /api/settings**: Update all Settings fields using data-driven loop

### 3b: Mount route
**File:** `backend/src/index.ts`
- Import and mount `settingsRouter` at `/api/settings` (protected with authMiddleware)

---

## Step 4: Backend — Scoring Refactor

### 4a: Load weights from Settings
**File:** `backend/src/services/scoring.ts`
- Change `scoreJob(job, profile)` to `scoreJob(job, profile, weights)` where `weights` is the Settings object
- Replace all hardcoded point values with `weights.weightXxx`
- **Remove primary/secondary skill distinction**: Use flat `profile.skills[]` scored at `weights.weightSkillMatch` per match (since primary/secondary removed from Profile)
- **Add OPT/CPT/F1 boost**: New patterns:
  ```
  /\bopt\b/i, /\bcpt\b/i, /\bf[\-\s]?1\b/i,
  /\bopen\s*to\s*(?:opt|cpt)/i,
  /\binternational\s*students?\s*(?:welcome|accepted|eligible)/i,
  /\bvisa\s*sponsor/i
  ```
  If any match found AND `profile.citizenshipNotRequired` is true: add `weights.weightOptCptBoost` (default +20)
- **Citizenship logic stays the same**: Penalize if citizenship patterns found AND `citizenshipNotRequired=true`. No penalty if job says nothing about citizenship. Use `weights.weightCitizenship` instead of hardcoded -50.

### 4b: Update callers
**Files:** `backend/src/routes/jobs.ts`, `backend/src/services/recommendedRunner.ts`
- Load Settings alongside Profile wherever `scoreJob` is called
- Pass weights to `scoreJob(job, profile, settings)`

---

## Step 5: Backend — Cron Schedule from Settings

### 5a: Dynamic cron schedule
**File:** `backend/src/scheduler/cron.ts`
- On startup, load Settings to get `cronSchedule` (default: `"0 */12 * * *"` = every 12 hours = 2x/day)
- Use that as the cron expression
- Export a `restartScheduler()` function that stops current cron task and creates a new one

### 5b: Restart cron on settings change
**File:** `backend/src/routes/settings.ts`
- After PUT /api/settings, if `cronSchedule` changed, call `restartScheduler()`

---

## Step 6: Backend — Profile Route Cleanup

**File:** `backend/src/routes/profile.ts`
- Remove from fields array: `primarySkills`, `secondarySkills`, `workAuthorization`, `locationRadius`, `timezonePreference`, `searchNumPages`, `recommendedNumPages`, `recommendedDatePosted`, `excludePublishers`

---

## Step 7: Backend — Recommended Runner Cleanup

**File:** `backend/src/services/recommendedRunner.ts`
- Load Settings for `recommendedNumPages`, `recommendedDatePosted`, `excludePublishers` (previously from Profile)
- Remove `primarySkills` query construction — use `profile.skills` instead for skill-based queries
- Pass Settings to `scoreJob` calls

---

## Step 8: Frontend Types Update

**File:** `frontend/src/lib/types.ts`
- **Profile interface**: Remove `primarySkills`, `secondarySkills`, `workAuthorization`, `locationRadius`, `timezonePreference`, `searchNumPages`, `recommendedNumPages`, `recommendedDatePosted`, `excludePublishers`
- **Add Settings interface** matching the Prisma model

---

## Step 9: Frontend — useAuth Hook Update

**File:** `frontend/src/hooks/useAuth.ts`
- Change user type: `{ email: string }` to `{ username: string }`
- Update `/api/auth/me` response type

---

## Step 10: Frontend — Profile Page Cleanup

**File:** `frontend/src/app/(app)/profile/page.tsx`
- **Remove sections:** Skills (Primary/Secondary), Location (radius/timezone), Search Settings, Account Settings, Work Authorization input
- **Remove all related state variables**
- **Remove from save payload:** all removed fields
- **Keep:** Core targeting (targetTitles, skills, preferredLocations, remotePreferred, citizenshipNotRequired), Role Preferences, Compensation, Education, Industry & Company, Recommended Pull button

---

## Step 11: Frontend — New Settings Page

**File:** `frontend/src/app/(app)/settings/page.tsx` (NEW)

**Sections:**

1. **Account** — Username change + Password change (moved from profile)
2. **Search Settings** — searchNumPages, recommendedNumPages, recommendedDatePosted, excludePublishers (moved from profile)
3. **Cron Schedule** — Dropdown with presets: "Every 6 hours", "Every 12 hours (default)", "Every 24 hours", plus custom cron expression input
4. **Scoring Weights** — Grouped number inputs with +/- steppers:
   - *Skills & Keywords*: Skill match (default 10), Target title (default 10)
   - *Recency*: Day-1 boost (30), Day-3 boost (20), Week boost (10)
   - *Work Mode*: Remote match (15), Work mode match (10), Onsite match (5)
   - *Seniority*: Match bonus (20), Mismatch penalty (-15)
   - *Salary*: Overlap bonus (15), Below-minimum penalty (-20)
   - *Industry*: Match weight (10)
   - *Education*: Meet bonus (5), Under-qualified penalty (-10)
   - *Company Size*: Match weight (10)
   - *Experience*: Meet bonus (10), Close bonus (5), Under penalty (-15)
   - *Visa/Citizenship*: Citizenship penalty (-50), OPT/CPT boost (20)
   - **"Reset to Defaults"** button
5. **Save Settings** button at bottom

---

## Step 12: Frontend — Sidebar & Branding Update

### 12a: Sidebar
**File:** `frontend/src/components/Sidebar.tsx`
- Change "MyJobBoard" to "Jobby"
- Change `{user.email}` to `{user.username}`
- Add Settings link `{ href: "/settings", label: "Settings", icon: "⚙️" }` in the bottom section next to Logout

### 12b: Root layout metadata
**File:** `frontend/src/app/layout.tsx`
- Change title: "MyJobBoard" to "Jobby"
- Update description

### 12c: Login page
**File:** `frontend/src/app/(auth)/login/page.tsx`
- "MyJobBoard" to "Jobby"
- Email input to Username input (`type="text"`, label "Username")
- Send `{ username, password }` to login endpoint

---

## Step 13: Verification

- Run `npx tsc --noEmit` in backend
- Run `npx tsc --noEmit` in frontend
- Verify no references to removed fields remain

---

## Execution Batches

**Batch 1** (Schema + Backend): Steps 1, 2, 3, 4, 5, 6, 7

**Batch 2** (Frontend): Steps 8, 9, 10, 11, 12

**Batch 3** (Verification): Step 13

---

## Key Decisions

1. **Skills scoring after removing primary/secondary**: All skills in `profile.skills[]` scored equally at `weights.weightSkillMatch` (default 10pts). No more primary/secondary distinction.

2. **OPT/CPT boost**: New positive scoring factor. If job description mentions OPT, CPT, F-1, "visa sponsor", or "international students welcome", AND user has `citizenshipNotRequired=true`, boost by `weightOptCptBoost` (default +20).

3. **Citizenship logic unchanged**: If `citizenshipNotRequired=true` and job requires citizenship/clearance, penalize. If job says nothing about citizenship, no effect. No penalty AND no boost.

4. **Cron default**: Changed from every 4 hours (6x/day) to every 12 hours (2x/day).

5. **Settings vs Profile separation**: Settings = "how the system behaves" (weights, cron, API params). Profile = "who you are as a job seeker" (skills, titles, preferences).

6. **Username not email**: Login, JWT, sidebar all switch from email to username. No email field.
