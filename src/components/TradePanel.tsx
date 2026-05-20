import {useState, useEffect, useRef} from "react";
import {
	placeOrderBuy,
	placeOrderSell,
	cancelPendingOrder,
} from "@/services/stockApi";
import {getMyAccounts} from "@/services/authApi";
import {useStockStore} from "@/store/stockStore";
import {useAuthStore} from "@/store/authStore";
import type {OrderType, TradeOrderResponse} from "@/types/stock";
import type {AccountResult} from "@/types/auth";

interface Props {
	stockCode: string;
	stockName: string;
	currentPrice: number | null;
}

type Side = "BUY" | "SELL";

const fmt = (n: number) => n.toLocaleString("ko-KR");

export function TradePanel({stockCode, stockName, currentPrice}: Props) {
	const accountId = useStockStore((s) => s.accountId);
	const setAccountId = useStockStore((s) => s.setAccountId);
	const token = useAuthStore((s) => s.token);

	const [side, setSide] = useState<Side>("BUY");
	const [orderType, setOrderType] = useState<OrderType>("MARKET");
	const [amount, setAmount] = useState("1");
	const [limitPrice, setLimitPrice] = useState("");
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<TradeOrderResponse | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [cancelling, setCancelling] = useState(false);

	// 계좌 드롭다운
	const [accounts, setAccounts] = useState<AccountResult[]>([]);
	const [showAccounts, setShowAccounts] = useState(false);
	const [loadingAccounts, setLoadingAccounts] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// 드롭다운 외부 클릭 시 닫기
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(e.target as Node)
			) {
				setShowAccounts(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () =>
			document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleFetchAccounts = async () => {
		if (showAccounts) {
			setShowAccounts(false);
			return;
		}
		setLoadingAccounts(true);
		try {
			const list = await getMyAccounts(token ?? undefined);
			setAccounts(list);
			setShowAccounts(true);
		} catch {
			setError("계좌 목록 조회 실패");
		} finally {
			setLoadingAccounts(false);
		}
	};

	const handleSelectAccount = (acc: AccountResult) => {
		setAccountId(acc.accountId);
		setShowAccounts(false);
		setError(null);
	};

	// 종목 변경 시 결과 초기화
	useEffect(() => {
		setResult(null);
		setError(null);
	}, [stockCode]);

	// 지정가로 전환 시 현재가를 기본값으로
	useEffect(() => {
		if (orderType === "LIMIT" && currentPrice && !limitPrice) {
			setLimitPrice(String(currentPrice));
		}
	}, [orderType]); // eslint-disable-line react-hooks/exhaustive-deps

	const qty = parseInt(amount) || 0;
	const price =
		orderType === "MARKET" ? currentPrice : parseFloat(limitPrice) || null;
	const total = price && qty ? price * qty : null;

	const handleTrade = async () => {
		if (!accountId.trim()) {
			setError("계좌 ID를 입력하세요");
			return;
		}
		if (qty <= 0) {
			setError("수량을 1 이상 입력하세요");
			return;
		}
		if (
			orderType === "LIMIT" &&
			(!limitPrice || parseFloat(limitPrice) <= 0)
		) {
			setError("지정가를 입력하세요");
			return;
		}

		setLoading(true);
		setError(null);
		setResult(null);

		try {
			const req = {
				stockCode,
				stockAmount: qty,
				orderType,
				accountId: accountId.trim(),
				...(orderType === "LIMIT" && {
					limitPrice: parseFloat(limitPrice),
				}),
			};
			const fn = side === "BUY" ? placeOrderBuy : placeOrderSell;
			const res = await fn(req, accountId.trim());
			setResult(res);
		} catch (e) {
			setError(e instanceof Error ? e.message : "주문 실패");
		} finally {
			setLoading(false);
		}
	};

	const handleCancel = async () => {
		if (!result?.tradeId || !accountId.trim()) return;
		setCancelling(true);
		setError(null);
		try {
			const res = await cancelPendingOrder(
				result.tradeId,
				accountId.trim(),
			);
			setResult(res);
		} catch (e) {
			setError(e instanceof Error ? e.message : "취소 실패");
		} finally {
			setCancelling(false);
		}
	};

	const isBuy = side === "BUY";

	return (
		<div className="flex flex-col gap-3 text-sm">
			{/* ── 계좌 선택 ──────────────────────────────────────── */}
			<div className="relative" ref={dropdownRef}>
				<div className="flex items-center justify-between mb-1">
					<label className="text-xs text-gray-500">계좌</label>
					<button
						onClick={handleFetchAccounts}
						disabled={loadingAccounts}
						className="text-[10px] px-2 py-0.5 rounded bg-indigo-800 hover:bg-indigo-700 text-indigo-200 transition-colors disabled:opacity-50"
					>
						{loadingAccounts ? "조회 중…" : "계좌 조회"}
					</button>
				</div>

				{/* 선택된 계좌 표시 */}
				<div className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-gray-200 min-h-[30px]">
					{accountId ? (
						(() => {
							const acc = accounts.find(
								(a) => a.accountId === accountId,
							);
							return acc ? (
								<span>
									{acc.accountNumber}{" "}
									<span className="text-gray-500">
										({acc.accountAmount.toLocaleString()}원)
									</span>
								</span>
							) : (
								<span className="text-gray-400 text-[10px] break-all">
									{accountId}
								</span>
							);
						})()
					) : (
						<span className="text-gray-600">계좌를 선택하세요</span>
					)}
				</div>

				{/* 드롭다운 목록 */}
				{showAccounts && (
					<div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
						{accounts.length === 0 ? (
							<p className="text-[11px] text-gray-500 px-3 py-2">
								계좌가 없습니다
							</p>
						) : (
							accounts.map((acc) => (
								<button
									key={acc.accountId}
									onClick={() => handleSelectAccount(acc)}
									className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-indigo-800 ${
										accountId === acc.accountId
											? "bg-indigo-900 text-indigo-200"
											: "text-gray-200"
									}`}
								>
									<p className="font-mono">
										{acc.accountNumber}
									</p>
									<p className="text-[10px] text-gray-400">
										{acc.accountAmount.toLocaleString()}원
									</p>
								</button>
							))
						)}
					</div>
				)}
			</div>

			{/* ── 매수 / 매도 탭 ─────────────────────────────────── */}
			<div className="flex rounded-lg overflow-hidden border border-gray-700">
				{(["BUY", "SELL"] as Side[]).map((s) => (
					<button
						key={s}
						onClick={() => {
							setSide(s);
							setResult(null);
							setError(null);
						}}
						className={`flex-1 py-2 text-xs font-bold transition-colors ${
							side === s
								? s === "BUY"
									? "bg-red-600 text-white"
									: "bg-blue-600 text-white"
								: "bg-gray-800 text-gray-400 hover:text-gray-200"
						}`}
					>
						{s === "BUY" ? "매수" : "매도"}
					</button>
				))}
			</div>

			{/* ── 주문 유형 ─────────────────────────────────────── */}
			<div className="flex rounded-lg overflow-hidden border border-gray-700">
				{(["MARKET", "LIMIT"] as OrderType[]).map((t) => (
					<button
						key={t}
						onClick={() => {
							setOrderType(t);
							setResult(null);
							setError(null);
						}}
						className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
							orderType === t
								? "bg-indigo-700 text-white"
								: "bg-gray-800 text-gray-400 hover:text-gray-200"
						}`}
					>
						{t === "MARKET" ? "시장가" : "지정가"}
					</button>
				))}
			</div>

			{/* ── 종목 + 현재가 ─────────────────────────────────── */}
			<div className="bg-gray-900 rounded-lg px-3 py-2.5 flex items-center justify-between">
				<div>
					<p className="text-[10px] text-gray-500">{stockCode}</p>
					<p className="text-xs font-semibold text-gray-200 truncate max-w-[90px]">
						{stockName}
					</p>
				</div>
				<div className="text-right">
					<p className="text-[10px] text-gray-500 mb-0.5">현재가</p>
					{currentPrice ? (
						<p className="text-base font-mono font-bold text-gray-100">
							{fmt(currentPrice)}
							<span className="text-xs text-gray-500 ml-0.5">
								원
							</span>
						</p>
					) : (
						<p className="text-xs text-gray-600">조회 중…</p>
					)}
				</div>
			</div>

			{/* ── 지정가 입력 ───────────────────────────────────── */}
			{orderType === "LIMIT" && (
				<div>
					<label className="text-xs text-gray-500 mb-1 block">
						지정가 (원)
					</label>
					<div className="relative">
						<input
							type="number"
							min={1}
							value={limitPrice}
							onChange={(e) => setLimitPrice(e.target.value)}
							placeholder="0"
							className="w-full bg-gray-900 border border-indigo-700 rounded-lg px-3 py-2 text-xs font-mono text-gray-100 outline-none focus:border-indigo-500 transition-colors pr-8"
						/>
						<span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">
							원
						</span>
					</div>
					{currentPrice && limitPrice && (
						<p
							className={`text-[10px] mt-1 font-mono ${
								isBuy
									? parseFloat(limitPrice) >= currentPrice
										? "text-yellow-400"
										: "text-green-400"
									: parseFloat(limitPrice) <= currentPrice
										? "text-yellow-400"
										: "text-green-400"
							}`}
						>
							{isBuy
								? parseFloat(limitPrice) >= currentPrice
									? `▲ 현재가(${fmt(currentPrice)}) 이상 — 즉시 체결 가능`
									: `⏳ 현재가(${fmt(currentPrice)}) 초과 시 체결`
								: parseFloat(limitPrice) <= currentPrice
									? `▼ 현재가(${fmt(currentPrice)}) 이하 — 즉시 체결 가능`
									: `⏳ 현재가(${fmt(currentPrice)}) 미만 시 체결`}
						</p>
					)}
				</div>
			)}

			{/* ── 수량 ──────────────────────────────────────────── */}
			<div>
				<label className="text-xs text-gray-500 mb-1 block">수량</label>
				<div className="flex items-center gap-1.5">
					<button
						onClick={() => setAmount(String(Math.max(1, qty - 1)))}
						className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 flex items-center justify-center text-base transition-colors"
					>
						−
					</button>
					<input
						type="number"
						min={1}
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
						className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs font-mono text-center text-gray-100 outline-none focus:border-indigo-500 transition-colors"
					/>
					<button
						onClick={() => setAmount(String(qty + 1))}
						className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 flex items-center justify-center text-base transition-colors"
					>
						+
					</button>
				</div>
				{/* 빠른 수량 */}
				<div className="flex gap-1 mt-1.5">
					{[1, 5, 10, 50].map((n) => (
						<button
							key={n}
							onClick={() => setAmount(String(n))}
							className={`flex-1 py-1 text-[10px] rounded transition-colors ${
								qty === n
									? "bg-indigo-700 text-white"
									: "bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-gray-200"
							}`}
						>
							{n}주
						</button>
					))}
				</div>
			</div>

			{/* ── 예상 금액 ─────────────────────────────────────── */}
			<div className="bg-gray-900 rounded-lg px-3 py-2 flex items-center justify-between">
				<span className="text-[10px] text-gray-500">
					{orderType === "MARKET" ? "시장가" : "지정가"} 예상{" "}
					{isBuy ? "매수" : "매도"}금액
				</span>
				<span
					className={`text-xs font-mono font-bold ${isBuy ? "text-red-400" : "text-blue-400"}`}
				>
					{total ? `${fmt(Math.round(total))}원` : "—"}
				</span>
			</div>

			{/* ── 주문 버튼 ─────────────────────────────────────── */}
			<button
				onClick={handleTrade}
				disabled={loading || qty <= 0}
				className={`w-full py-2.5 rounded-xl font-bold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
					isBuy
						? "bg-red-600 hover:bg-red-500 text-white"
						: "bg-blue-600 hover:bg-blue-500 text-white"
				}`}
			>
				{loading ? (
					<span className="flex items-center justify-center gap-2">
						<svg
							className="w-3.5 h-3.5 animate-spin"
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
						처리 중...
					</span>
				) : (
					`${orderType === "MARKET" ? "시장가" : "지정가"} ${isBuy ? "매수" : "매도"} ${qty}주`
				)}
			</button>

			{/* ── 결과 ──────────────────────────────────────────── */}
			{result && (
				<OrderResult
					result={result}
					onCancel={
						result.status === "PENDING" ? handleCancel : undefined
					}
					cancelling={cancelling}
				/>
			)}

			{/* ── 에러 ──────────────────────────────────────────── */}
			{error && (
				<div className="rounded-xl p-2.5 bg-yellow-950 border border-yellow-800 text-[11px] text-yellow-400 flex items-start gap-1.5">
					<svg
						className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
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
		</div>
	);
}

// ── 체결 결과 카드 ─────────────────────────────────────────────────────────
interface OrderResultProps {
	result: TradeOrderResponse;
	onCancel?: () => void;
	cancelling?: boolean;
}

function OrderResult({result, onCancel, cancelling}: OrderResultProps) {
	const isExecuted = result.status === "EXECUTED";
	const isPending = result.status === "PENDING";
	const isCancelled = result.status === "CANCELLED";
	const isBuy = result.side === "BUY";

	const containerClass = isExecuted
		? isBuy
			? "border-red-800 bg-red-950"
			: "border-blue-800 bg-blue-950"
		: isPending
			? "border-indigo-800 bg-indigo-950"
			: "border-gray-700 bg-gray-900";

	const labelColor = isExecuted
		? isBuy
			? "text-red-400"
			: "text-blue-400"
		: isPending
			? "text-indigo-400"
			: "text-gray-500";

	const statusLabel = isExecuted
		? "✓ 체결 완료"
		: isPending
			? "⏳ 미체결 접수"
			: "✕ 주문 취소";

	return (
		<div className={`rounded-xl p-3 border text-xs ${containerClass}`}>
			{/* 헤더 */}
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-1.5">
					<span className={`font-bold ${labelColor}`}>
						{statusLabel}
					</span>
					<span className="text-gray-500 text-[10px]">
						{result.orderType === "MARKET" ? "시장가" : "지정가"}{" "}
						{isBuy ? "매수" : "매도"}
					</span>
				</div>
				{/* PENDING 일 때만 취소 버튼 */}
				{isPending && onCancel && (
					<button
						onClick={onCancel}
						disabled={cancelling}
						className="text-[10px] px-2 py-0.5 rounded bg-gray-700 hover:bg-red-800 text-gray-300 hover:text-white transition-colors disabled:opacity-50"
					>
						{cancelling ? "취소 중…" : "주문 취소"}
					</button>
				)}
			</div>

			{/* 상세 */}
			<div className="space-y-1 font-mono text-gray-300">
				<Row
					label="종목"
					value={
						result.stockName
							? `${result.stockName} (${result.stockCode})`
							: result.stockCode
					}
				/>
				<Row
					label="수량"
					value={`${result.stockAmount.toLocaleString()}주`}
				/>

				{isExecuted && (
					<>
						<Row
							label="체결가"
							value={`${Math.round(result.executedPrice).toLocaleString()}원`}
						/>
						<Row
							label="총액"
							value={`${Math.round(result.totalAmount).toLocaleString()}원`}
							highlight
						/>
					</>
				)}

				{isPending && (
					<>
						<Row
							label="지정가"
							value={`${Math.round(result.executedPrice).toLocaleString()}원`}
						/>
						{result.tradeId && (
							<div className="mt-1.5 pt-1.5 border-t border-indigo-900">
								<p className="text-[9px] text-indigo-400 mb-0.5">
									주문 ID
								</p>
								<p className="text-[9px] text-gray-500 break-all">
									{result.tradeId}
								</p>
							</div>
						)}
						<p className="text-[9px] text-indigo-300 mt-1">
							조건 충족 시 자동 체결됩니다. 장 마감(15:30) 후
							미체결 주문은 자동 취소됩니다.
						</p>
					</>
				)}

				{isCancelled && (
					<Row
						label="취소된 지정가"
						value={`${Math.round(result.executedPrice).toLocaleString()}원`}
					/>
				)}
			</div>
		</div>
	);
}

function Row({
	label,
	value,
	highlight,
}: {
	label: string;
	value: string;
	highlight?: boolean;
}) {
	return (
		<div className="flex justify-between">
			<span className="text-gray-500">{label}</span>
			<span className={highlight ? "text-yellow-400 font-semibold" : ""}>
				{value}
			</span>
		</div>
	);
}
