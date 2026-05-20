// ── 사용자 ────────────────────────────────────────────────────────────────
export interface User {
	userId: string;
	email: string;
	name: string; // 백엔드 UserResponse.name (닉네임 아님)
	role: string; // 'USER' | 'ADMIN' | 'MANAGER'
	phone: string;
}

export interface LoginRequest {
	email: string;
	password: string;
}

export interface RegisterRequest {
	email: string;
	password: string;
	name: string; // 이름
	phone: string; // 전화번호
}

export interface AuthResponse {
	accessToken: string;
	refreshToken: string;
	user: User;
}

// ── 대회 ──────────────────────────────────────────────────────────────────
export type CompetitionStatus =
	| "PREPARING"
	| "ONGOING"
	| "FINISHED"
	| "CANCELED";
export type CompetitionType = "GROUP" | "PERSONAL";

/** FindCompetitionResponse 와 1:1 대응 */
export interface Competition {
	competitionId: string;
	name: string; // (구) title
	type: CompetitionType;
	status: CompetitionStatus;
	description: string;
	firstSeed: number; // 초기 시드 자금
	isReadable: boolean;
	registerStartAt: string;
	registerEndAt: string;
	competitionStartAt: string; // (구) startDate
	competitionEndAt: string; // (구) endDate
	minParticipants: number;
	maxParticipants: number;
	currentRegisters: number; // (구) participantCount
}

export interface CompetitionChangeNotice {
	noticeId: string;
	competitionId: string;
	beforeContents: string;
	afterContents: string;
	reason: string;
	updatedBy: string;
	createdAt: string;
}

export interface CompetitionParticipant {
	participantId: string;
	userId: string;
	username: string; // 백엔드 응답 필드 (form 의 nickname 이 username 으로 저장됨)
	competitionId: string;
}

/** RankingResponse / MyRankingResponse 와 1:1 대응 */
export interface CompetitionRanking {
	rank: number;
	userId: string;
	totalAsset: number;
	// 백엔드는 참가자 nickname 을 username 키로 응답 (참가자 API 와 동일)
	username?: string;
}

// ── 계좌 (asset-service) ───────────────────────────────────────────────────
export interface AccountResult {
	accountId: string;
	accountNumber: string;
	accountAmount: number;
}

export interface AssetResult {
	accountId: string;
	accountAmount: number; // 현금 잔고
	holdingEvaluationAmount: number; // 주식 평가액
	totalAssetAmount: number; // 총 자산
}

export interface HoldingItem {
	holdingId: string;
	accountId: string;
	stockCode: string;
	stockAmount: number;
	buyPrice: number; // 매수 단가
	finalPrice: number; // 현재 단가
}

/** AccountResult + AssetResult + Holdings 를 합쳐서 사용하는 화면용 타입 */
export interface AccountPortfolio {
	account: AccountResult;
	asset: AssetResult;
	holdings: HoldingItem[];
}

// ── 매매 이력 (현재 백엔드 엔드포인트 없음 - 구조만 유지) ─────────────────
export interface TradeHistory {
	tradeId: string;
	stockCode: string;
	stockName: string;
	tradeType: "BUY" | "SELL";
	orderType: "MARKET" | "LIMIT";
	quantity: number;
	price: number;
	totalPrice: number;
	tradeAt: string;
	status: "SUCCESS" | "PENDING" | "FAIL" | "CANCELLED";
}

// ── 어드민 매니저 (현재 백엔드 엔드포인트 없음 - 구조만 유지) ─────────────
export interface Manager {
	userId: string;
	email: string;
	nickname: string;
	createdAt: string;
}

export interface MyRankingHistory {
	competitionId: string;
	rankTier: string;
	lastUpdatedAt: string;
}
