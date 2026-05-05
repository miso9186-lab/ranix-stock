export const config = { runtime: 'edge' };

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

  const url  = new URL(req.url);
  const type = url.searchParams.get('type');

  /* ── 공시 (DART API) ── */
  if (type === 'dart') {
    try {
      const DART_KEY  = '7fcb19ef4ddfcc20357facfd6599d61aeca9ff9b';
      const CORP_CODE = '01327092';
      const page      = url.searchParams.get('page') || '1';

      const res  = await fetch(
        `https://opendart.fss.or.kr/api/list.json?crtfc_key=${DART_KEY}&corp_code=${CORP_CODE}&bgn_de=20200101&page_no=${page}&page_count=10`,
        { headers: { 'Accept': 'application/json' } }
      );
      const data = await res.json();

      const items = (data.list || []).map(function(item) {
        return {
          title: item.report_nm,
          date:  item.rcept_dt ? item.rcept_dt.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') : '',
          url:   'https://dart.fss.or.kr/dsaf001/main.do?rcpNo=' + item.rcept_no,
        };
      });

      return new Response(JSON.stringify({
        items,
        total_count: data.total_count,
        total_page:  data.total_page,
        page_no:     data.page_no,
        status:      data.status,
        message:     data.message,
      }), { status: 200, headers: cors });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message, stack: err.stack }), { status: 500, headers: cors });
    }
  }

  /* ── 주가 ── */
  try {
    const res = await fetch('https://www.ranix.co.kr/kr/ir/stock_info.php', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        'Referer': 'https://www.ranix.co.kr/',
      }
    });

    const html = await res.text();

    const curPrice   = html.match(/class="stock-cur-price[^"]*"[^>]*>\s*([\d,]+)/)?.[1]?.trim() || null;
    const direction  = html.match(/class="stock-cur-price (up|down|normal)/)?.[1] || 'normal';
    const change     = html.match(/전일대비[\s\S]*?<b class="pr-(?:up|down)">([-+]?[\d,]+)<\/b>/)?.[1] || null;
    const prevClose  = html.match(/<dt>전일종가<\/dt>\s*<dd><b>([\d,]+)<\/b>/)?.[1] || null;
    const open       = html.match(/<dt>시가<\/dt>\s*<dd><b[^>]*>([\d,]+)<\/b>/)?.[1] || null;
    const high       = html.match(/<dt>고가<\/dt>\s*<dd><b[^>]*>([\d,]+)<\/b>/)?.[1] || null;
    const low        = html.match(/<dt>저가<\/dt>\s*<dd><b[^>]*>([\d,]+)<\/b>/)?.[1] || null;
    const upperLimit = html.match(/<dt>상한가<\/dt>\s*<dd><b[^>]*>([\d,]+)<\/b>/)?.[1] || null;
    const lowerLimit = html.match(/<dt>하한가<\/dt>\s*<dd><b[^>]*>([\d,]+)<\/b>/)?.[1] || null;
    const per        = html.match(/<dt>PER<\/dt>\s*<dd><b[^>]*>([\d.]+)<\/b>/)?.[1] || null;
    const volume     = html.match(/<dt>거래량<\/dt>\s*<dd><b>([\d,]+)<\/b>/)?.[1] || null;
    const tradeAmt   = html.match(/<dt>거래대금<\/dt>\s*<dd><b>([\d,]+)<\/b>/)?.[1] || null;
    const high52     = html.match(/<dt>52주 최고<\/dt>\s*<dd><b[^>]*>([\d,]+)<\/b>/)?.[1] || null;
    const low52      = html.match(/<dt>52주 최저<\/dt>\s*<dd><b[^>]*>([\d,]+)<\/b>/)?.[1] || null;
    const shares     = html.match(/<dt>상장주식수<\/dt>\s*<dd><b>([\d,]+)<\/b>/)?.[1] || null;
    const faceVal    = html.match(/<dt>액면가<\/dt>\s*<dd><b>([\d,]+)<\/b>/)?.[1] || null;

    const hogaRows = [];
    const hogaSection = html.match(/class="tbl-tit">호가<\/h1>([\s\S]*?)<\/article>/)?.[1] || '';
    const hogaTrs = hogaSection.matchAll(/<tr>([\s\S]*?)<\/tr>/g);
    for (const tr of hogaTrs) {
      const tds = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
        .map(m => m[1].replace(/<[^>]+>/g, '').trim());
      if (tds.length === 3) hogaRows.push(tds);
    }

    const cheolRows = [];
    const cheolSection = html.match(/class="tbl-tit">시간대별 체결가<\/h1>([\s\S]*?)<\/article>/)?.[1] || '';
    const cheolTrs = cheolSection.matchAll(/<tr>([\s\S]*?)<\/tr>/g);
    for (const tr of cheolTrs) {
      const tds = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
        .map(m => m[1].replace(/<[^>]+>/g, '').trim());
      if (tds.length === 6 && /\d{2}:\d{2}/.test(tds[0])) cheolRows.push(tds);
    }

    const memberRows = [];
    const memberSection = html.match(/class="tbl-tit">회원별거래<\/h1>([\s\S]*?)<\/article>/)?.[1] || '';
    const memberTrs = memberSection.matchAll(/<tr>([\s\S]*?)<\/tr>/g);
    for (const tr of memberTrs) {
      const tds = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
        .map(m => m[1].replace(/<[^>]+>/g, '').trim());
      if (tds.length === 4 && tds[0] && !/증권사/.test(tds[0])) memberRows.push(tds);
    }

    const dailyRows = [];
    const dailySection = html.match(/class="tbl-tit">일자별 시세<\/h1>([\s\S]*?)<\/article>/)?.[1] || '';
    const dailyTrs = dailySection.matchAll(/<tr>([\s\S]*?)<\/tr>/g);
    for (const tr of dailyTrs) {
      const tds = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
        .map(m => m[1].replace(/<[^>]+>/g, '').trim());
      if (tds.length === 8 && /\d{2}\/\d{2}\/\d{2}/.test(tds[0])) dailyRows.push(tds);
    }

    const result = {
      updatedAt: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      price: {
        curPrice, direction, change, prevClose,
        open, high, low, upperLimit, lowerLimit,
        per, volume, tradeAmt, high52, low52, shares, faceVal,
      },
      hoga: hogaRows,
      cheolgyeol: cheolRows,
      member: memberRows,
      daily: dailyRows,
    };

    return new Response(JSON.stringify(result), { status: 200, headers: cors });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
}
