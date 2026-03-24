export const config = { runtime: 'edge' };

const STOCK_CODE = '317120';
const NAVER_BASE = 'https://finance.naver.com/item';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://finance.naver.com/',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9',
};

async function fetchNaver(path) {
  const res = await fetch(`${NAVER_BASE}${path}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  return res.text();
}

function parseNumber(str) {
  if (!str) return null;
  return str.replace(/[^0-9.-]/g, '').trim();
}

function parseTable(html, tableSelector) {
  const rows = [];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let trMatch;
  while ((trMatch = trRegex.exec(html)) !== null) {
    const tds = [];
    let tdMatch;
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    while ((tdMatch = tdRe.exec(trMatch[1])) !== null) {
      const text = tdMatch[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').replace(/\s+/g, ' ').trim();
      tds.push(text);
    }
    if (tds.length > 0) rows.push(tds);
  }
  return rows;
}

export default async function handler(req) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 's-maxage=60, stale-while-revalidate=30',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: cors });
  }

  try {
    const [mainHtml, hokaHtml, cheolHtml, dailyHtml] = await Promise.all([
      fetchNaver(`/main.naver?code=${STOCK_CODE}`),
      fetchNaver(`/hoga.naver?code=${STOCK_CODE}`),
      fetchNaver(`/time_deal.naver?code=${STOCK_CODE}&page=1`),
      fetchNaver(`/sise_day.naver?code=${STOCK_CODE}&page=1`),
    ]);

    // 현재가
    const curPriceMatch = mainHtml.match(/class="[^"]*no_today[^"]*"[^>]*>[\s\S]*?<span[^>]*class="[^"]*blind[^"]*"[^>]*>([\d,]+)<\/span>/);
    const curPrice = curPriceMatch ? curPriceMatch[1] : null;

    // 전일대비
    const changeMatch = mainHtml.match(/class="[^"]*no_exday[^"]*"[\s\S]*?<span[^>]*class="[^"]*blind[^"]*"[^>]*>([\d,]+)<\/span>/);
    const change = changeMatch ? changeMatch[1] : null;

    // 등락방향
    const upMatch = mainHtml.match(/class="[^"]*no_exday[^"]*"[\s\S]*?(상승|하락|보합)/);
    const direction = upMatch ? upMatch[1] : null;

    // 시가/고가/저가/거래량 등 테이블
    const tableMatches = [];
    const tbodyMatch = mainHtml.match(/<table[^>]*class="[^"]*no_info[^"]*"[^>]*>([\s\S]*?)<\/table>/);
    if (tbodyMatch) {
      const rows = parseTable(tbodyMatch[1]);
      rows.forEach(r => tableMatches.push(r));
    }

    // 호가
    const hogaRows = parseTable(hokaHtml);
    const hoga = hogaRows.filter(r => r.length >= 2 && r.some(c => /[\d,]+/.test(c)));

    // 시간대별 체결가
    const cheolRows = parseTable(cheolHtml);
    const cheolgyeol = cheolRows.filter(r => r.length >= 4 && /\d{2}:\d{2}/.test(r[0]));

    // 일자별 시세
    const dailyRows = parseTable(dailyHtml);
    const daily = dailyRows.filter(r => r.length >= 7 && /\d{4}.\d{2}.\d{2}/.test(r[0]));

    const result = {
      updatedAt: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      price: {
        current: curPrice,
        change: change,
        direction: direction,
        info: tableMatches,
      },
      hoga,
      cheolgyeol,
      daily,
    };

    return new Response(JSON.stringify(result), { status: 200, headers: cors });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
}
