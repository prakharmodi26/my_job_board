"use client";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS: Record<string, string> = {
  saved: "#6B7280",
  applied: "#3B82F6",
  oa: "#F59E0B",
  interview: "#8B5CF6",
  offer: "#10B981",
  rejected: "#EF4444",
};

interface Props {
  data: { status: string; count: number }[];
}

export function StatusPieChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
        No saved jobs yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={65}
          outerRadius={100}
          dataKey="count"
          nameKey="status"
          paddingAngle={2}
          label={({ status, count }) => `${status}: ${count}`}
        >
          {data.map((entry) => (
            <Cell
              key={entry.status}
              fill={COLORS[entry.status] || "#6B7280"}
              strokeWidth={0}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [value, "Jobs"]}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #E5E7EB",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
          }}
        />
        <Legend
          formatter={(value: string) =>
            value.charAt(0).toUpperCase() + value.slice(1)
          }
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
