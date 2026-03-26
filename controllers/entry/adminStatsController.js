const path = require('path');
const fs = require('fs');

const metricsPath = path.join(__dirname, '../../data/adminMetrics.json');

function loadMetrics() {
  const raw = fs.readFileSync(metricsPath, 'utf8');
  return JSON.parse(raw);
}

function toWeekKey(dateText) {
  const date = new Date(`${dateText}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + (4 - day));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function aggregateDailyRows(rows, period) {
  const bucket = new Map();

  rows.forEach((row) => {
    const key = period === 'weekly'
      ? toWeekKey(row.date)
      : period === 'monthly'
        ? row.date.slice(0, 7)
        : period === 'yearly'
          ? row.date.slice(0, 4)
          : row.date;

    if (!bucket.has(key)) {
      bucket.set(key, {
        label: key,
        visitors: 0,
        views: 0,
        posts: 0,
        comments: 0,
      });
    }

    const current = bucket.get(key);
    current.visitors += row.visitors;
    current.views += row.views;
    current.posts += row.posts;
    current.comments += row.comments;
  });

  return Array.from(bucket.values()).sort((a, b) => a.label.localeCompare(b.label));
}

function getPeriodTitle(period) {
  if (period === 'weekly') {
    return '주별 방문/게시글/댓글/접속량';
  }

  if (period === 'monthly') {
    return '월별 방문/게시글/댓글/접속량';
  }

  if (period === 'yearly') {
    return '연도별 방문/게시글/댓글/접속량';
  }

  return '일별 방문/게시글/댓글/접속량';
}

function getPeriodCaption(period, count) {
  if (period === 'weekly') {
    return `최근 ${count}주 추이`;
  }

  if (period === 'monthly') {
    return `최근 ${count}개월 추이`;
  }

  if (period === 'yearly') {
    return `최근 ${count}년 추이`;
  }

  return `최근 ${count}일 추이`;
}

function renderAdminStats(req, res) {
  const metrics = loadMetrics();
  const period = ['daily', 'weekly', 'monthly', 'yearly'].includes(req.query.period)
    ? req.query.period
    : 'daily';

  const rows = aggregateDailyRows(metrics.daily, period);
  const maxValue = Math.max(...rows.map((row) => Math.max(row.visitors, row.views, row.posts, row.comments)), 1);

  res.render('entry-stats', {
    pageTitle: '관리자 통계',
    selectedPeriod: period,
    periodTitle: getPeriodTitle(period),
    periodCaption: getPeriodCaption(period, rows.length),
    rows,
    maxValue,
    totals: metrics.totals,
    today: metrics.today,
    boardPostCounts: metrics.boardPostCounts,
  });
}

module.exports = {
  renderAdminStats,
};
