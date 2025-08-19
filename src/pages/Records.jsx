import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from 'react-i18next';
import Chart from "react-apexcharts";
import "../styles/Records.css";
import "../styles/Layout.css";

const mockData = {
  progressChart: {
    dates: ["Aug 1", "Aug 2", "Aug 3", "Aug 4", "Aug 5", "Aug 6", "Aug 7"],
    errorRates: [45, 42, 38, 35, 30, 25, 22],
  },
  phonemeChart: {
    phonemes: ["/r/", "/s/", "/l/", "/th/", "/k/"],
    errorCounts: [28, 21, 15, 10, 5],
  },
  heatmapChart: [
    { name: "Jul 21 - 27", data: [{ x: "Mon", y: 1 }, { x: "Tue", y: 4 }, { x: "Wed", y: 2 }, { x: "Thu", y: 6 }, { x: "Fri", y: 3 }, { x: "Sat", y: 0 }, { x: "Sun", y: 0 }] },
    { name: "Jul 28 - Aug 3", data: [{ x: "Mon", y: 6 }, { x: "Tue", y: 3 }, { x: "Wed", y: 1 }, { x: "Thu", y: 0 }, { x: "Fri", y: 5 }, { x: "Sat", y: 8 }, { x: "Sun", y: 4 }] },
    { name: "Aug 4 - 10", data: [{ x: "Mon", y: 2 }, { x: "Tue", y: 0 }, { x: "Wed", y: 7 }, { x: "Thu", y: 4 }, { x: "Fri", y: 9 }, { x: "Sat", y: 5 }, { x: "Sun", y: 1 }] },
    { name: "Aug 11 - 17", data: [{ x: "Mon", y: 5 }, { x: "Tue", y: 8 }, { x: "Wed", y: 3 }, { x: "Thu", y: 10 }, { x: "Fri", y: 2 }, { x: "Sat", y: 12 }, { x: "Sun", y: 0 }] },
  ],
  difficultyChart: {
    levels: ["Kindergarten", "Primary School", "Middle School", "Adult"],
    counts: [25, 45, 15, 5],
  },
  detailedRecords: [
    {
      id: 1,
      date: "2025-08-12",
      word: "window",
      difficulty: "Primary",
      errorRate: "40.00%",
      errors: "['n', 'd']",
      details: "【Diagnosis Layer】\n  - Target: 'window' (/ˈwɪndoʊ/)\n  - User: /ˈwɪmoʊ/\n\n  【Phoneme Alignment】\n  Target: [ w  ɪ  n  d  oʊ ]\n  User  : [ w  ɪ  -  m  oʊ ]",
    },
    {
      id: 2,
      date: "2025-08-11",
      word: "rabbit",
      difficulty: "Kindergarten",
      errorRate: "25.00%",
      errors: "['r']",
      details: "【Diagnosis Layer】\n  - Target: 'rabbit' (/ˈræbɪt/)\n  - User: /ˈwæbɪt/",
    },
    {
      id: 3,
      date: "2025-08-10",
      word: "apple",
      difficulty: "Kindergarten",
      errorRate: "5.00%",
      errors: "['p']",
      details: "【Diagnosis Layer】\n  - Target: 'apple' (/ˈæpəl/)\n  - User: /ˈæbəl/",
    },
    {
      id: 4,
      date: "2025-08-09",
      word: "school",
      difficulty: "Primary",
      errorRate: "15.00%",
      errors: "['sch']",
      details: "【Diagnosis Layer】\n  - Target: 'school' (/skuːl/)\n  - User: /ʃuːl/",
    },
    {
      id: 5,
      date: "2025-08-08",
      word: "computer",
      difficulty: "Middle School",
      errorRate: "30.00%",
      errors: "['mp', 't']",
      details: "【Diagnosis Layer】\n  - Target: 'computer' (/kəmˈpjuːtər/)\n  - User: /kəˈpjuːdər/",
    },
  ],
};

export default function Records() {
  const { t } = useTranslation();
  const [records, setRecords] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: "date", direction: "desc" });
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    const sorted = [...mockData.detailedRecords].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    setRecords(sorted);
  }, []);

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });

    const sorted = [...records].sort((a, b) => {
      let valA = a[key];
      let valB = b[key];
      if (key === "errorRate") {
        valA = parseFloat(valA);
        valB = parseFloat(valB);
      }
      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
      return 0;
    });
    setRecords(sorted);
  };

  const getSortClassName = (key) => {
    if (sortConfig.key !== key) return "sortable";
    return `sortable active ${sortConfig.direction}`;
  };

  // ... Chart options 保持不變 ...
  const progressChartOptions = {
    chart: {
      id: "progress",
      toolbar: { show: false },
      background: "transparent",
      fontFamily: "Inter, sans-serif",
    },
    xaxis: { categories: mockData.progressChart.dates },
    stroke: { curve: "smooth", width: 3 },
    colors: ["#4f46e5"],
    markers: { size: 5 },
    grid: { borderColor: "#e2e8f0" },
    yaxis: { labels: { formatter: (val) => val.toFixed(0) + "%" } },
    tooltip: { y: { formatter: (val) => val.toFixed(2) + "%" } },
  };

  const phonemeChartOptions = {
    chart: {
      id: "phoneme",
      type: "bar",
      toolbar: { show: false },
      background: "transparent",
      fontFamily: "Inter, sans-serif",
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: "50%",
        borderRadius: 4,
      },
    },
    xaxis: { categories: mockData.phonemeChart.phonemes },
    colors: ["#f59e0b"],
    grid: { borderColor: "#e2e8f0" },
  };

  const heatmapChartOptions = {
    chart: {
      type: "heatmap",
      toolbar: { show: false },
      background: "transparent",
      fontFamily: "Inter, sans-serif",
    },
    plotOptions: {
      heatmap: {
        radius: 4,
        enableShades: false,
        colorScale: {
          ranges: [
            { from: 0, to: 0, name: "None", color: "#ebedf0" },
            { from: 1, to: 3, name: "Low", color: "#9be9a8" },
            { from: 4, to: 7, name: "Medium", color: "#40c463" },
            { from: 8, to: 15, name: "High", color: "#30a14e" },
            { from: 16, to: 100, name: "Very High", color: "#216e39" },
          ],
        },
      },
    },
    stroke: { width: 2, colors: ["#ffffff"] },
    dataLabels: { enabled: false },
    legend: {
      position: "top",
      horizontalAlign: "left",
      markers: { width: 12, height: 12, radius: 2 },
    },
    xaxis: {
      type: "category",
      categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    },
    grid: { borderColor: "#e2e8f0", padding: { top: -20 } },
    tooltip: {
      y: {
        formatter: (value) => `Practice Count: <b>${value}</b>`,
      },
    },
  };

  const difficultyChartOptions = {
    chart: {
      type: "donut",
      background: "transparent",
      fontFamily: "Inter, sans-serif",
    },
    labels: mockData.difficultyChart.levels,
    colors: ["#67e8f9", "#38bdf8", "#0ea5e9", "#0284c7"],
    legend: { position: "bottom" },
    dataLabels: { enabled: true, formatter: (val) => val.toFixed(1) + "%" },
    plotOptions: {
      pie: {
        donut: {
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total Practices",
            },
          },
        },
      },
    },
  };

  return (
    <main className="main-content width-records">
      <h1 className="page-title">{t('recordsPage.title')}</h1>

      <div className="dashboard-grid">
        <div className="chart-card">
          <h3 className="chart-title">{t('recordsPage.overallProgress')}</h3>
          <Chart
            options={progressChartOptions}
            series={[{ name: "Error Rate", data: mockData.progressChart.errorRates }]}
            type="line"
            height={300}
          />
        </div>
        <div className="chart-card">
          <h3 className="chart-title">{t('recordsPage.frequentErrors')}</h3>
          <Chart
            options={phonemeChartOptions}
            series={[{ name: "Errors", data: mockData.phonemeChart.errorCounts }]}
            type="bar"
            height={300}
          />
        </div>
        <div className="chart-card">
          <h3 className="chart-title">{t('recordsPage.weeklyFrequency')}</h3>
          <Chart
            options={heatmapChartOptions}
            series={mockData.heatmapChart}
            type="heatmap"
            height={300}
          />
        </div>
        <div className="chart-card">
          <h3 className="chart-title">{t('recordsPage.difficultyDistribution')}</h3>
          <Chart
            options={difficultyChartOptions}
            series={mockData.difficultyChart.counts}
            type="donut"
            height={300}
          />
        </div>
      </div>

      <div className="records-section">
        <h2 className="page-title" style={{ fontSize: "1.8rem", marginBottom: "1.5rem" }}>
          {t('recordsPage.detailedHistory')}
        </h2>

        <table className="records-table">
          <thead>
            <tr>
              <th className={getSortClassName("date")} onClick={() => handleSort("date")}>
                {t('recordsPage.table.date')}
              </th>
              <th>{t('recordsPage.table.targetWord')}</th>
              <th>{t('recordsPage.table.difficulty')}</th>
              <th className={getSortClassName("errorRate")} onClick={() => handleSort("errorRate")}>
                {t('recordsPage.table.errorRate')}
              </th>
              <th>{t('recordsPage.table.errorPhonemes')}</th>
              <th>{t('recordsPage.table.details')}</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <React.Fragment key={record.id}>
                <tr>
                  <td>{record.date}</td>
                  <td>{record.word}</td>
                  <td>{record.difficulty}</td>
                  <td>{record.errorRate}</td>
                  <td>{record.errors}</td>
                  <td>
                    <button
                      className="details-btn"
                      onClick={() => setExpandedRow(expandedRow === record.id ? null : record.id)}
                    >
                      {expandedRow === record.id ? t('recordsPage.table.hide') : t('recordsPage.table.details')}
                    </button>
                  </td>
                </tr>
                {expandedRow === record.id && (
                  <tr className="details-row">
                    <td colSpan="6">
                      <div className="details-content">
                        <pre>{record.details}</pre>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
