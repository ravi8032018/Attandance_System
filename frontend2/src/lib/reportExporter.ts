export interface ReportColumn {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
}

export interface BannerItem {
  label: string;
  value: string;
}

/**
 * Export data array as a sanitized CSV file download.
 */
export function exportToCSV(filename: string, columns: ReportColumn[], data: any[]) {
  if (!data || data.length === 0) {
    alert("No data available to export.");
    return;
  }

  // 1. Header row
  const headers = columns.map((col) => `"${col.label.replace(/"/g, '""')}"`).join(",");

  // 2. Data rows
  const rows = data.map((item) =>
    columns
      .map((col) => {
        let val = item[col.key];
        if (val === null || val === undefined) val = "";
        if (typeof val === "object") val = JSON.stringify(val);
        const strVal = String(val).replace(/"/g, '""');
        return `"${strVal}"`;
      })
      .join(",")
  );

  const csvContent = [headers, ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export data as a formatted printable PDF report window.
 * Supports flexible parameters or dynamic banner items array.
 */
export function exportToPDF(
  reportTitle: string,
  thresholdOrBanner: string | BannerItem[],
  departmentOrColumns?: string | ReportColumn[],
  semesterOrData?: string | any[],
  columnsArg?: ReportColumn[],
  dataArg?: any[]
) {
  let columns: ReportColumn[] = [];
  let data: any[] = [];
  let bannerItems: BannerItem[] = [];
  let departmentName = "CS";

  if (Array.isArray(thresholdOrBanner)) {
    // Custom Banner Array Overload
    bannerItems = thresholdOrBanner;
    columns = (departmentOrColumns as ReportColumn[]) || [];
    data = (semesterOrData as any[]) || [];
    const deptItem = bannerItems.find((b) => b.label.toLowerCase().includes("department"));
    if (deptItem) departmentName = deptItem.value;
  } else {
    // Standard Positional Arguments Overload
    const thresholdVal = thresholdOrBanner || "";
    departmentName = (departmentOrColumns as string) || "CS";
    const semesterVal = (semesterOrData as string) || "All";
    columns = columnsArg || [];
    data = dataArg || [];

    bannerItems = [
      { label: "Report Type:", value: reportTitle },
    ];

    if (thresholdVal && thresholdVal !== "N/A" && !thresholdVal.includes("N/A")) {
      bannerItems.push({ label: "Attendance Threshold:", value: thresholdVal });
    } else {
      bannerItems.push({ label: "Department:", value: departmentName });
    }

    const semLabel = semesterVal.startsWith("Sem") || semesterVal.toLowerCase() === "all" ? semesterVal : `Sem ${semesterVal}`;
    bannerItems.push({ label: "Semester:", value: semLabel });
    bannerItems.push({ label: "Total Records:", value: `${data.length}` });
  }

  if (!data || data.length === 0) {
    alert("No data available to export.");
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to generate PDF reports.");
    return;
  }

  const nowStr = new Date().toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const getAlignment = (col: ReportColumn): "left" | "center" | "right" => {
    if (col.align) return col.align;
    const key = col.key.toLowerCase();
    const label = col.label.toLowerCase();
    if (
      key.includes("count") ||
      key.includes("conducted") ||
      key.includes("classes") ||
      key.includes("pct") ||
      key.includes("rate") ||
      key.includes("total") ||
      key.includes("attended") ||
      label.includes("count") ||
      label.includes("classes") ||
      label.includes("%") ||
      label.includes("rate")
    ) {
      return "center";
    }
    if (key === "semester" || key === "sem" || label === "sem" || label === "semester") {
      return "center";
    }
    return "left";
  };

  const tableHeadersHtml = columns
    .map((col) => {
      const align = getAlignment(col);
      return `<th style="padding: 12px 10px; border-bottom: 2px solid #cbd5e1; text-align: ${align}; font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-dark);">${col.label}</th>`;
    })
    .join("");

  const tableRowsHtml = data
    .map(
      (item, idx) =>
        `<tr style="background-color: ${idx % 2 === 0 ? "#ffffff" : "#f8fafc"};">` +
        columns
          .map((col) => {
            let val = item[col.key];
            if (val === null || val === undefined) val = "-";
            if (typeof val === "object") val = JSON.stringify(val);
            const align = getAlignment(col);
            return `<td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: var(--text-dark); text-align: ${align};">${val}</td>`;
          })
          .join("") +
        `</tr>`
    )
    .join("");

  const bannerHtml = bannerItems
    .map((item, idx) => {
      let className = "meta-item-center";
      if (idx === 0) className = "meta-item-left";
      else if (idx === bannerItems.length - 1) className = "meta-item-right";
      return `<div class="${className}">
        <span class="meta-label">${item.label}</span>
        <span class="meta-value">${item.value}</span>
      </div>`;
    })
    .join("");

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${reportTitle}</title>
        <style>
          :root {
            --primary: #1E3A8A;
            --accent: #60A5FA;
            --bg-page: #ffffff;
            --text-dark: #111827;
            --text-light: #6B7280;
            --border: #E5E7EB;
            --stripe: #F9FAFB;
            --meta-bg-start: #e2e8f0;
            --meta-bg-end: #f1f5f9;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: var(--text-dark);
            margin: 0;
            padding: 1.2cm 1.5cm;
            background: var(--bg-page);
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Vacuum Field: Suppress default browser print headers & footers */
          @page {
            size: A4 landscape;
            margin: 0;
          }

          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-bottom: 0.5rem;
          }

          .header-left, .header-right {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 0.4rem;
          }

          .header-right {
            align-items: flex-end;
            text-align: right;
          }

          .header-center {
            flex: 2;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }

          .logotype-text {
            font-size: 1.8rem;
            font-weight: 900;
            color: var(--text-dark);
            letter-spacing: -0.5px;
            margin-bottom: 0.2rem;
          }

          .tagline {
            font-size: 0.9rem;
            color: var(--text-dark);
            text-align: center;
            margin: 0;
          }

          .header-line {
            border: 0;
            border-bottom: 2px solid var(--accent);
            width: 100%;
            margin: 0.5rem 0 1.5rem;
          }

          .meta-label {
            font-size: 0.8rem;
            letter-spacing: 0.05em;
            font-weight: 700; 
          }
          
          .header-container .meta-label {
            color: var(--text-dark);
          }
          .header-container .meta-value {
            font-size: 0.8rem;
          }

          .meta-summary-banner {
            background: linear-gradient(to right, var(--meta-bg-start), var(--meta-bg-end));
            border-radius: 8px;
            width: 100%;
            padding: 1.25rem 2rem;
            margin-bottom: 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1.5rem;
            color: var(--text-dark);
            font-size: 0.95rem;
            box-sizing: border-box;
          }

          /* Expanded flex coefficient (flex: 2) to prevent title wrapping */
          .meta-item-left {
            flex: 2;
            display: flex;
            justify-content: flex-start;
            align-items: center;
            white-space: nowrap;
          }
          
          .meta-item-center {
            flex: 1;
            display: flex;
            justify-content: center;
            align-items: center;
            white-space: nowrap;
          }
          
          .meta-item-right {
            flex: 1;
            display: flex;
            justify-content: flex-end;
            align-items: center;
            white-space: nowrap;
          }

          .meta-summary-banner .meta-label {
            color: var(--text-dark);
            margin-right: 0.5rem;
          }

          .table-container {
            width: 100%;
            overflow-x: auto;
            margin-bottom: 2rem;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.85rem;
            line-height: 1.4;
          }

          th {
            background-color: transparent;
            color: var(--text-dark);
            font-weight: 800;
            text-transform: uppercase;
            font-size: 0.75rem;
            letter-spacing: 0.05em;
            padding: 1.25rem 0.5rem;
            border-top: 1px solid var(--border);
            border-bottom: 2px solid var(--border); 
          }

          td {
            padding: 1rem 0.5rem;
            vertical-align: middle;
            border-bottom: 1px solid var(--border); 
            color: var(--text-dark);
          }

          table, th, td {
            border-left: none;
            border-right: none;
          }

          tbody tr:nth-child(even) {
            background-color: var(--stripe);
          }

          .footer-container {
            margin-top: 2rem;
            font-size: 0.7rem;
            color: var(--text-light);
            display: flex;
            justify-content: flex-end;
            align-items: center;
          }

          @media print {
            @page {
              margin: 0;
            }
            body {
              padding: 1.2cm 1.5cm;
            }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header-container">
          <div class="header-left">
            <div>
              <span class="meta-label">Department:</span>
              <span class="meta-value">${departmentName}</span>
            </div>
          </div>

          <div class="header-center">
            <div class="logotype-text">SAMS - AUS</div>
            <p class="tagline">Student Attendance & Management System, Assam University Silchar</p>
          </div>

          <div class="header-right">
            <div>
              <span class="meta-label">Generated On:</span>
              <span class="meta-value">${nowStr}</span>
            </div>
          </div>
        </div>
        
        <hr class="header-line" />

        <div class="meta-summary-banner">
          ${bannerHtml}
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>${tableHeadersHtml}</tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        </div>

        <div class="footer-container">
          <span>Academic Attendance & Faculty Workload Management System</span>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 400);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
