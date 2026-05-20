import {useState, useRef, useEffect, useCallback} from "react";
import {searchStocks, subscribeStock} from "@/services/stockApi";
import {useStockStore} from "@/store/stockStore";
import type {StockSearchResult} from "@/types/stock";

const MARKET_COLOR: Record<string, string> = {
	KOSPI: "text-blue-400",
	KOSDAQ: "text-emerald-400",
};

export function StockSearch() {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<StockSearchResult[]>([]);
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const addStock = useStockStore((s) => s.addStock);
	const stocks = useStockStore((s) => s.stocks);

	// 검색어 디바운스 처리 (300ms)
	const handleChange = useCallback((value: string) => {
		setQuery(value);
		if (timerRef.current) clearTimeout(timerRef.current);
		if (!value.trim()) {
			setResults([]);
			setOpen(false);
			return;
		}
		timerRef.current = setTimeout(async () => {
			setLoading(true);
			try {
				// GET /api/stocks/search?q={value}&limit=10
				// 응답: [{ code, name, market }, ...]
				const data = await searchStocks(value.trim(), 10);
				setResults(data);
				setOpen(true);
			} catch (e) {
				console.error("종목 검색 실패", e);
				setResults([]);
			} finally {
				setLoading(false);
			}
		}, 300);
	}, []);

	// 외부 클릭 시 드롭다운 닫기
	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

	// 종목 선택 → REST 구독 → 스토어 등록
	const handleSelect = async (stock: StockSearchResult) => {
		if (stocks[stock.code]) {
			// 이미 구독 중인 종목이면 그냥 닫기
			setQuery("");
			setOpen(false);
			return;
		}
		try {
			// POST /api/stocks/realtime/{stockCode}
			await subscribeStock(stock.code);
			addStock({stockCode: stock.code, stockName: stock.name});
		} catch (e) {
			console.error("구독 실패", e);
		}
		setQuery("");
		setOpen(false);
	};

	return (
		<div ref={containerRef} className="relative w-full">
			{/* 검색 입력창 */}
			<div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus-within:border-indigo-500 transition-colors">
				<svg
					className="w-4 h-4 text-gray-400 flex-shrink-0"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					/>
				</svg>
				<input
					type="text"
					value={query}
					onChange={(e) => handleChange(e.target.value)}
					onFocus={() => results.length > 0 && setOpen(true)}
					placeholder="종목명 또는 코드 검색..."
					className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-500 outline-none min-w-0"
				/>
				{loading && (
					<svg
						className="w-4 h-4 text-indigo-400 animate-spin flex-shrink-0"
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
				)}
			</div>

			{/* 검색 결과 드롭다운 */}
			{open && results.length > 0 && (
				<ul className="absolute top-full mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-50 overflow-hidden max-h-64 overflow-y-auto">
					{results.map((s) => {
						const already = !!stocks[s.code];
						return (
							<li key={s.code}>
								<button
									onClick={() => handleSelect(s)}
									disabled={already}
									className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm transition-colors ${
										already
											? "opacity-40 cursor-not-allowed"
											: "hover:bg-gray-700 cursor-pointer"
									}`}
								>
									<span className="text-gray-100 font-medium truncate">
										{s.name}
									</span>
									<span className="flex items-center gap-2 flex-shrink-0">
										<span
											className={`text-[10px] font-semibold ${MARKET_COLOR[s.market] ?? "text-gray-500"}`}
										>
											{s.market}
										</span>
										<span className="font-mono text-gray-400 text-xs">
											{s.code}
										</span>
									</span>
								</button>
							</li>
						);
					})}
				</ul>
			)}

			{/* 결과 없음 */}
			{open && !loading && results.length === 0 && query.trim() && (
				<div className="absolute top-full mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-500">
					검색 결과가 없습니다
				</div>
			)}
		</div>
	);
}
