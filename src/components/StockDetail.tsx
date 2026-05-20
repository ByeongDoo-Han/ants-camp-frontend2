import {useState, useEffect, useCallback} from "react";
import {useStockStore} from "@/store/stockStore";
import {fetchCandleData, fetchStockPriceList} from "@/services/stockApi";
import {PriceChart} from "./PriceChart";
import {OrderBook} from "./OrderBook";
import {CandleChart} from "./CandleChart";
import {TradePanel} from "./TradePanel";
import type {CandleData, Timeframe} from "@/types/stock";
import {TIMEFRAME_LABELS} from "@/types/stock";

const fmt = (n: number) => n.toLocaleString("ko-KR");

function formatTime(t: string): string {
	if (t.length === 6)
		return `${t.slice(0, 2)}:${t.slice(2, 4)}:${t.slice(4, 6)}`;
	return t;
}

type ChartTab = "realtime" | "candle";

export function StockDetail() {
	const selectedCode = useStockStore((s) => s.selectedCode);
	const stocks = useStockStore((s) => s.stocks);

	const [tab, setTab] = useState<ChartTab>("candle");
	const [timeframe, setTimeframe] = useState<Timeframe>("1d");
	const [candles, setCandles] = useState<CandleData[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [lastFetched, setLastFetched] = useState<Date | null>(null);
	const [restPrice, setRestPrice] = useState<number | null>(null); // REST 폴백 현재가

	const isDateBased =
		timeframe === "1d" || timeframe === "1w" || timeframe === "1M";

	// ── 캔들 데이터 로드 ────────────────────────────────────────────────
	const loadCandles = useCallback(
		async (stockCode: string, tf: Timeframe) => {
			setLoading(true);
			setError(null);
			try {
				const data = await fetchCandleData(stockCode, tf);
				setCandles(data);
				setLastFetched(new Date());
			} catch (e) {
				setError(e instanceof Error ? e.message : "데이터 로드 실패");
				setCandles([]);
			} finally {
				setLoading(false);
			}
		},
		[],
	);

	// 종목·탭·timeframe 변경 시 로드
	useEffect(() => {
		if (selectedCode && tab === "candle") {
			loadCandles(selectedCode, timeframe);
		}
	}, [selectedCode, tab, timeframe, loadCandles]);

	// STOMP 가격 없을 때 REST로 현재가 조회
	useEffect(() => {
		if (!selectedCode) return;
		const stompPrice = stocks[selectedCode]?.price?.currentPrice;
		if (stompPrice) {
			setRestPrice(null);
			return;
		}
		fetchStockPriceList([selectedCode])
			.then((map) => setRestPrice(map[selectedCode] ?? null))
			.catch(() => {});
	}, [selectedCode, stocks]);

	// ── 렌더 ──────────────────────────────────────────────────────────
	if (!selectedCode) {
		return (
			<div className="flex-1 flex flex-col items-center justify-center text-gray-600 gap-3">
				<svg
					className="w-12 h-12"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={1}
						d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
					/>
				</svg>
				<p className="text-sm">왼쪽에서 종목을 검색하고 구독하세요</p>
			</div>
		);
	}

	const stock = stocks[selectedCode];
	if (!stock) return null;

	const {price, orderBook, priceHistory} = stock;
	const dir = price?.direction ?? "FLAT";
	const dirColor =
		dir === "UP"
			? "text-red-400"
			: dir === "DOWN"
				? "text-blue-400"
				: "text-gray-300";

	return (
		<div className="flex-1 flex gap-4 overflow-hidden min-h-0">
			{/* ── 좌측: 차트 + 호가 ────────────────────────────────────── */}
			<div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1 min-w-0">
				{/* 종목 헤더 */}
				<div className="bg-gray-900 rounded-2xl mt-12 p-5 border border-gray-700 flex-shrink-0">
					<div className="flex items-start justify-between">
						<div>
							<h2 className="text-lg font-bold text-gray-100">
								{stock.stockName}
							</h2>
							<p className="text-xs font-mono text-gray-500 mt-0.5">
								{stock.stockCode}
							</p>
						</div>
						{price && (
							<span className="text-xs font-mono text-gray-500">
								{formatTime(price.tradeTime)}
							</span>
						)}
					</div>
					{price ? (
						<div className="mt-4 flex items-end gap-4 flex-wrap">
							<span
								className={`text-3xl font-mono font-bold ${dirColor}`}
							>
								{fmt(price.currentPrice)}
								<span className="text-base ml-1 font-normal">
									원
								</span>
							</span>
							<div
								className={`flex flex-col text-sm font-mono ${dirColor}`}
							>
								<span>
									{dir === "UP"
										? "▲"
										: dir === "DOWN"
											? "▼"
											: "─"}{" "}
									{fmt(Math.abs(price.priceChange))}원
								</span>
								<span>
									{Number(price.changeRate) > 0 ? "+" : ""}
									{Number(price.changeRate).toFixed(2)}%
								</span>
							</div>
							<div className="ml-auto text-right">
								<p className="text-xs text-gray-500">거래량</p>
								<p className="text-sm font-mono text-gray-300">
									{fmt(price.volume)}
								</p>
							</div>
						</div>
					) : (
						<div className="mt-4 flex items-center gap-2 text-gray-500">
							<span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
							<span className="text-sm">
								실시간 데이터 수신 대기 중...
							</span>
						</div>
					)}
				</div>

				{/* 차트 탭 */}
				<div className="bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden flex-shrink-0">
					{/* 탭 + Timeframe 선택기 */}
					<div className="border-b border-gray-700 px-4 pt-3 space-y-2">
						<div className="flex items-center gap-1">
							<TabBtn
								active={tab === "candle"}
								onClick={() => setTab("candle")}
							>
								캔들
							</TabBtn>
							<TabBtn
								active={tab === "realtime"}
								onClick={() => setTab("realtime")}
							>
								실시간
							</TabBtn>
							{tab === "candle" && (
								<button
									onClick={() =>
										loadCandles(selectedCode, timeframe)
									}
									disabled={loading}
									className="ml-auto flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-400 transition-colors disabled:opacity-40"
								>
									<svg
										className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
										/>
									</svg>
									{lastFetched
										? lastFetched.toLocaleTimeString(
												"ko-KR",
												{
													hour: "2-digit",
													minute: "2-digit",
													second: "2-digit",
												},
											)
										: "조회"}
								</button>
							)}
						</div>

						{/* Timeframe 선택기 (캔들 탭에서만) */}
						{tab === "candle" && (
							<div className="flex gap-1 pb-2">
								{(
									Object.keys(TIMEFRAME_LABELS) as Timeframe[]
								).map((tf) => (
									<button
										key={tf}
										onClick={() => setTimeframe(tf)}
										className={`px-2 py-1 text-[11px] font-mono rounded transition-colors ${
											timeframe === tf
												? "bg-indigo-600 text-white"
												: "text-gray-500 hover:text-gray-300 hover:bg-gray-700"
										}`}
									>
										{TIMEFRAME_LABELS[tf]}
									</button>
								))}
							</div>
						)}
					</div>

					<div className="p-4">
						{tab === "candle" && (
							<>
								{loading && (
									<div className="flex items-center justify-center gap-2 py-16 text-gray-500 text-sm">
										<svg
											className="w-4 h-4 animate-spin"
											fill="none"
											viewBox="0 0 24 24"
										>
											<circle
												className="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												strokeWidth="4"
											/>
											<path
												className="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8v8z"
											/>
										</svg>
										{TIMEFRAME_LABELS[timeframe]}봉 데이터
										로딩 중...
									</div>
								)}
								{!loading && error && (
									<div className="flex items-center justify-center gap-2 py-16 text-red-400 text-sm">
										<svg
											className="w-4 h-4"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
											/>
										</svg>
										{error}
									</div>
								)}
								{!loading && !error && (
									<CandleChart
										candles={candles}
										height={300}
										showDate={isDateBased}
									/>
								)}
							</>
						)}
						{tab === "realtime" && (
							<PriceChart data={priceHistory} direction={dir} />
						)}
					</div>
				</div>

				{/* 호가 */}
				<div className="bg-gray-900 rounded-2xl p-5 border border-gray-700 flex-shrink-0">
					<h3 className="text-sm font-semibold text-gray-300 mb-3">
						호가
					</h3>
					{orderBook ? (
						<OrderBook data={orderBook} />
					) : (
						<div className="flex items-center gap-2 text-gray-500 text-sm py-4 justify-center">
							<span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
							호가 데이터 수신 대기 중...
						</div>
					)}
				</div>
			</div>

			{/* ── 우측: 매수/매도 패널 ──────────────────────────────────── */}
			<div className="w-64 flex-shrink-0 overflow-y-auto">
				<div className="bg-gray-900 rounded-2xl p-4 mt-12 border border-gray-700">
					<h3 className="text-sm font-semibold text-gray-300 mb-3">
						주문
					</h3>
					<TradePanel
						stockCode={stock.stockCode}
						stockName={stock.stockName}
						currentPrice={price?.currentPrice ?? restPrice}
					/>
				</div>
			</div>
		</div>
	);
}

// ── 탭 버튼 헬퍼 ────────────────────────────────────────────────────────────
function TabBtn({
	active,
	onClick,
	children,
}: {
	active: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			onClick={onClick}
			className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
				active
					? "bg-indigo-600 text-white"
					: "text-gray-500 hover:text-gray-300"
			}`}
		>
			{children}
		</button>
	);
}
