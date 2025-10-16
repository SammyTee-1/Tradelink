// TradingView widget theme sync and watermark removal
function getTVTheme() {
	return (localStorage.getItem('theme') || document.documentElement.getAttribute('data-theme')) === 'dark' ? 'dark' : 'light';
}

function renderTVWidget() {
	var tvWidget = document.getElementById('tv-widget');
	if (!tvWidget) return;
	tvWidget.innerHTML = '';
	const theme = getTVTheme();
		const config = {
			"colorTheme": theme,
			"locale": "en",
			"isTransparent": false,
			"showFloatingTooltip": false,
			"tabs": [
				{
					"title": "Crypto",
					"symbols": [
						{ "s": "BINANCE:BTCUSDT" }, { "s": "BINANCE:ETHUSDT" }, { "s": "BINANCE:SOLUSDT" },
						{ "s": "BINANCE:XRPUSDT" }, { "s": "BINANCE:PEPEUSDT" }, { "s": "BINANCE:AVAXUSDT" },
						{ "s": "BINANCE:ADAUSDT" }, { "s": "BINANCE:NEARUSDT" }, { "s": "BINANCE:SHIBUSDT" },
						{ "s": "BINANCE:TRUMPUSDT" }
					]
				},
				{
					"title": "Forex",
					"symbols": [
						{ "s": "CMCMARKETS:GBPUSD" }, { "s": "FX:EURUSD" }, { "s": "FX:USDJPY" },
						{ "s": "FX:GBPJPY" }, { "s": "OANDA:EURJPY" }, { "s": "FOREXCOM:AUDUSD" },
						{ "s": "OANDA:AUDNZD" }, { "s": "FOREXCOM:AUDJPY" }, { "s": "FX_IDC:USDRUB" },
						{ "s": "FX:USDMXN" }
					]
				},
				{
					"title": "Stock",
					"symbols": [
						{ "s": "NASDAQ:AAPL" }, { "s": "NASDAQ:TSLA" }, { "s": "NASDAQ:NVDA" },
						{ "s": "NASDAQ:AMZN" }, { "s": "NASDAQ:AMD" }, { "s": "NASDAQ:PLTR" },
						{ "s": "NASDAQ:GOOGL" }, { "s": "NASDAQ:NFLX" }, { "s": "NASDAQ:MSFT" },
						{ "s": "NASDAQ:META" }
					]
				}
			],
			"support_host": "https://www.tradingview.com",
			"backgroundColor": theme === 'dark' ? "#000000ff" : "#fff",
			"width": window.innerWidth > 900 ? "100%" : "100%",
			"height": window.innerWidth > 900 ? 550 : 660,
			"showSymbolLogo": true,
			"showChart": false,
			"showLegend": false,
			"hide_top_toolbar": true,
			"hide_legend": true,
			"hide_side_toolbar": true,
			"hideideas": true,
			"hidevolume": true,
			"hide_date_ranges": true,
			"hide_market_status": true,
			"hide_symbol_logo": false,
			"hide_indicators": true,
			"hidefundamental": true,
			"hide_news": true,
			"hide_calendar": true,
			"hide_compare": true,
			"hide_logo": true // watermark/logo removal
		};
	// TradingView widget script
	const script = document.createElement('script');
	script.type = 'text/javascript';
	script.async = true;
	script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js';
	script.innerHTML = JSON.stringify(config);
	tvWidget.appendChild(script);
}

// Initial render
document.addEventListener('DOMContentLoaded', function() {
	renderTVWidget();
	// Theme change support
	window.addEventListener('storage', function(e) {
		if (e.key === 'theme') setTimeout(renderTVWidget, 200);
	});
	// Listen for theme toggle in-page
	if (window.toggleTheme) {
		const origToggle = window.toggleTheme;
		window.toggleTheme = function() {
			origToggle();
			setTimeout(renderTVWidget, 200);
		};
	}
	// Responsive re-render (only on width change, not scroll)
	let lastWidth = window.innerWidth;
	window.addEventListener('resize', function() {
		if (window.innerWidth !== lastWidth) {
			lastWidth = window.innerWidth;
			setTimeout(renderTVWidget, 200);
		}
	});
});
