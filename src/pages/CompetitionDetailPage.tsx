import {useState, useEffect} from "react";
import {useParams, Link} from "react-router-dom";
import {
	ArrowLeft,
	Users,
	Coins,
	Calendar,
	Clock,
	Trophy,
	FileText,
	Megaphone,
} from "lucide-react";
import {
	getCompetition,
	joinCompetition,
	cancelJoinCompetition,
	getParticipants,
	getChangeNotices,
} from "@/services/authApi";
import {useAuthStore} from "@/store/authStore";
import {useThemeStore} from "@/store/themeStore";
import {PageSpinner, PageError, LoadingDots} from "@/components/ui/Spinner";
import {Alert} from "@/components/ui/Alert";
import type {
	Competition,
	CompetitionStatus,
	CompetitionParticipant,
	CompetitionChangeNotice,
} from "@/types/auth";

const STATUS_LABEL: Record<CompetitionStatus, string> = {
	PREPARING: "준비 중",
	ONGOING: "진행 중",
	FINISHED: "종료",
	CANCELED: "취소",
};
const STATUS_CHIP: Record<CompetitionStatus, string> = {
	PREPARING: "chip chip-amber chip-dot",
	ONGOING: "chip chip-emerald chip-dot",
	FINISHED: "chip chip-gray",
	CANCELED: "chip chip-rose chip-dot",
};

const fmt = (n: number) => n.toLocaleString("ko-KR");
const fmtDate = (dt: string) => (dt ? dt.slice(0, 10).replace(/-/g, ".") : "");

function getDDay(comp: Competition): {label: string; value: string} | null {
	const now = Date.now();
	if (comp.status === "ONGOING") {
		const days = Math.ceil(
			(new Date(comp.competitionEndAt).getTime() - now) / 86400000,
		);
		return {label: "종료까지", value: days <= 0 ? "오늘" : `D-${days}`};
	}
	if (comp.status === "PREPARING") {
		const days = Math.ceil(
			(new Date(comp.competitionStartAt).getTime() - now) / 86400000,
		);
		if (days <= 0) return {label: "시작까지", value: "D-DAY"};
		if (days <= 60) return {label: "시작까지", value: `D-${days}`};
	}
	return null;
}

type Tab = "info" | "participants" | "notices";

export function CompetitionDetailPage() {
	const {id} = useParams<{id: string}>();
	const {token, user} = useAuthStore();
	const {isDark} = useThemeStore();

	const [comp, setComp] = useState<Competition | null>(null);
	const [loading, setLoading] = useState(true);
	const [joining, setJoining] = useState(false);
	const [joined, setJoined] = useState(false);
	const [nickname, setNickname] = useState("");
	const [error, setError] = useState<string | null>(null);

	const [tab, setTab] = useState<Tab>("info");
	const [participants, setParticipants] = useState<CompetitionParticipant[]>(
		[],
	);
	const [partLoading, setPartLoading] = useState(false);
	const [notices, setNotices] = useState<CompetitionChangeNotice[]>([]);
	const [noticeLoading, setNoticeLoading] = useState(false);

	useEffect(() => {
		if (!id) return;
		getCompetition(id)
			.then(setComp)
			.catch(() => setError("대회 정보를 불러오지 못했습니다."))
			.finally(() => setLoading(false));
		if (user?.name) setNickname(user.name);

		getParticipants(id)
			.then((list) => {
				setParticipants(list);
				if (user && list.some((p) => p.userId === user.userId)) {
					setJoined(true);
				}
			})
			.catch(() => {
				/* 조회 실패 시 미참가로 간주 */
			});
	}, [id, user?.userId, user?.name]);

	const loadParticipants = async () => {
		if (!id || participants.length > 0) return;
		setPartLoading(true);
		try {
			setParticipants(await getParticipants(id));
		} catch {
			/* 빈 배열 유지 */
		} finally {
			setPartLoading(false);
		}
	};

	const loadNotices = async () => {
		if (!id || notices.length > 0) return;
		setNoticeLoading(true);
		try {
			setNotices(await getChangeNotices(id));
		} catch {
			/* 빈 배열 유지 */
		} finally {
			setNoticeLoading(false);
		}
	};

	const handleTab = (t: Tab) => {
		setTab(t);
		if (t === "participants") loadParticipants();
		if (t === "notices") loadNotices();
	};

	const handleJoin = async () => {
		if (!id || !user) return;
		setJoining(true);
		try {
			await joinCompetition(
				id,
				user.userId,
				nickname || user.name,
				token ?? undefined,
			);
			setJoined(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : "참가 실패");
		} finally {
			setJoining(false);
		}
	};

	const handleCancel = async () => {
		if (!id || !user) return;
		const me = participants.find((p) => p.userId === user.userId);
		const realNickname = me?.username ?? (nickname || user.name);
		try {
			await cancelJoinCompetition(
				id,
				user.userId,
				realNickname,
				token ?? undefined,
			);
			setJoined(false);
			setParticipants((prev) =>
				prev.filter((p) => p.userId !== user.userId),
			);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "취소 실패");
		}
	};

	if (loading) return <PageSpinner />;
	if (error || !comp)
		return <PageError message={error ?? "대회를 찾을 수 없습니다."} />;

	const canJoin = comp.status === "PREPARING" || comp.status === "ONGOING";
	const dday = getDDay(comp);

	// 히어로 라이트/다크 토큰
	const t = isDark
		? {
				bg: "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #0f172a 100%)",
				border: "1px solid transparent",
				glow1: "radial-gradient(circle, rgba(99,102,241,0.28), transparent 70%)",
				glow2: "radial-gradient(circle, rgba(16,185,129,0.18), transparent 70%)",
				title: "#ffffff",
				body: "rgba(255,255,255,0.7)",
				dim: "rgba(255,255,255,0.5)",
				kicker: "rgba(255,255,255,0.4)",
				divider: "rgba(255,255,255,0.18)",
			}
		: {
				bg: "linear-gradient(135deg, #eef2ff 0%, #ffffff 55%, #ecfeff 100%)",
				border: "1px solid #e5e7eb",
				glow1: "radial-gradient(circle, rgba(99,102,241,0.16), transparent 70%)",
				glow2: "radial-gradient(circle, rgba(16,185,129,0.10), transparent 70%)",
				title: "#111827",
				body: "#374151",
				dim: "#6b7280",
				kicker: "#6b7280",
				divider: "#e5e7eb",
			};

	return (
		<div className="max-w-screen-xl mx-auto px-6 py-8">
			<Link
				to="/competitions"
				className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-200 mb-5 transition-colors"
			>
				<ArrowLeft className="w-3.5 h-3.5" />
				목록으로
			</Link>

			{/* 대회 히어로 */}
			<div
				className="relative overflow-hidden rounded-2xl mb-5"
				style={{background: t.bg, border: t.border}}
			>
				<div
					className="absolute -top-24 -right-20 w-72 h-72 rounded-full pointer-events-none"
					style={{background: t.glow1}}
				/>
				<div
					className="absolute -bottom-28 -left-24 w-72 h-72 rounded-full pointer-events-none"
					style={{background: t.glow2}}
				/>

				<div className="relative z-10 p-6 md:p-7">
					{/* 상태 + 참가자 */}
					<div className="flex items-center justify-between mb-4 flex-wrap gap-2">
						<span className={STATUS_CHIP[comp.status]}>
							{STATUS_LABEL[comp.status]}
						</span>
						<span
							className="inline-flex items-center gap-1.5 text-xs font-mono"
							style={{color: t.dim}}
						>
							<Users className="w-3.5 h-3.5" />
							{comp.currentRegisters}명 참가 중
						</span>
					</div>

					{/* 제목 / 설명 */}
					<h1
						className="text-2xl md:text-3xl font-bold mb-2 leading-tight tracking-tight"
						style={{color: t.title}}
					>
						{comp.name}
					</h1>
					<p
						className="text-sm leading-relaxed"
						style={{color: t.body}}
					>
						{comp.description}
					</p>

					{/* 통계 인라인 — 칸 없이 점/디바이더로 분리 */}
					<div className="flex items-center gap-x-5 gap-y-2 mt-5 text-xs flex-wrap">
						<div className="flex items-center gap-2">
							<Coins
								className="w-3.5 h-3.5"
								style={{color: "#fbbf24"}}
							/>
							<span style={{color: t.dim}}>시작 자산</span>
							<span
								className="font-mono font-bold"
								style={{color: t.title}}
							>
								{fmt(comp.firstSeed)}원
							</span>
						</div>
						<div
							className="h-3 w-px"
							style={{background: t.divider}}
						/>
						<div className="flex items-center gap-2">
							<Calendar
								className="w-3.5 h-3.5"
								style={{color: "#a78bfa"}}
							/>
							<span style={{color: t.dim}}>대회 기간</span>
							<span
								className="font-mono"
								style={{color: t.title}}
							>
								{fmtDate(comp.competitionStartAt)} →{" "}
								{fmtDate(comp.competitionEndAt)}
							</span>
						</div>
						{dday && (
							<>
								<div
									className="h-3 w-px"
									style={{background: t.divider}}
								/>
								<div className="flex items-center gap-2">
									<Clock
										className="w-3.5 h-3.5"
										style={{color: "#fb7185"}}
									/>
									<span style={{color: t.dim}}>
										{dday.label}
									</span>
									<span
										className="font-mono font-bold"
										style={{color: t.title}}
									>
										{dday.value}
									</span>
								</div>
							</>
						)}
					</div>
				</div>
			</div>

			{/* 탭 */}
			<div className="flex gap-1 mb-4 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
				{(
					[
						["info", "대회 정보", FileText],
						[
							"participants",
							`참가자 (${comp.currentRegisters})`,
							Users,
						],
						["notices", "변경 공지", Megaphone],
					] as const
				).map(([tabId, label, Icon]) => (
					<button
						key={tabId}
						onClick={() => handleTab(tabId)}
						className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
							tab === tabId
								? "bg-indigo-600 text-white font-medium"
								: "text-gray-400 hover:text-gray-200"
						}`}
					>
						<Icon className="w-3 h-3" />
						{label}
					</button>
				))}
			</div>

			{/* 대회 정보 탭 */}
			{tab === "info" && (
				<>
					<div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-4">
						<p className="kicker mb-3">상세 정보</p>
						<dl className="divide-soft">
							{[
								["대회 시작", fmtDate(comp.competitionStartAt)],
								["대회 종료", fmtDate(comp.competitionEndAt)],
								[
									"신청 기간",
									`${fmtDate(comp.registerStartAt)} ~ ${fmtDate(comp.registerEndAt)}`,
								],
								["시작 자산", `₩${fmt(comp.firstSeed)}`],
								[
									"참가 인원",
									`최소 ${comp.minParticipants}명 ~ 최대 ${comp.maxParticipants}명`,
								],
							].map(([label, value]) => (
								<div
									key={label}
									className="flex items-center justify-between gap-4 py-2.5"
								>
									<dt className="text-[11px] text-gray-500 flex-shrink-0">
										{label}
									</dt>
									<dd className="text-[13px] font-mono font-semibold text-gray-100 truncate">
										{value}
									</dd>
								</div>
							))}
						</dl>

						{canJoin && !joined && (
							<div className="mt-5">
								<div className="mb-3">
									<label className="kicker mb-1.5 block">
										참가 닉네임
									</label>
									<div className="relative">
										<svg
											className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none"
											fill="none"
											stroke="currentColor"
											strokeWidth="1.75"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
											/>
										</svg>
										<input
											type="text"
											value={nickname}
											onChange={(e) =>
												setNickname(e.target.value)
											}
											placeholder={user?.name ?? "닉네임"}
											maxLength={20}
											className="w-full bg-transparent text-sm text-gray-100 placeholder:text-gray-500 outline-none pl-9 pr-3 py-2.5 transition-colors"
											style={{
												borderBottom:
													"1.5px solid var(--border)",
											}}
											onFocus={(e) => {
												e.currentTarget.style.borderBottomColor =
													"var(--accent)";
											}}
											onBlur={(e) => {
												e.currentTarget.style.borderBottomColor =
													"var(--border)";
											}}
										/>
									</div>
								</div>
								<button
									onClick={handleJoin}
									disabled={joining}
									className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors disabled:opacity-50"
								>
									{joining ? "참가 중..." : "대회 참가하기"}
								</button>
							</div>
						)}
						{joined && (
							<div className="mt-4 flex items-center justify-between">
								<p
									className="text-sm font-medium flex items-center gap-1.5"
									style={{color: "var(--emerald-text)"}}
								>
									<svg
										className="w-4 h-4"
										fill="none"
										stroke="currentColor"
										strokeWidth="2.5"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M5 13l4 4L19 7"
										/>
									</svg>
									참가 완료
								</p>
								{comp.status === "PREPARING" && (
									<button
										onClick={handleCancel}
										className="text-xs px-4 py-1.5 rounded-lg border transition-colors"
										style={{
											background: "var(--rose-soft)",
											color: "var(--rose-text)",
											borderColor: "var(--rose-bd)",
										}}
									>
										참가 취소
									</button>
								)}
							</div>
						)}
						{error && <Alert className="mt-3">{error}</Alert>}
					</div>

					<Link
						to={`/competitions/${id}/dashboard`}
						className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-gray-700 text-sm text-gray-300 hover:border-indigo-600 hover:text-indigo-300 transition-colors"
					>
						<Trophy className="w-4 h-4" />
						랭킹 보기
					</Link>
				</>
			)}

			{/* 변경 공지 탭 */}
			{tab === "notices" && (
				<div className="flex flex-col gap-3">
					{noticeLoading ? (
						<div className="flex justify-center py-10">
							<LoadingDots />
						</div>
					) : notices.length === 0 ? (
						<div className="rounded-2xl border border-dashed border-gray-800 px-6 py-10 text-center">
							<Megaphone className="w-8 h-8 mx-auto mb-2 text-gray-500" />
							<p className="text-sm text-gray-400">
								변경 공지가 없습니다
							</p>
						</div>
					) : (
						notices.map((n) => (
							<div
								key={n.noticeId}
								className="row-card bg-gray-900 border border-gray-800 rounded-2xl p-5"
							>
								<div className="flex items-center justify-between mb-3">
									<span className="text-[10px] font-mono text-gray-500">
										{new Date(
											n.createdAt,
										).toLocaleDateString("ko-KR", {
											year: "numeric",
											month: "long",
											day: "numeric",
										})}
									</span>
									<span className="text-[10px] text-gray-500">
										by{" "}
										<span className="font-mono">
											{n.updatedBy}
										</span>
									</span>
								</div>
								{n.reason && (
									<div
										className="flex items-start gap-2 mb-3 rounded-xl px-3 py-2"
										style={{
											background: "var(--amber-soft)",
											border: "1px solid var(--amber-bd)",
										}}
									>
										<span
											style={{color: "var(--amber-text)"}}
										>
											📌
										</span>
										<p
											className="text-xs flex-1 leading-relaxed"
											style={{color: "var(--amber-text)"}}
										>
											{n.reason}
										</p>
									</div>
								)}
								<div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
									<div>
										<p
											className="kicker mb-1"
											style={{fontSize: "9px"}}
										>
											BEFORE
										</p>
										<p className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">
											{n.beforeContents}
										</p>
									</div>
									<span className="text-indigo-400 mt-3.5">
										→
									</span>
									<div>
										<p
											className="kicker mb-1"
											style={{
												fontSize: "9px",
												color: "var(--accent-text)",
											}}
										>
											AFTER
										</p>
										<p className="text-xs text-gray-100 leading-relaxed whitespace-pre-wrap font-medium">
											{n.afterContents}
										</p>
									</div>
								</div>
							</div>
						))
					)}
				</div>
			)}

			{/* 참가자 목록 탭 */}
			{tab === "participants" && (
				<>
					{partLoading ? (
						<div className="flex justify-center py-10">
							<LoadingDots />
						</div>
					) : participants.length === 0 ? (
						<div className="rounded-2xl border border-dashed border-gray-800 px-6 py-10 text-center">
							<Users className="w-8 h-8 mx-auto mb-2 text-gray-500" />
							<p className="text-sm text-gray-400">
								아직 대회가 시작되지 않았습니다.
							</p>
						</div>
					) : (
						<div className="flex flex-col gap-2">
							{participants.map((p, i) => {
								const isMe = p.userId === user?.userId;
								return (
									<div
										key={p.participantId}
										className="row-card rounded-2xl px-4 py-3 flex items-center gap-3"
										style={
											isMe
												? {
														background:
															"var(--accent-soft)",
														border: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)",
													}
												: {
														background:
															"var(--gray-900)",
														border: "1px solid var(--gray-800)",
													}
										}
									>
										<div
											className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-mono font-bold text-xs"
											style={{
												background: isMe
													? "color-mix(in srgb, var(--accent) 22%, transparent)"
													: "var(--accent-soft)",
												color: "var(--accent-text)",
											}}
										>
											{i + 1}
										</div>
										<span
											className="text-sm flex-1 truncate"
											style={
												isMe
													? {
															color: "var(--accent-text)",
															fontWeight: 600,
														}
													: {color: "var(--gray-200)"}
											}
										>
											{p.username}
										</span>
										{isMe && (
											<span className="chip chip-indigo">
												나
											</span>
										)}
									</div>
								);
							})}
						</div>
					)}
				</>
			)}
		</div>
	);
}
