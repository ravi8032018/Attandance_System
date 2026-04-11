// src/_hooks/hod_dashboards_charts.ts
"use client";

import { Pie, Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
} from "chart.js";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title
);

/**
 * Student Distribution Pie Chart
 * Shows students distributed across semesters
 */
export function StudentDistributionPie({ data, h = 300, w = 400 }) {
  // data format: { semester: count, semester: count, ... }
  const labels = Object.keys(data || {}).sort();
  const values = labels.map((sem) => data[sem] || 0);

  const chartData = {
    labels: labels.map((sem) => `Sem ${sem}`),
    datasets: [
      {
        data: values,
        backgroundColor: [
          "#3b82f6", // blue
          "#8b5cf6", // purple
          "#ec4899", // pink
          "#f59e0b", // amber
          "#10b981", // emerald
          "#06b6d4", // cyan
          "#6366f1", // indigo
          "#eab308", // yellow
        ],
        borderWidth: 2,
        borderColor: "#fff",
      },
    ],
  };

  const options = {
    plugins: {
      legend: { position: "bottom" as const },
      tooltip: { enabled: true },
    },
    maintainAspectRatio: false,
  };

  return (
    <div style={{ height: `${h}px`, width: `${w}px` }}>
      <Pie data={chartData} options={options} />
    </div>
  );
}

/**
 * Attendance Trend Line Chart
 * Shows attendance percentage trends over 6 months
 */
export function AttendanceTrendLine({ data, h = 300, w = 800 }) {
  // data format: { month: percentage, month: percentage, ... }
  const months = Object.keys(data || {});
  const percentages = months.map((m) => data[m] || 0);

  const chartData = {
    labels: months,
    datasets: [
      {
        label: "Average Attendance %",
        data: percentages,
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        borderWidth: 3,
        pointRadius: 5,
        pointBackgroundColor: "#10b981",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const options = {
    plugins: {
      legend: { display: true },
      title: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { callback: (value: number) => `${value}%` },
      },
    },
    maintainAspectRatio: false,
  };

  return (
    <div style={{ height: `${h}px`, width: `${w}px` }}>
      <Line data={chartData} options={options} />
    </div>
  );
}

/**
 * Faculty Workload Bar Chart
 * Shows number of subjects assigned per faculty
 */
export function FacultyWorkloadBar({ data, h = 300, w = 600 }) {
  // data format: array of { name: string, subjects_assigned: number }
  const facultyNames = data.slice(0, 10).map((f) => `${f.first_name} ${f.last_name}`.substring(0, 15));
  const workloads = data.slice(0, 10).map((f) => f.subjects_assigned || 0);

  const chartData = {
    labels: facultyNames,
    datasets: [
      {
        label: "Subjects Assigned",
        data: workloads,
        backgroundColor: [
          "#3b82f6",
          "#8b5cf6",
          "#ec4899",
          "#f59e0b",
          "#10b981",
          "#06b6d4",
          "#6366f1",
          "#eab308",
          "#f97316",
          "#14b8a6",
        ],
        borderWidth: 1,
        borderColor: "#e5e7eb",
      },
    ],
  };

  const options = {
    indexAxis: "y" as const,
    plugins: {
      legend: { display: true },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { stepSize: 1 },
      },
    },
    maintainAspectRatio: false,
  };

  return (
    <div style={{ height: `${h}px`, width: `${w}px` }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}

/**
 * Department Attendance Distribution Pie
 * Shows Present vs Absent vs Excused distribution
 */
export function DepartmentAttendanceDistributionPie({
  present = 0,
  absent = 0,
  excused = 0,
  h = 300,
  w = 400,
}) {
  const chartData = {
    labels: ["Present", "Absent", "Excused"],
    datasets: [
      {
        data: [present, absent, excused],
        backgroundColor: ["#22c55e", "#ef4444", "#f59e0b"],
        borderWidth: 2,
        borderColor: "#fff",
      },
    ],
  };

  const options = {
    plugins: {
      legend: { position: "bottom" as const },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const total = present + absent + excused;
            const value = context.parsed;
            const percentage = ((value / total) * 100).toFixed(1);
            return `${context.label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
    maintainAspectRatio: false,
  };

  return (
    <div style={{ height: `${h}px`, width: `${w}px` }}>
      <Pie data={chartData} options={options} />
    </div>
  );
}

/**
 * Reusable Stat Card Component
 * Displays a metric with icon, value, label, and optional trend
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  bgColor = "bg-blue-50",
  iconColor = "text-blue-600",
  trend="",
  trendColor = "text-green-600",
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-xs hover:shadow-sm transition">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          {subtext && <p className="mt-1 text-xs text-slate-500">{subtext}</p>}
        </div>
        {Icon && (
          <div className={`rounded-lg ${bgColor} p-3`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
        )}
      </div>
      {trend && (
        <div className={`mt-3 text-xs font-medium ${trendColor}`}>
          {trend}
        </div>
      )}
    </div>
  );
}

/**
 * Alert Banner Component
 * Displays alerts about low attendance, etc.
 */
export function AlertBanner({
  severity = "warning", // info, warning, danger
  title,
  message,
  action,
  onAction,
}) {
  const colors = {
    info: "bg-blue-50 border-blue-200 text-blue-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    danger: "bg-red-50 border-red-200 text-red-800",
  };

  const iconColors = {
    info: "text-blue-500",
    warning: "text-amber-500",
    danger: "text-red-500",
  };

  return (
    <div className={`rounded-lg border ${colors[severity]} p-4`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-sm opacity-90">{message}</p>
        </div>
        {action && (
          <button
            onClick={onAction}
            className="ml-4 whitespace-nowrap rounded px-3 py-1.5 text-xs font-medium bg-opacity-20 bg-slate-800 hover:bg-opacity-30 transition"
          >
            {action}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Loading Skeleton for Chart
 */
export function ChartSkeleton({ h = 300, w = "100%" }) {
  return (
    <div
      style={{ height: h, width: w }}
      className="animate-pulse rounded-lg bg-slate-200"
    />
  );
}

/**
 * Color utility for attendance percentage
 */
export function attendanceStatusColor(percentage: number) {
  if (percentage >= 75) {
    return {
      bg: "bg-green-50",
      text: "text-green-700",
      bar: "bg-green-500",
      badge: "bg-green-100 text-green-700",
    };
  }
  if (percentage >= 60) {
    return {
      bg: "bg-amber-50",
      text: "text-amber-700",
      bar: "bg-amber-500",
      badge: "bg-amber-100 text-amber-700",
    };
  }
  return {
    bg: "bg-red-50",
    text: "text-red-700",
    bar: "bg-red-500",
    badge: "bg-red-100 text-red-700",
  };
}
