"use client";
import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import type { Job } from "@/lib/types";
import { JobCard } from "@/components/jobs/JobCard";
import { JobDetailPanel } from "@/components/jobs/JobDetailPanel";
import { cn } from "@/lib/utils";

const COUNTRY_OPTIONS = [
  { value: "us", label: "United States" },
  { value: "ca", label: "Canada" },
  { value: "gb", label: "United Kingdom" },
  { value: "de", label: "Germany" },
  { value: "in", label: "India" },
  { value: "au", label: "Australia" },
];

const DATE_OPTIONS = [
  { value: "", label: "Any time" },
  { value: "today", label: "Today" },
  { value: "3days", label: "Past 3 days" },
  { value: "week", label: "Past week" },
  { value: "month", label: "Past month" },
];

const EMPLOYMENT_TYPES = [
  { value: "FULLTIME", label: "Full-time" },
  { value: "PARTTIME", label: "Part-time" },
  { value: "CONTRACTOR", label: "Contract" },
  { value: "INTERN", label: "Intern" },
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("us");
  const [datePosted, setDatePosted] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const handleSearch = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!query.trim()) return;

      setLoading(true);
      setSearched(true);
      try {
        const params = new URLSearchParams({ query: query.trim(), country });
        if (datePosted) params.set("date_posted", datePosted);
        if (remoteOnly) params.set("work_from_home", "true");
        if (selectedTypes.length > 0)
          params.set("employment_types", selectedTypes.join(","));

        const res = await apiFetch<{ jobs: Job[]; total: number }>(
          `/api/jobs/search?${params}`
        );
        setJobs(res.jobs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [query, country, datePosted, remoteOnly, selectedTypes]
  );

  const handleSave = async (jobId: number) => {
    await apiFetch(`/api/jobs/${jobId}/save`, { method: "POST" });
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId ? { ...j, savedStatus: "saved" } : j
      )
    );
  };

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  return (
    <div>
      {/* Search form */}
      <form onSubmit={handleSearch} className="space-y-4 mb-6">
        {/* Query input */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Job title, keywords, or company..."
              className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Country */}
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          >
            {COUNTRY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Date posted */}
          <select
            value={datePosted}
            onChange={(e) => setDatePosted(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          >
            {DATE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Remote toggle */}
          <button
            type="button"
            onClick={() => setRemoteOnly(!remoteOnly)}
            className={cn(
              "text-sm px-3 py-2 rounded-lg border transition-colors",
              remoteOnly
                ? "bg-green-50 text-green-700 border-green-300"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            )}
          >
            Remote only
          </button>

          {/* Employment type chips */}
          {EMPLOYMENT_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => toggleType(type.value)}
              className={cn(
                "text-sm px-3 py-2 rounded-lg border transition-colors",
                selectedTypes.includes(type.value)
                  ? "bg-blue-50 text-blue-700 border-blue-300"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </form>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : searched && jobs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">No results found</p>
          <p className="text-gray-400 text-sm mt-1">
            Try different keywords or broaden your filters
          </p>
        </div>
      ) : jobs.length > 0 ? (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {jobs.length} result{jobs.length !== 1 ? "s" : ""}
          </p>
          <div className="grid gap-4">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onSave={handleSave}
                onClick={setSelectedJob}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">Search for jobs</p>
          <p className="text-gray-400 text-sm mt-1">
            Enter keywords above to search across thousands of job listings
          </p>
        </div>
      )}

      {selectedJob && (
        <JobDetailPanel
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
