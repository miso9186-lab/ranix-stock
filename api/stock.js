<style>
#rnx-dart-board {
    width: 100% !important;
    background: #fff !important;
    font-family: 'Noto Sans KR', sans-serif !important;
    box-sizing: border-box !important;
}
#rnx-dart-board * { box-sizing: border-box !important; }

.rnx-dart-header {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    padding: 0 0 16px 0 !important;
    border-bottom: 2px solid #f36c21 !important;
    margin-bottom: 0 !important;
}
.rnx-dart-header-title {
    font-size: 20px !important;
    font-weight: 700 !important;
    color: #1a1a1a !important;
}
.rnx-dart-header-total {
    font-size: 14px !important;
    color: #999 !important;
}

.rnx-dart-row {
    display: flex !important;
    align-items: center !important;
    background: #fff !important;
    border-bottom: 1px solid #e8e8e8 !important;
    min-height: 64px !important;
    position: relative !important;
    transition: background 0.2s !important;
    cursor: pointer !important;
}
.rnx-dart-row::before {
    content: '' !important;
    position: absolute !important;
    left: 0 !important; top: 0 !important; bottom: 0 !important;
    width: 0 !important;
    background: #f36c21 !important;
    transition: width 0.3s !important;
    z-index: 1 !important;
}
.rnx-dart-row:hover { background: #fffaf7 !important; }
.rnx-dart-row:hover::before { width: 4px !important; }

.rnx-dart-row-num {
    flex-shrink: 0 !important;
    width: 60px !important;
    align-self: stretch !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: 15px !important;
    font-weight: 600 !important;
    color: #f36c21 !important;
    background: #fff8f4 !important;
    border-right: 1px solid #e8e8e8 !important;
}
.rnx-dart-row-content {
    flex-grow: 1 !important;
    padding: 14px 20px !important;
    display: flex !important;
    align-items: center !important;
    gap: 16px !important;
    min-width: 0 !important;
}
.rnx-dart-row-title {
    font-size: 16px !important;
    font-weight: 500 !important;
    color: #1a1a1a !important;
    flex-grow: 1 !important;
    min-width: 0 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    text-decoration: none !important;
}
.rnx-dart-row:hover .rnx-dart-row-title { color: #f36c21 !important; }
.rnx-dart-row-date {
    font-size: 13px !important;
    color: #999 !important;
    flex-shrink: 0 !important;
    white-space: nowrap !important;
}
.rnx-dart-row-btn {
    flex-shrink: 0 !important;
    padding: 7px 16px !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    border-radius: 4px !important;
    display: inline-flex !important;
    align-items: center !important;
    gap: 5px !important;
    text-decoration: none !important;
    background: #f36c21 !important;
    border: 1px solid #f36c21 !important;
    color: #fff !important;
    white-space: nowrap !important;
    margin-right: 16px !important;
    transition: background 0.2s !important;
}
.rnx-dart-row-btn:hover { background: #d45a10 !important; border-color: #d45a10 !important; }

.rnx-dart-empty {
    padding: 60px 0 !important;
    text-align: center !important;
    color: #bbb !important;
    font-size: 15px !important;
}

.rnx-dart-paging {
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    gap: 4px !important;
    padding: 30px 0 10px !important;
}
.rnx-dart-page-btn {
    min-width: 36px !important;
    height: 36px !important;
    border-radius: 4px !important;
    border: 1px solid #e0e0e0 !important;
    background: #fff !important;
    color: #333 !important;
    font-size: 14px !important;
    font-weight: 500 !important;
    cursor: pointer !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 0 8px !important;
    transition: all 0.2s !important;
}
.rnx-dart-page-btn:hover { border-color: #f36c21 !important; color: #f36c21 !important; }
.rnx-dart-page-btn.on { background: #f36c21 !important; border-color: #f36c21 !important; color: #fff !important; }
.rnx-dart-page-btn:disabled { opacity: 0.3 !important; cursor: default !important; }

@media (max-width: 768px) {
    .rnx-dart-row { min-height: unset !important; }
    .rnx-dart-row-num { width: 46px !important; font-size: 13px !important; }
    .rnx-dart-row-content { padding: 12px 10px !important; flex-wrap: wrap !important; gap: 6px !important; }
    .rnx-dart-row-title { font-size: 14px !important; white-space: normal !important; width: 100% !important; }
    .rnx-dart-row-date { font-size: 12px !important; }
    .rnx-dart-row-btn { font-size: 12px !important; padding: 6px 12px !important; margin-right: 8px !important; }
}
@media (max-width: 480px) {
    .rnx-dart-row-title { font-size: 13px !important; }
}
</style>

<div id="rnx-dart-board">
    <div class="rnx-dart-header">
        <span class="rnx-dart-header-title">공시정보</span>
        <span class="rnx-dart-header-total" id="rnxDartTotal"></span>
    </div>
    <div id="rnxDartList">
        <div class="rnx-dart-empty">로딩중...</div>
    </div>
    <div class="rnx-dart-paging" id="rnxDartPaging"></div>
</div>

<script>
(function () {

    var PER_PAGE   = 10;
    var curPage    = 1;
    var totalCount = 0;

    var LINK_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>';

    function load(page) {
        curPage = page;
        var list = document.getElementById('rnxDartList');
        if (list) list.innerHTML = '<div class="rnx-dart-empty">로딩중...</div>';

        fetch('https://ranix-stock.vercel.app/api/stock?type=dart&page=' + page)
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (!data.items || data.items.length === 0) {
                    if (list) list.innerHTML = '<div class="rnx-dart-empty">공시 정보가 없습니다.</div>';
                    return;
                }

                totalCount    = data.total_count || 0;
                var totalPage = data.total_page  || 1;

                var totalEl = document.getElementById('rnxDartTotal');
                if (totalEl && totalCount) totalEl.textContent = '총 ' + totalCount + '건';

                var html = '';
                data.items.forEach(function(item, i) {
                    var num     = totalCount ? totalCount - (page - 1) * PER_PAGE - i : data.items.length - i;
                    var title   = item.title ? item.title.trim() : '';
                    var date    = item.date  || '';
                    var dartUrl = item.url   || '#';

                    html +=
                        '<div class="rnx-dart-row" onclick="window.open(\'' + dartUrl + '\',\'_blank\')">' +
                            '<div class="rnx-dart-row-num">' + num + '</div>' +
                            '<div class="rnx-dart-row-content">' +
                                '<span class="rnx-dart-row-title">' + title + '</span>' +
                                '<span class="rnx-dart-row-date">' + date + '</span>' +
                            '</div>' +
                            '<a class="rnx-dart-row-btn" href="' + dartUrl + '" target="_blank" onclick="event.stopPropagation()">' +
                                LINK_SVG + '<span>Link</span>' +
                            '</a>' +
                        '</div>';
                });

                if (list) list.innerHTML = html;
                renderPaging(page, totalPage);
            })
            .catch(function() {
                if (list) list.innerHTML = '<div class="rnx-dart-empty">데이터를 불러올 수 없습니다.</div>';
            });
    }

    function renderPaging(cur, total) {
        var paging = document.getElementById('rnxDartPaging');
        if (!paging || total <= 1) return;

        var blockSize  = 5;
        var blockStart = Math.floor((cur - 1) / blockSize) * blockSize + 1;
        var blockEnd   = Math.min(blockStart + blockSize - 1, total);

        var html = '';
        html += '<button class="rnx-dart-page-btn" ' +
            (blockStart === 1 ? 'disabled' : 'onclick="rnxDartLoad(' + (blockStart - 1) + ')"') +
            '>&#60;</button>';

        for (var i = blockStart; i <= blockEnd; i++) {
            html += '<button class="rnx-dart-page-btn' + (i === cur ? ' on' : '') + '" onclick="rnxDartLoad(' + i + ')">' + i + '</button>';
        }

        html += '<button class="rnx-dart-page-btn" ' +
            (blockEnd === total ? 'disabled' : 'onclick="rnxDartLoad(' + (blockEnd + 1) + ')"') +
            '>&#62;</button>';

        paging.innerHTML = html;
    }

    window.rnxDartLoad = function(page) {
        load(page);
        var board = document.getElementById('rnx-dart-board');
        if (board) board.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    function waitAndRun() {
        var el = document.getElementById('rnxDartList');
        if (!el) { setTimeout(waitAndRun, 300); return; }
        load(1);
    }

    if (document.readyState === 'complete') {
        setTimeout(waitAndRun, 500);
    } else {
        window.addEventListener('load', function() { setTimeout(waitAndRun, 500); });
    }

})();
</script>
