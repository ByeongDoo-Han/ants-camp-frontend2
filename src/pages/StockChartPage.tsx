import {useStompClient} from "@/hooks/useStompClient";
import {useKisStatus} from "@/hooks/useKisStatus";
import {useStockStore} from "@/store/stockStore";
import {StockSearch} from "@/components/StockSearch";
import {StockCard} from "@/components/StockCard";
import {StockDetail} from "@/components/StockDetail";
import {ConnectionBadge} from "@/components/ConnectionBadge";

export function StockChartPage() {
	useStompClient();
	useKisStatus();

	const stocks = useStockStore((s) => s.stocks);
	const selectedCode = useStockStore((s) => s.selectedCode);
	const stockList = Object.values(stocks).sort(
		(a, b) => a.subscribedAt - b.subscribedAt,
	);

	return (
		<div className="h-[calc(100vh-57px)] flex overflow-hidden">
			{/* 사이드바 */}
			<aside className="w-72 flex-shrink-0 border-r border-gray-800 flex flex-col">
				<div className="p-4 border-b border-gray-800 flex items-center justify-between">
					<StockSearch />
					<div className="ml-20 flex-shrink-0">
						<ConnectionBadge />
					</div>
				</div>

				<div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
					{stockList.length === 0 ? (
						<div className="flex flex-col items-center justify-center flex-1 text-gray-600 gap-2 py-10">
							<svg
								className="w-8 h-8"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={1.5}
									d="M12 4v16m8-8H4"
								/>
							</svg>
							<p className="text-xs text-center leading-relaxed">
								종목을 검색해서
								<br />
								실시간 데이터를 구독하세요
							</p>
						</div>
					) : (
						stockList.map((stock) => (
							<StockCard
								key={stock.stockCode}
								stock={stock}
								selected={selectedCode === stock.stockCode}
							/>
						))
					)}
				</div>

				{stockList.length > 0 && (
					<div className="px-4 py-2 border-t border-gray-800 text-xs text-gray-600 font-mono">
						구독 중: {stockList.length}개 종목
					</div>
				)}
			</aside>

			{/* 메인 차트 + 주문 패널 */}
			<main className="flex-1 border-l border-gray-900 overflow-hidden flex flex-col p-5">
				<StockDetail />
			</main>
		</div>
	);
}
