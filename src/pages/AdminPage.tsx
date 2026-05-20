import {useState, useEffect} from "react";
import {
	getCompetitions,
	createCompetition,
	deleteCompetition,
	patchCompetitionStatus,
} from "@/services/authApi";
import {useAuthStore} from "@/store/authStore";
import type {Competition, CompetitionStatus} from "@/types/auth";

const STATUS_LABEL: Record<CompetitionStatus, string> = {
	PREPARING: "준비 중",
	ONGOING: "진행 중",
	FINISHED: "종료",
	CANCELED: "취소",
};

export function AdminPage() {
	const {token} = useAuthStore();

	return (
		<div className="max-w-screen-lg mx-auto px-6 py-8">
			<h1 className="text-xl font-bold text-gray-100 mb-6">
				관리자 페이지
			</h1>
			<CompetitionTab token={token!} />
		</div>
	);
}

function CompetitionTab({token}: {token: string}) {
	const [competitions, setCompetitions] = useState<Competition[]>([]);
	const [showForm, setShowForm] = useState(false);
	const [loading, setLoading] = useState(false);
	const [form, setForm] = useState({
		name: "",
		type: "PERSONAL",
		description: "",
		firstSeed: 10000000,
		registerStartAt: "",
		registerEndAt: "",
		competitionStartAt: "",
		competitionEndAt: "",
		minParticipants: 2,
		maxParticipants: 100,
	});

	const load = () =>
		getCompetitions({size: 100})
			.then(setCompetitions)
			.catch(() => {});

	useEffect(() => {
		load();
	}, []);

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		try {
			await createCompetition(
				{
					...form,
					registerStartAt: form.registerStartAt + ":00",
					registerEndAt: form.registerEndAt + ":00",
					competitionStartAt: form.competitionStartAt + ":00",
					competitionEndAt: form.competitionEndAt + ":00",
				},
				token,
			);
			setShowForm(false);
			setForm({
				name: "",
				type: "GROUP",
				description: "",
				firstSeed: 10000000,
				registerStartAt: "",
				registerEndAt: "",
				competitionStartAt: "",
				competitionEndAt: "",
				minParticipants: 2,
				maxParticipants: 100,
			});
			load();
		} catch (e: any) {
			alert(e?.message ?? "생성 실패");
		} finally {
			setLoading(false);
		}
	};

	const handlePatch = async (
		id: string,
		action: "publications" | "starts" | "finishes" | "cancellations",
	) => {
		try {
			await patchCompetitionStatus(id, action, token);
			load();
		} catch (e: any) {
			alert(e?.message ?? "상태 변경 실패");
		}
	};

	const handleDelete = async (id: string) => {
		if (!confirm("대회를 삭제하시겠습니까?~")) return;
		try {
			await deleteCompetition(id, token);
			load();
		} catch (e: any) {
			alert(e?.message ?? "삭제 실패");
		}
	};

	const f =
		(k: keyof typeof form) =>
		(
			e: React.ChangeEvent<
				HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
			>,
		) =>
			setForm((p) => ({...p, [k]: e.target.value}));

	return (
		<div>
			<div className="flex justify-between items-center mb-4">
				<p className="text-sm text-gray-500">
					{competitions.length}개 대회
				</p>
				<button
					onClick={() => setShowForm(!showForm)}
					className="text-xs px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
				>
					+ 대회 추가
				</button>
			</div>

			{showForm && (
				<form
					onSubmit={handleCreate}
					className="bg-gray-900 border border-gray-700 rounded-2xl p-5 mb-5 flex flex-col gap-3"
				>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<input
							placeholder="대회 이름"
							value={form.name}
							onChange={f("name")}
							required
							className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500 sm:col-span-2"
						/>
						<textarea
							placeholder="설명"
							value={form.description}
							onChange={f("description")}
							rows={2}
							className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500 sm:col-span-2 resize-none"
						/>
						<select
							value={form.type}
							onChange={f("type")}
							className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500"
						>
							<option value="GROUP">GROUP</option>
							<option value="PERSONAL">PERSONAL</option>
						</select>
						<input
							type="number"
							placeholder="시작 자산 (firstSeed)"
							value={form.firstSeed}
							onChange={f("firstSeed")}
							required
							className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500"
						/>
						<div>
							<label className="text-[10px] text-gray-500 mb-1 block">
								신청 시작
							</label>
							<input
								type="datetime-local"
								value={form.registerStartAt}
								onChange={f("registerStartAt")}
								required
								className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500"
							/>
						</div>
						<div>
							<label className="text-[10px] text-gray-500 mb-1 block">
								신청 종료
							</label>
							<input
								type="datetime-local"
								value={form.registerEndAt}
								onChange={f("registerEndAt")}
								required
								className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500"
							/>
						</div>
						<div>
							<label className="text-[10px] text-gray-500 mb-1 block">
								대회 시작
							</label>
							<input
								type="datetime-local"
								value={form.competitionStartAt}
								onChange={f("competitionStartAt")}
								required
								className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500"
							/>
						</div>
						<div>
							<label className="text-[10px] text-gray-500 mb-1 block">
								대회 종료
							</label>
							<input
								type="datetime-local"
								value={form.competitionEndAt}
								onChange={f("competitionEndAt")}
								required
								className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500"
							/>
						</div>
						<input
							type="number"
							placeholder="최소 인원"
							value={form.minParticipants}
							onChange={f("minParticipants")}
							required
							className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500"
						/>
						<input
							type="number"
							placeholder="최대 인원"
							value={form.maxParticipants}
							onChange={f("maxParticipants")}
							required
							className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500"
						/>
					</div>
					<div className="flex gap-2 justify-end">
						<button
							type="button"
							onClick={() => setShowForm(false)}
							className="text-xs px-4 py-2 rounded-lg text-gray-400 hover:text-gray-200"
						>
							취소
						</button>
						<button
							type="submit"
							disabled={loading}
							className="text-xs px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
						>
							{loading ? "생성 중..." : "생성"}
						</button>
					</div>
				</form>
			)}

			<div className="flex flex-col gap-3">
				{competitions.length === 0 ? (
					<p className="text-center py-10 text-gray-600 text-sm">
						대회가 없습니다.
					</p>
				) : (
					competitions.map((c) => (
						<div
							key={c.competitionId}
							className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
						>
							<div className="flex items-start justify-between mb-3">
								<div>
									<p className="text-sm font-semibold text-gray-200">
										{c.name}
									</p>
									<p className="text-xs text-gray-500 mt-0.5 font-mono">
										{STATUS_LABEL[c.status]} ·{" "}
										{c.currentRegisters}명
									</p>
								</div>
								<button
									onClick={() =>
										handleDelete(c.competitionId)
									}
									className="text-[10px] px-3 py-1.5 rounded-lg bg-red-950 hover:bg-red-900 text-red-400 transition-colors ml-4 flex-shrink-0"
								>
									삭제
								</button>
							</div>
							<div className="flex flex-wrap gap-1.5">
								{(
									[
										"publications",
										"starts",
										"finishes",
										"cancellations",
									] as const
								).map((action) => (
									<button
										key={action}
										onClick={() =>
											handlePatch(c.competitionId, action)
										}
										className={`text-[10px] px-3 py-1.5 rounded-lg transition-colors ${
											action === "cancellations"
												? "bg-red-950 hover:bg-red-900 text-red-400"
												: "bg-gray-800 hover:bg-gray-700 text-gray-300"
										}`}
									>
										{action}
									</button>
								))}
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}
