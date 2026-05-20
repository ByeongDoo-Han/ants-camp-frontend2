import {unsubscribeStock} from "@/services/stockApi";
import {useStockStore} from "@/store/stockStore";
import type {SubscribedStock} from "@/types/stock";

interface Props {
	stock: SubscribedStock;
	selected: boolean;
}

const fmt = (n: number) => n.toLocaleString("ko-KR");

export function StockCard({stock, selected}: Props) {
	const selectStock = useStockStore((s) => s.selectStock);
	const removeStock = useStockStore((s) => s.removeStock);
	const {price} = stock;

	const dir = price?.direction ?? "FLAT";
	const dirColor =
		dir === "UP"
			? "text-red-400"
			: dir === "DOWN"
				? "text-blue-400"
				: "text-gray-400";
	const bgColor = selected
		? "bg-indigo-150 border-indigo-500"
		: "bg-gray-800 border-gray-700";

	const handleRemove = async (e: React.MouseEvent) => {
		e.stopPropagation();
		try {
			await unsubscribeStock(stock.stockCode);
		} catch {
			/* 무시 */
		}
		removeStock(stock.stockCode);
	};

	return (
		<button
			onClick={() => selectStock(stock.stockCode)}
			className={`w-full text-left rounded-xl border p-3 transition-all hover:border-indigo-500 group ${bgColor}`}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0">
					<p className="text-sm font-semibold text-gray-300 truncate">
						{stock.stockName}
					</p>
					<p className="text-xs font-mono text-gray-500 mt-0.5">
						{stock.stockCode}
					</p>
				</div>
				<span
					onClick={handleRemove}
					className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-lg leading-none flex-shrink-0 cursor-pointer"
					title="구독 해제"
				>
					×
				</span>
			</div>

			{price ? (
				<div className="mt-2">
					<p className={`text-lg font-mono font-bold ${dirColor}`}>
						{fmt(price.currentPrice)}
						<span className="text-xs ml-1">원</span>
					</p>
					<p className={`text-xs font-mono mt-0.5 ${dirColor}`}>
						{dir === "UP" ? "▲" : dir === "DOWN" ? "▼" : "─"}{" "}
						{fmt(Math.abs(price.priceChange))} (
						{price.changeRate > 0 ? "+" : ""}
						{Number(price.changeRate).toFixed(2)}%)
					</p>
					<p className="text-xs text-gray-500 mt-1 font-mono">
						거래량 {fmt(price.volume)}
					</p>
				</div>
			) : (
				<div className="mt-2 flex items-center gap-1.5">
					<span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
					<span className="text-xs text-gray-500">
						데이터 수신 대기 중...
					</span>
				</div>
			)}
		</button>
	);
}
