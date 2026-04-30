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

  const CODE = '030350';

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'ko-KR,ko;q=0.9',
      'Referer': 'https://finance.naver.com/',
    };

    const [mainRes, hogaRes, timeRes, dailyRes] = await Promise.allSettled([
      fetch(`https://finance.naver.com/item/main.naver?code=${CODE}`, { headers }),
      fetch(`https://finance.naver.com/item/hoga.naver?code=${CODE}`, { headers }),
      fetch(`https://finance.naver.com/item/sise_time.naver?code=${CODE}&page=1`, { headers }),
      fetch(`https://finance.naver.com/item/sise_day.naver?code=${CODE}&page=1`, { headers }),
    ]);

    const mainHtml  = mainRes.status  === 'fulfilled' ? await mainRes.value.text()  : '';
    const hogaHtml  = hogaRes.status  === 'fulfilled' ? await hogaRes.value.text()  : '';
    const timeHtml  = timeRes.status  === 'fulfilled' ? await timeRes.value.text()  : '';
    const dailyHtml = dailyRes.status === 'fulfilled' ? await dailyRes.value.text() : '';

    /* ── 현재가 ── */
    const curPrice  = mainHtml.match(/id="_nowVal"[^>]*>([\d,]+)/)?.[1]?.trim() || null;
    const prevClose = mainHtml.match(/id="_prevPrice"[^>]*>([\d,]+)/)?.[1]?.trim() || null;
    const changeRaw = mainHtml.match(/id="_diff"[^>]*>([\d,]+)/)?.[1]?.trim() || null;
    const dirRaw    = mainHtml.match(/id="_rate"[^>]*>[\s\S]*?class="([^"]*)"/)?.[1] || '';
    const direction = dirRaw.includes('up') ? 'up' : dirRaw.includes('down') ? 'down' : 'normal';
    const changeSign = direction === 'up' ? '▲' : direction === 'down' ? '▼' : '';
    const change    = changeRaw ? changeSign + changeRaw : null;

    const open     = mainHtml.match(/시가[^<]*<\/dt>[\s\S]*?<strong[^>]*>([\d,]+)/)?.[1]?.trim() || null;
    const high     = mainHtml.match(/고가[^<]*<\/dt>[\s\S]*?<strong[^>]*>([\d,]+)/)?.[1]?.trim() || null;
    const low      = mainHtml.match(/저가[^<]*<\/dt>[\s\S]*?<strong[^>]*>([\d,]+)/)?.[1]?.trim() || null;
    const volume   = mainHtml.match(/거래량[^<]*<\/dt>[\s\S]*?<strong[^>]*>([\d,]+)/)?.[1]?.trim() || null;
    const tradeAmt = mainHtml.match(/거래대금[^<]*<\/dt>[\s\S]*?<em[^>]*>([\d,]+)/)?.[1]?.trim() || null;
    const high52   = mainHtml.match(/52주.*?최고[^<]*<\/dt>[\s\S]*?<strong[^>]*>([\d,]+)/)?.[1]?.trim() || null;
    const low52    = mainHtml.match(/52주.*?최저[^<]*<\/dt>[\s\S]*?<strong[^>]*>([\d,]+)/)?.[1]?.trim() || null;
    const per      = mainHtml.match(/PER[^<]*<\/dt>[\s\S]*?<em[^>]*>([\d.N/A-]+)/)?.[1]?.trim() || null;
    const shares   = mainHtml.match(/상장주식수[^<]*<\/dt>[\s\S]*?<em[^>]*>([\d,]+)/)?.[1]?.trim() || null;
    const faceVal  = mainHtml.match(/액면가[^<]*<\/dt>[\s\S]*?<em[^>]*>([\d,]+)/)?.[1]?.trim() || null;

    /* 상한/하한 — 전일종가 기준 ±30% */
    let upperLimit = null, lowerLimit = null;
    if (prevClose) {
      const base = parseInt(prevClose.replace(/,/g, ''));
      upperLimit = (Math.floor(base * 1.3 / 5) * 5).toLocaleString('ko-KR');
      lowerLimit = (Math.ceil(base  * 0.7 / 5) * 5).toLocaleString('ko-KR');
    }

    /* ── 호가 ── */
    const hogaRows = [];
    for (const tr of hogaHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
      const tds = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
        .map(m => m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim());
      if (tds.length >= 3 && /[\d,]+/.test(tds[1])) {
        hogaRows.push([tds[0] || '', tds[1], tds[2] || '']);
        if (hogaRows.length >= 10) break;
      }
    }

    /* ── 시간대별 체결가 ── */
    const cheolRows = [];
    for (const tr of timeHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
      const tds = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
        .map(m => m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim());
      if (tds.length >= 6 && /\d{2}:\d{2}/.test(tds[0])) {
        cheolRows.push(tds.slice(0, 6));
        if (cheolRows.length >= 10) break;
      }
    }

    /* ── 일자별 시세 ── */
    const dailyRows = [];
    for (const tr of dailyHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
      const tds = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
        .map(m => m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim());
      if (tds.length >= 7 && /\d{4}\.\d{2}\.\d{2}/.test(tds[0])) {
        const d = tds[0].replace(/\d{2}(\d{2})\.(\d{2})\.(\d{2})/, '$1/$2/$3');
        dailyRows.push([d, tds[1], tds[2], tds[3], tds[4], tds[5], tds[6], tds[7] || '']);
        if (dailyRows.length >= 10) break;
      }
    }

    const result = {
      updatedAt: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      price: {
        curPrice, direction, change, prevClose,
        open, high, low, upperLimit, lowerLimit,
        per, volume, tradeAmt, high52, low52, shares, faceVal,
      },
      hoga:       hogaRows,
      cheolgyeol: cheolRows,
      member:     [],   /* 네이버 금융 미제공 */
      daily:      dailyRows,
    };

    return new Response(JSON.stringify(result), { status: 200, headers: cors });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
}
