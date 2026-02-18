// somewhere top-level (e.g., in the same file or a charts.ts file)
"use client"

import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
ChartJS.register(ArcElement, Tooltip, Legend);

export function SemesterPie({ present = 70, absent = 30, excused = 0, h=25, w=25}) {
  const data = {
    labels: ["Present", "Absent", "Excused"],
    datasets: [
      {
        data: [present, absent, excused],
        backgroundColor: ["#22c55e", "#ef4444", "#f59e0b"],
        borderWidth: 2,
      },
    ],
  };
  const options = {
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    maintainAspectRatio: false,
  };
  return (
    <div className={`h-${h} w-${w}`}> {/* 80x80px */}
      <Pie data={data} options={options} />
    </div>
  );
}
