const API_BASE = "https://jsearch.p.rapidapi.com";

const rawKeys =
  process.env.JSEARCH_API_KEYS ||
  process.env.JSEARCH_API_KEY ||
  "";

const API_KEYS = rawKeys
  .split(/[,\s]+/)
  .map((k) => k.trim())
  .filter(Boolean);

let keyIndex = 0;

function getNextKey(): string {
  if (API_KEYS.length === 0) {
    throw new Error("JSearch API key not configured (set JSEARCH_API_KEYS or JSEARCH_API_KEY)");
  }
  const key = API_KEYS[keyIndex];
  keyIndex = (keyIndex + 1) % API_KEYS.length;
  return key;
}

function logKeyUsage(idx: number) {
  console.log(`[JSearch]   Using key index: ${idx}`);
}

export interface JSearchParams {
  query: string;
  page?: number;
  num_pages?: number;
  country?: string;
  language?: string;
  date_posted?: string;
  work_from_home?: boolean;
  employment_types?: string;
  job_requirements?: string;
  radius?: number;
  exclude_job_publishers?: string;
}

export interface JSearchJob {
  job_id: string;
  job_title: string;
  employer_name: string;
  employer_logo: string | null;
  employer_website: string | null;
  job_publisher: string;
  job_employment_type: string;
  job_employment_types: string[];
  job_apply_link: string;
  job_apply_is_direct: boolean;
  apply_options: { publisher: string; apply_link: string; is_direct: boolean }[];
  job_description: string;
  job_is_remote: boolean | null;
  job_posted_at: string | null;
  job_posted_at_timestamp: number | null;
  job_posted_at_datetime_utc: string | null;
  job_location: string;
  job_city: string | null;
  job_state: string | null;
  job_country: string;
  job_latitude: number | null;
  job_longitude: number | null;
  job_benefits: string[] | null;
  job_google_link: string;
  job_min_salary: number | null;
  job_max_salary: number | null;
  job_salary_period: string | null;
  job_highlights: {
    Qualifications?: string[];
    Benefits?: string[];
    Responsibilities?: string[];
  } | null;
  job_salary: number | null;
}

export interface JSearchResponse {
  status: string;
  request_id: string;
  parameters: Record<string, unknown>;
  data: JSearchJob[];
}

export async function searchJobs(
  params: JSearchParams
): Promise<JSearchResponse> {
  if (API_KEYS.length === 0) {
    throw new Error("JSearch API key not configured (set JSEARCH_API_KEYS or JSEARCH_API_KEY)");
  }

  const url = new URL(`${API_BASE}/search`);
  url.searchParams.set("query", params.query);
  if (params.page) url.searchParams.set("page", String(params.page));
  if (params.num_pages)
    url.searchParams.set("num_pages", String(params.num_pages));
  if (params.country) url.searchParams.set("country", params.country);
  if (params.language) url.searchParams.set("language", params.language);
  if (params.date_posted)
    url.searchParams.set("date_posted", params.date_posted);
  if (params.work_from_home)
    url.searchParams.set("work_from_home", "true");
  if (params.employment_types)
    url.searchParams.set("employment_types", params.employment_types);
  if (params.job_requirements)
    url.searchParams.set("job_requirements", params.job_requirements);
  if (params.radius) url.searchParams.set("radius", String(params.radius));
  if (params.exclude_job_publishers)
    url.searchParams.set(
      "exclude_job_publishers",
      params.exclude_job_publishers
    );

  console.log(`[JSearch] → GET ${url.toString()}`);

  const attempts = API_KEYS.length;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const idx = keyIndex;
    const key = getNextKey();
    logKeyUsage(idx);

    const start = Date.now();
    const res = await fetch(url.toString(), {
      headers: {
        "x-rapidapi-key": key,
        "x-rapidapi-host": "jsearch.p.rapidapi.com",
      },
    });
    const ms = Date.now() - start;

    if (res.ok) {
      const json: JSearchResponse = await res.json();
      console.log(
        `[JSearch] ← ${res.status} OK (${ms}ms) — ${json.data?.length ?? 0} jobs, status="${json.status}", request_id=${json.request_id}`
      );
      return json;
    }

    const text = await res.text();
    const isQuota =
      res.status === 429 ||
      text.toLowerCase().includes("quota") ||
      text.toLowerCase().includes("usage limit");

    console.error(`[JSearch] ← ${res.status} FAILED (${ms}ms): ${text}`);

    if (!isQuota || attempt === attempts - 1) {
      throw new Error(`JSearch API error ${res.status}: ${text}`);
    }

    // Quota hit: try next key
    console.warn(
      `[JSearch] Quota hit on key index ${idx}; rotating to next key (${attempt + 1}/${attempts})`
    );
  }

  throw new Error("JSearch API quota exhausted across all configured keys");
}
