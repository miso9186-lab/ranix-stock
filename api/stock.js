export const config = { runtime: 'edge' };

const STOCK_CODE = '317120';
const ISIN_CODE = 'KR7317120004';
const KRX_URL = 'http://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd';
const HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  'Referer': 'http://data.krx.co.kr/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

function getToday() {
  const d = new Date();
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10).replace(/-/g, '');
}

function getPastDate(days) {
  const d = new Date();
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  kst.setDate(kst.getDate() - days);
  return kst.toISOString().slice(0, 10).replace(/-/g, '');
}

async function fetchKRX(params) {
  const body = new URLSearchParams(params);
  const res = await fetch(KRX_URL, {
    method: 'POST',
    headers: HEADERS,
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`KRX fetch failed: ${res.status}`);
  return res.json();
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
    const today = getToday();
    const past30 = getPastDate(30);

    const [priceRes, dailyRes, hogaRes, cheolgyeolRes, memberRes] = await Promise.allSettled([

      fetchKRX({
        bld: 'dbms/MDC/STAT/standard/MDCSTAT01501',
        isuCd: ISIN_CODE,
        isuCd2: STOCK_CODE,
        strtDd: today,
        endDd: today,
      }),

      fetchKRX({
        bld: 'dbms/MDC/STAT/standard/MDCSTAT01501',
        isuCd: ISIN_CODE,
        isuCd2: STOCK_CODE,
        strtDd: past30,
        endDd: today,
      }),

      fetchKRX({
        bld: 'dbms/MDC/STAT/standard/MDCSTAT01701',
        isuCd: STOCK_CODE,
      }),

      fetchKRX({
        bld: 'dbms/MDC/STAT/standard/MDCSTAT01601',
        isuCd: STOCK_CODE,
        strtDd: today,
        endDd: today,
      }),

      fetchKRX({
        bld: 'dbms/MDC/STAT/standard/MDCSTAT02303',
        isuCd: STOCK_CODE,
        strtDd: today,
        endDd: today,
      }),
    ]);

    const result = {
      updatedAt: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      price: priceRes.status === 'fulfilled' ? priceRes.value : null,
      daily: dailyRes.status === 'fulfilled' ? dailyRes.value : null,
      hoga: hogaRes.status === 'fulfilled' ? hogaRes.value : null,
      cheolgyeol: cheolgyeolRes.status === 'fulfilled' ? cheolgyeolRes.value : null,
      member: memberRes.status === 'fulfilled' ? memberRes.value : null,
    };

    return new Response(JSON.stringify(result), { status: 200, headers: cors });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
}
