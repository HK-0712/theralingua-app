import React, { useState, useMemo } from "react";
import { useSession } from '@supabase/auth-helpers-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Chart from "react-apexcharts";
import { format, parseISO, eachDayOfInterval, startOfWeek, endOfWeek, getDay } from 'date-fns';
import { toDate } from 'date-fns-tz';

import { getPracticeRecords } from '../api/supabaseAPI';
import Loader from "../components/Loader";
import "../styles/Records.css";
import "../styles/Layout.css";

// =================================================================
// ==   數據處理輔助函數 (Data Processing Helpers)                ==
// =================================================================

// ✨ 步驟 1: 創建一個安全的 JSON 解析函數
const safeJsonParse = (str) => {
  // 只在字串看起來像 JSON 物件時才嘗試解析
  if (typeof str === 'string' && str.trim().startsWith('{')) {
    try {
      return JSON.parse(str);
    } catch (e) {
      // 如果解析失敗，返回 null
      return null;
    }
  }
  // 如果不是 JSON 字串，直接返回 null
  return null;
};


const processRecordsForCharts = (records) => {
  if (!records || records.length === 0) {
    return {
      progressChart: { dates: [], errorRates: [] },
      phonemeChart: { phonemes: [], errorCounts: [] },
      heatmapChart: [],
      difficultyChart: { levels: [], counts: [] },
    };
  }

  const timeZone = 'Asia/Hong_Kong';

  const progressData = {};
  records.forEach(rec => {
    const dateStr = format(toDate(parseISO(rec.created_at), { timeZone }), 'yyyy-MM-dd');
    if (!progressData[dateStr]) {
      progressData[dateStr] = { totalRate: 0, count: 0 };
    }
    progressData[dateStr].totalRate += rec.error_rate || 0;
    progressData[dateStr].count += 1;
  });
  const progressChart = {
    dates: Object.keys(progressData).sort(),
    errorRates: Object.keys(progressData).sort().map(date => {
      const avgRate = (progressData[date].totalRate / progressData[date].count) * 100;
      return parseFloat(avgRate.toFixed(2));
    }),
  };

  const phonemeErrors = {};
  records.forEach(rec => {
    // ✨ 步驟 2: 使用我們創建的安全解析函數
    const log = safeJsonParse(rec.full_log);
    if (log && log.errorSummary && Array.isArray(log.errorSummary)) {
      log.errorSummary.forEach(phoneme => {
        phonemeErrors[phoneme] = (phonemeErrors[phoneme] || 0) + 1;
      });
    }
  });
  const sortedPhonemes = Object.entries(phonemeErrors).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const phonemeChart = {
    phonemes: sortedPhonemes.map(p => p[0]),
    errorCounts: sortedPhonemes.map(p => p[1]),
  };

  const practiceCountsByDay = {};
  records.forEach(rec => {
    const dateStr = format(toDate(parseISO(rec.created_at), { timeZone }), 'yyyy-MM-dd');
    practiceCountsByDay[dateStr] = (practiceCountsByDay[dateStr] || 0) + 1;
  });

  const firstDate = parseISO(records[records.length - 1].created_at);
  const lastDate = parseISO(records[0].created_at);
  const weeks = {};
  eachDayOfInterval({ start: startOfWeek(firstDate, { weekStartsOn: 1 }), end: endOfWeek(lastDate, { weekStartsOn: 1 }) }).forEach(day => {
    const weekStartDate = format(startOfWeek(day, { weekStartsOn: 1 }), 'MMM d');
    if (!weeks[weekStartDate]) {
      weeks[weekStartDate] = Array(7).fill(0);
    }
    const dayIndex = (getDay(day) + 6) % 7;
    const dateStr = format(day, 'yyyy-MM-dd');
    weeks[weekStartDate][dayIndex] = practiceCountsByDay[dateStr] || 0;
  });
  const heatmapChart = Object.entries(weeks).map(([weekName, data]) => ({
    name: weekName,
    data: data.map((count, i) => ({ x: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i], y: count })),
  }));

  const difficultyCounts = {};
  records.forEach(rec => {
    const level = rec.diffi_level || 'Unknown';
    difficultyCounts[level] = (difficultyCounts[level] || 0) + 1;
  });
  const difficultyChart = {
    levels: Object.keys(difficultyCounts),
    counts: Object.values(difficultyCounts),
  };

  return { progressChart, phonemeChart, heatmapChart, difficultyChart };
};


// =================================================================
// ==   Records 組件                                              ==
// =================================================================

export default function Records() {
  const { t } = useTranslation();
  const session = useSession();
  const userId = session?.user?.id;
  const timeZone = 'Asia/Hong_Kong';

  const [sortConfig, setSortConfig] = useState({ key: "created_at", direction: "desc" });
  const [expandedRow, setExpandedRow] = useState(null);

  const { data: rawRecords, isLoading, isError } = useQuery({
    queryKey: ['practiceRecords', userId],
    queryFn: () => getPracticeRecords(userId),
    enabled: !!userId,
  });

  const chartData = useMemo(() => processRecordsForCharts(rawRecords), [rawRecords]);
  
  const sortedRecords = useMemo(() => {
    if (!rawRecords) return [];
    const sorted = [...rawRecords].sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];
      if (sortConfig.key === "error_rate") {
        valA = parseFloat(valA);
        valB = parseFloat(valB);
      }
      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [rawRecords, sortConfig]);

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const getSortClassName = (key) => {
    if (sortConfig.key !== key) return "sortable";
    return `sortable active ${sortConfig.direction}`;
  };

  const progressChartOptions = { chart: { id: "progress", toolbar: { show: false }, background: "transparent" }, xaxis: { categories: chartData.progressChart.dates }, stroke: { curve: "smooth", width: 3 }, colors: ["#4f46e5"], markers: { size: 5 }, grid: { borderColor: "#e2e8f0" }, yaxis: { labels: { formatter: (val) => val.toFixed(0) + "%" } }, tooltip: { y: { formatter: (val) => val.toFixed(2) + "%" } } };
  const phonemeChartOptions = { chart: { id: "phoneme", type: "bar", toolbar: { show: false }, background: "transparent" }, plotOptions: { bar: { horizontal: true, barHeight: "50%", borderRadius: 4 } }, xaxis: { categories: chartData.phonemeChart.phonemes }, colors: ["#f59e0b"], grid: { borderColor: "#e2e8f0" } };
  const heatmapChartOptions = { chart: { type: "heatmap", toolbar: { show: false }, background: "transparent" }, plotOptions: { heatmap: { radius: 4, enableShades: false, colorScale: { ranges: [{ from: 0, to: 0, name: "None", color: "#ebedf0" }, { from: 1, to: 3, name: "Low", color: "#9be9a8" }, { from: 4, to: 7, name: "Medium", color: "#40c463" }, { from: 8, to: 15, name: "High", color: "#30a14e" }] } } }, stroke: { width: 2, colors: ["#ffffff"] }, dataLabels: { enabled: false }, legend: { position: "top", horizontalAlign: "left" }, xaxis: { type: "category", categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] }, grid: { borderColor: "#e2e8f0", padding: { top: -20 } }, tooltip: { y: { formatter: (value) => `Practices: <b>${value}</b>` } } };
  const difficultyChartOptions = { chart: { type: "donut", background: "transparent" }, labels: chartData.difficultyChart.levels, colors: ["#67e8f9", "#38bdf8", "#0ea5e9", "#0284c7"], legend: { position: "bottom" }, dataLabels: { enabled: true, formatter: (val) => val.toFixed(1) + "%" }, plotOptions: { pie: { donut: { labels: { show: true, total: { show: true, label: "Total Practices" } } } } } };

  if (isLoading) {
    return <main className="main-content width-records"><h1 className="page-title">{t('recordsPage.title')}</h1><Loader /></main>;
  }
  if (isError) {
    return <main className="main-content width-records"><p>Error loading records.</p></main>;
  }
  if (!rawRecords || rawRecords.length === 0) {
    return <main className="main-content width-records"><h1 className="page-title">{t('recordsPage.title')}</h1><p>No practice records found yet. Start practicing to see your progress!</p></main>;
  }

  return (
    <main className="main-content width-records">
      <h1 className="page-title">{t('recordsPage.title')}</h1>
      <div className="dashboard-grid">
        <div className="chart-card"><h3 className="chart-title">{t('recordsPage.overallProgress')}</h3><Chart options={progressChartOptions} series={[{ name: "Avg Error Rate", data: chartData.progressChart.errorRates }]} type="line" height={300} /></div>
        <div className="chart-card"><h3 className="chart-title">{t('recordsPage.frequentErrors')}</h3><Chart options={phonemeChartOptions} series={[{ name: "Errors", data: chartData.phonemeChart.errorCounts }]} type="bar" height={300} /></div>
        <div className="chart-card"><h3 className="chart-title">{t('recordsPage.weeklyFrequency')}</h3><Chart options={heatmapChartOptions} series={chartData.heatmapChart} type="heatmap" height={300} /></div>
        <div className="chart-card"><h3 className="chart-title">{t('recordsPage.difficultyDistribution')}</h3><Chart options={difficultyChartOptions} series={chartData.difficultyChart.counts} type="donut" height={300} /></div>
      </div>
      <div className="records-section">
        <h2 className="page-title" style={{ fontSize: "1.8rem", marginBottom: "1.5rem" }}>{t('recordsPage.detailedHistory')}</h2>
        <table className="records-table">
          <thead>
            <tr>
              <th className={getSortClassName("created_at")} onClick={() => handleSort("created_at")}>{t('recordsPage.table.date')}</th>
              <th>{t('recordsPage.table.targetWord')}</th>
              <th>{t('recordsPage.table.difficulty')}</th>
              <th className={getSortClassName("error_rate")} onClick={() => handleSort("error_rate")}>{t('recordsPage.table.errorRate')}</th>
              <th>{t('recordsPage.table.errorPhonemes')}</th>
              <th>{t('recordsPage.table.details')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedRecords.map((record) => (
              <React.Fragment key={record.psid}>
                <tr>
                  <td>{format(toDate(parseISO(record.created_at), { timeZone }), 'yyyy-MM-dd HH:mm')}</td>
                  <td>{record.target_word}</td>
                  <td>{record.diffi_level}</td>
                  <td>{`${((record.error_rate || 0) * 100).toFixed(2)}%`}</td>
                  {/* ✨ 步驟 3: 在表格渲染時也使用安全解析函數 */}
                  <td>{safeJsonParse(record.full_log)?.errorSummary?.join(', ') || 'N/A'}</td>
                  <td><button className="details-btn" onClick={() => setExpandedRow(expandedRow === record.psid ? null : record.psid)}>{expandedRow === record.psid ? t('recordsPage.table.hide') : t('recordsPage.table.details')}</button></td>
                </tr>
                {expandedRow === record.psid && (
                  <tr className="details-row"><td colSpan="6"><div className="details-content"><pre>{record.full_log}</pre></div></td></tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
