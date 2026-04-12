"use client"

import { useEffect, useState } from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

export function SemesterPie({ present = 70, absent = 30, excused = 0, h = 25, w = 25 }) {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    // getVar extracts the exact string from your CSS (e.g., "#16a34a")
    const getVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

    // REMOVE THE hsl() WRAPPER: Just use the hex values directly
    const successColor = getVar('--success');
    const errorColor = getVar('--error');
    const secondaryColor = getVar('--secondary');

    setChartData({
      labels: ["Present", "Absent", "Excused"],
      datasets: [{
        data: [present, absent, excused],
        backgroundColor: [successColor, errorColor, secondaryColor], // Now passing "#16a34a" etc.
        borderWidth: 2,
      }],
    });
  }, [present, absent, excused]);

  const options = {
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    maintainAspectRatio: false,
  };

  if (!chartData) return <div style={{ height: `${h * 4}px`, width: `${w * 4}px` }} />;

  return (
    <div style={{ height: `${h * 10}px`, width: `${w * 10}px` }}>
      <Pie data={chartData} options={options} />
    </div>
  );
}
