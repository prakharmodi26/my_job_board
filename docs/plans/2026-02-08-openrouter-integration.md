# OpenRouter Integration + UI Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add OpenRouter as a third AI provider for cover letter generation, showing only free models in a dropdown, add gemma3-12b as a standalone option, remove PDF download, and fix copy text.

**Architecture:** Backend gets a new route to proxy the OpenRouter `/models` endpoint and filter for free models (pricing.prompt === "0" && pricing.completion === "0"). The cover letter generation route gets a new branch for OpenRouter that uses the OpenAI-compatible `/chat/completions` endpoint at `https://openrouter.ai/api/v1`. Settings store both the provider type and the selected OpenRouter model ID. Frontend settings page gets a new "OpenRouter" section with a searchable dropdown. The `coverLetterModel` field expands to store values like `"openrouter:modelid"` for OpenRouter models.

**Tech Stack:** Express.js backend, Next.js 15 frontend, PostgreSQL/Prisma, OpenRouter API (OpenAI-compatible), Tailwind CSS

---

### Task 1: Add OpenRouter API Key to Environment Config

**Files:**
- Modify: `.env.example:10-11`

**Step 1: Add the new env var to .env.example**

Add after the `GOOGLE_API_KEY` line:

```
# OpenRouter API (for cover letter generation with any free model)
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

**Step 2: Add the key to your local .env file**

Add your actual OpenRouter API key to `.env`.

**Step 3: Commit**

```bash
git add .env.example
git commit -m "feat: add OpenRouter API key to env config"
```

---

### Task 2: Add Backend Route to Fetch Free OpenRouter Models

**Files:**
- Create: `backend/src/routes/openrouter.ts`
- Modify: `backend/src/index.ts:17,55`

**Step 1: Create the openrouter route file**

Create `backend/src/routes/openrouter.ts`:

```typescript
import { Router } from "express";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || "";

export const openrouterRouter = Router();

interface OpenRouterModel {
  id: string;
  name: string;
  pricing: {
    prompt: string;
    completion: string;
    request: string;
    image: string;
  };
  context_length: number | null;
  architecture: {
    modality: string;
    input_modalities: string[];
    output_modalities: string[];
  };
}

// GET /api/openrouter/models — returns only free models
openrouterRouter.get("/models", async (_req, res) => {
  try {
    const response = await fetch(`${OPENROUTER_BASE}/models`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[OpenRouter] Models API error ${response.status}: ${text}`);
      res.status(response.status).json({ error: `OpenRouter API error: ${response.status}` });
      return;
    }

    const data = await response.json();
    const models: OpenRouterModel[] = data.data || [];

    // Filter for free models: prompt and completion pricing are both "0"
    // Also filter for text-output models only (no image generators)
    const freeModels = models
      .filter((m: OpenRouterModel) => {
        const isFree =
          parseFloat(m.pricing?.prompt || "1") === 0 &&
          parseFloat(m.pricing?.completion || "1") === 0;
        const isTextOutput =
          m.architecture?.output_modalities?.includes("text") ?? true;
        return isFree && isTextOutput;
      })
      .map((m: OpenRouterModel) => ({
        id: m.id,
        name: m.name,
        context_length: m.context_length,
      }))
      .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));

    res.json({ models: freeModels });
  } catch (err) {
    console.error("[OpenRouter] Failed to fetch models:", err);
    res.status(502).json({ error: "Failed to fetch OpenRouter models" });
  }
});
```

**Step 2: Register the route in index.ts**

In `backend/src/index.ts`, add the import after line 17:

```typescript
import { openrouterRouter } from "./routes/openrouter.js";
```

Add the route after line 55 (after the cover letter route):

```typescript
app.use("/api/openrouter", authMiddleware, openrouterRouter);
```

**Step 3: Verify the backend compiles**

Run: `cd /Users/prakharmodi/Projects/playground/my_job_board && npm run build --workspace=backend` (or equivalent)

If there's no build script, just verify no TypeScript errors with: `npx tsc --noEmit --project backend/tsconfig.json`

**Step 4: Commit**

```bash
git add backend/src/routes/openrouter.ts backend/src/index.ts
git commit -m "feat: add backend route to fetch free OpenRouter models"
```

---

### Task 3: Add OpenRouter Chat Completion to Cover Letter Backend

**Files:**
- Modify: `backend/src/routes/coverLetter.ts:1-213`

**Step 1: Add OpenRouter constants and API call function**

In `backend/src/routes/coverLetter.ts`, after line 11 (the GEMINI_MODEL line), add:

```typescript
// OpenRouter API (OpenAI-compatible)
const OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || "";
```

After the `callGeminiApi` function (after line 137), add:

```typescript
// Call OpenRouter API (OpenAI-compatible format)
async function callOpenRouterApi(
  modelId: string,
  chatMessages: { role: string; content: string }[]
): Promise<string> {
  if (!OPENROUTER_KEY) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set.");
  }

  const response = await fetch(OPENROUTER_BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelId,
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[CoverLetter] OpenRouter API error ${response.status}: ${text}`);
    throw new Error(`OpenRouter API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}
```

**Step 2: Update the model routing logic in the POST handler**

Replace the model routing block (lines 197-205) with:

```typescript
    let coverLetter: string;

    if (selectedModel === "gemini") {
      coverLetter = await callGeminiApi(systemPrompt, chatMessages);
    } else if (selectedModel.startsWith("openrouter:")) {
      const openRouterModelId = selectedModel.replace("openrouter:", "");
      coverLetter = await callOpenRouterApi(openRouterModelId, chatMessages);
    } else {
      // Default to VT ARC
      coverLetter = await callVtArcApi(chatMessages);
    }
```

**Step 3: Commit**

```bash
git add backend/src/routes/coverLetter.ts
git commit -m "feat: add OpenRouter chat completion support for cover letters"
```

---

### Task 4: Add Gemma 3 12B as Standalone Model Option

**Files:**
- Modify: `backend/src/routes/coverLetter.ts` (model routing)

**Step 1: Update the model routing to handle gemma3-12b**

The model routing block should now be:

```typescript
    let coverLetter: string;

    if (selectedModel === "gemini") {
      coverLetter = await callGeminiApi(systemPrompt, chatMessages);
    } else if (selectedModel === "gemma3-12b") {
      // Gemma 3 12B uses the same Gemini API
      coverLetter = await callGeminiApi(systemPrompt, chatMessages);
    } else if (selectedModel.startsWith("openrouter:")) {
      const openRouterModelId = selectedModel.replace("openrouter:", "");
      coverLetter = await callOpenRouterApi(openRouterModelId, chatMessages);
    } else {
      // Default to VT ARC
      coverLetter = await callVtArcApi(chatMessages);
    }
```

Note: `gemini` and `gemma3-12b` both use the same Gemini API with the same model (`gemma-3-12b-it`), so we reuse `callGeminiApi`. The user wants gemma3-12b listed as a separate explicit option alongside vt-arc.

**Step 2: Commit**

```bash
git add backend/src/routes/coverLetter.ts
git commit -m "feat: add gemma3-12b as standalone model option"
```

---

### Task 5: Update Settings Page — Restructure Model Selection UI

**Files:**
- Modify: `frontend/src/app/(app)/settings/page.tsx:183-659`

**Step 1: Update the COVER_LETTER_MODELS constant**

Replace lines 183-194 with:

```typescript
const COVER_LETTER_MODELS = [
  {
    value: "vt-arc",
    label: "VT ARC — GPT-OSS-120B",
    description: "Requires VT network/VPN and VT_ARC_KEY",
  },
  {
    value: "gemini",
    label: "Google Gemma 3 — Gemma 3 12B",
    description: "Requires GOOGLE_API_KEY",
  },
  {
    value: "gemma3-12b",
    label: "Gemma 3 12B Instruct",
    description: "Requires GOOGLE_API_KEY (same API, explicit model choice)",
  },
];
```

**Step 2: Add state for OpenRouter models and selection**

After the `coverLetterModel` state (line 226), add:

```typescript
  // OpenRouter
  const [openRouterModels, setOpenRouterModels] = useState<
    { id: string; name: string; context_length: number | null }[]
  >([]);
  const [openRouterLoading, setOpenRouterLoading] = useState(false);
  const [openRouterSearch, setOpenRouterSearch] = useState("");
```

**Step 3: Add a function to fetch OpenRouter models**

After the `fetchData` useCallback (after line 317), add:

```typescript
  const fetchOpenRouterModels = useCallback(async () => {
    setOpenRouterLoading(true);
    try {
      const data = await apiFetch<{
        models: { id: string; name: string; context_length: number | null }[];
      }>("/api/openrouter/models");
      setOpenRouterModels(data.models);
    } catch (err) {
      console.error("Failed to fetch OpenRouter models:", err);
    } finally {
      setOpenRouterLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOpenRouterModels();
  }, [fetchOpenRouterModels]);
```

**Step 4: Update the Cover Letter Model section UI**

Replace the Cover Letter Model `<Section>` block (lines 623-659) with:

```tsx
        {/* ==================== Cover Letter Model ==================== */}
        <Section title="Cover Letter Model">
          <p className="text-sm text-gray-500 -mt-2 mb-3">
            Select the AI model used for generating cover letters.
          </p>

          {/* Built-in models */}
          <div className="space-y-3">
            {COVER_LETTER_MODELS.map((model) => (
              <label
                key={model.value}
                className={cn(
                  "flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors",
                  coverLetterModel === model.value
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="radio"
                  name="coverLetterModel"
                  value={model.value}
                  checked={coverLetterModel === model.value}
                  onChange={() => setCoverLetterModel(model.value)}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 mt-0.5"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {model.label}
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {model.description}
                  </p>
                </div>
              </label>
            ))}

            {/* OpenRouter section */}
            <label
              className={cn(
                "flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors",
                coverLetterModel.startsWith("openrouter:")
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <input
                type="radio"
                name="coverLetterModel"
                value="openrouter"
                checked={coverLetterModel.startsWith("openrouter:")}
                onChange={() => {
                  // Select first available model or keep current
                  if (!coverLetterModel.startsWith("openrouter:") && openRouterModels.length > 0) {
                    setCoverLetterModel(`openrouter:${openRouterModels[0].id}`);
                  }
                }}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 mt-0.5"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">
                  OpenRouter — Free Models
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Requires OPENROUTER_API_KEY. Access hundreds of free AI models.
                </p>

                {coverLetterModel.startsWith("openrouter:") && (
                  <div className="mt-3">
                    <input
                      type="text"
                      value={openRouterSearch}
                      onChange={(e) => setOpenRouterSearch(e.target.value)}
                      placeholder="Search models..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow mb-2"
                    />
                    {openRouterLoading ? (
                      <div className="flex items-center gap-2 py-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                        <span className="text-xs text-gray-500">Loading models...</span>
                      </div>
                    ) : (
                      <select
                        value={coverLetterModel.replace("openrouter:", "")}
                        onChange={(e) => setCoverLetterModel(`openrouter:${e.target.value}`)}
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {openRouterModels
                          .filter((m) =>
                            m.name.toLowerCase().includes(openRouterSearch.toLowerCase()) ||
                            m.id.toLowerCase().includes(openRouterSearch.toLowerCase())
                          )
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.id})
                            </option>
                          ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
            </label>
          </div>
        </Section>
```

**Step 5: Verify the frontend compiles**

Run: `cd /Users/prakharmodi/Projects/playground/my_job_board && npm run build --workspace=frontend`

**Step 6: Commit**

```bash
git add frontend/src/app/(app)/settings/page.tsx
git commit -m "feat: add OpenRouter dropdown and gemma3-12b to settings UI"
```

---

### Task 6: Update Settings Backend to Accept OpenRouter Model Values

**Files:**
- Modify: `backend/src/routes/settings.ts:55`

The existing backend already accepts any string for `coverLetterModel` (line 55), and uses a generic field copy loop. No changes needed here — values like `"openrouter:google/gemma-3-27b-it:free"` are already handled.

Verify by reading the file. If the field is already in the `fields` array at line 55, this task is done.

**Step 1: Verify — no changes needed**

The `settings.ts` route already has `"coverLetterModel"` in the fields array (line 55) and copies any value from the request body. No modification required.

**Step 2: Commit (skip if no changes)**

No commit needed.

---

### Task 7: Remove Download PDF Button and html2pdf Dependency

**Files:**
- Modify: `frontend/src/components/jobs/CoverLetterPanel.tsx:90-102,134-139`
- Modify: `frontend/package.json:11`

**Step 1: Remove the handleDownloadPdf function**

Delete lines 90-102 (the `handleDownloadPdf` function):

```typescript
// DELETE THIS:
  async function handleDownloadPdf() {
    if (!latestCoverLetter || !coverLetterRef.current) return;
    const html2pdf = (await import("html2pdf.js")).default;
    html2pdf()
      .set({
        margin: [20, 20, 20, 20],
        filename: `Cover_Letter_${job.company.replace(/\s+/g, "_")}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(coverLetterRef.current)
      .save();
  }
```

**Step 2: Remove the Download PDF button from JSX**

Delete lines 134-139 (the Download PDF button):

```tsx
// DELETE THIS:
            <button
              onClick={handleDownloadPdf}
              className="text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              Download PDF
            </button>
```

**Step 3: Remove the coverLetterRef since it was only used for PDF**

Delete the `coverLetterRef` declaration (line 26):

```typescript
// DELETE THIS:
  const coverLetterRef = useRef<HTMLDivElement>(null);
```

Remove the `useRef` import from line 2 (keep only `useState` and `useEffect`):

```typescript
import { useState, useEffect } from "react";
```

Remove the `ref` attribute from the assistant message div (line 184):

```tsx
// CHANGE FROM:
              <div ref={i === messages.length - 1 && msg.role === "assistant" ? coverLetterRef : undefined}>
// TO:
              <div>
```

**Step 4: Remove html2pdf.js dependency**

```bash
cd /Users/prakharmodi/Projects/playground/my_job_board/frontend && npm uninstall html2pdf.js
```

**Step 5: Commit**

```bash
git add frontend/src/components/jobs/CoverLetterPanel.tsx frontend/package.json frontend/package-lock.json
git commit -m "feat: remove download PDF button and html2pdf dependency"
```

---

### Task 8: Fix Copy Text Button

**Files:**
- Modify: `frontend/src/components/jobs/CoverLetterPanel.tsx:83-88`

**Step 1: Diagnose the issue**

The current `handleCopy` function at line 83-88 uses `navigator.clipboard.writeText()` which can fail silently in non-HTTPS contexts or when the page isn't focused. The `latestCoverLetter` variable (line 28) searches messages in reverse for the last assistant message, which should work.

The likely issue: `navigator.clipboard.writeText` returns a Promise but the function doesn't handle rejection. Also, in some environments (HTTP localhost), the Clipboard API may not be available.

**Step 2: Fix handleCopy with fallback**

Replace the `handleCopy` function (lines 83-88) with:

```typescript
  async function handleCopy() {
    if (!latestCoverLetter) return;
    try {
      await navigator.clipboard.writeText(latestCoverLetter);
    } catch {
      // Fallback for HTTP or unfocused contexts
      const textarea = document.createElement("textarea");
      textarea.value = latestCoverLetter;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
```

**Step 3: Commit**

```bash
git add frontend/src/components/jobs/CoverLetterPanel.tsx
git commit -m "fix: copy text button with clipboard API fallback"
```

---

### Task 9: Update TypeScript Types

**Files:**
- Modify: `frontend/src/lib/types.ts:95`

**Step 1: Verify the Settings type**

The `coverLetterModel` field at line 95 is already typed as `string`, which accommodates values like `"openrouter:model-id"`. No change needed.

**Step 2: Commit (skip if no changes)**

No commit needed.

---

### Task 10: Update Database Schema (if needed)

**Files:**
- Verify: `prisma/schema.prisma:89`

**Step 1: Verify**

The `coverLetterModel` field at line 89 is `String @default("vt-arc")`. Since OpenRouter model IDs like `"openrouter:google/gemma-3-27b-it:free"` are just strings, no schema change is needed.

**Step 2: Commit (skip if no changes)**

No commit needed.

---

### Task 11: End-to-End Manual Verification

**Step 1: Start the backend and frontend**

```bash
cd /Users/prakharmodi/Projects/playground/my_job_board && npm run dev
```

**Step 2: Verify Settings Page**

- Navigate to Settings
- Confirm VT ARC, Google Gemma 3, and Gemma 3 12B radio buttons appear
- Confirm OpenRouter radio button appears with a dropdown
- Select OpenRouter — confirm dropdown loads free models
- Search for a model in the search box
- Select a model and save settings

**Step 3: Verify Cover Letter Generation**

- Navigate to a job
- Click Cover Letter button
- Confirm cover letter generates with the selected model
- Try with each model type (VT ARC, Gemini, OpenRouter)

**Step 4: Verify PDF button is gone**

- Open cover letter panel
- Confirm only "Copy Text" button appears (no "Download PDF")

**Step 5: Verify Copy Text works**

- Generate a cover letter
- Click "Copy Text"
- Paste in a text editor to confirm content copied correctly
- Confirm "Copied!" feedback appears for 2 seconds

---

### Summary of All Changes

| Area | Change |
|------|--------|
| `.env.example` | Add `OPENROUTER_API_KEY` |
| `backend/src/routes/openrouter.ts` | New — fetches and filters free models |
| `backend/src/routes/coverLetter.ts` | Add `callOpenRouterApi()`, update routing for `openrouter:*` and `gemma3-12b` |
| `backend/src/index.ts` | Register `/api/openrouter` route |
| `frontend/src/app/(app)/settings/page.tsx` | Add OpenRouter dropdown, gemma3-12b option, search filter |
| `frontend/src/components/jobs/CoverLetterPanel.tsx` | Remove PDF button + ref, fix copy with fallback |
| `frontend/package.json` | Remove `html2pdf.js` dependency |
