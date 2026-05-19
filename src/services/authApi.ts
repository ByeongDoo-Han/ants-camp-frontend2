import type {
  User,
  LoginRequest, RegisterRequest, AuthResponse,
  Competition, CompetitionRanking, CompetitionParticipant, CompetitionChangeNotice,
  AccountResult, AssetResult, HoldingItem, AccountPortfolio,
} from '@/types/auth'
/** 응답에서 에러 메시지를 추출합니다. JSON·텍스트·상태코드 순으로 시도합니다. */
async function extractError(res: Response): Promise<string> {
  try {
    const json = await res.json()
    // ApiResponse 래퍼: { status, code, message, data }
    if (json?.message) return json.message
    // Spring 기본 오류: { error, message, ... }
    if (json?.error) return `${json.error}${json.message ? ': ' + json.message : ''}`
    return `서버 오류 (${res.status})`
  } catch {
    // JSON 파싱 실패 → 텍스트로 시도
    try {
      const text = await res.text()
      if (text && text.length < 200) return text
    } catch { /* ignore */ }
    return `서버 오류 (${res.status} ${res.statusText || ''})`
  }
}

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(await extractError(res))
  const json = await res.json()
  // ApiResponse<T> 래퍼 or 직접 T
  return ('data' in json ? json.data : json) as T
}

function authHeaders(accessToken?: string | null): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }
}

/**
 * 401 시 refresh token으로 자동 갱신 후 재시도하는 fetch 래퍼
 */
export async function fetchWithAuth(
  input: RequestInfo,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(input, init)

  if (res.status !== 401) return res

  // 토큰 갱신 시도
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) {
    // refresh token 없으면 로그아웃 처리
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    window.location.href = '/login'
    return res
  }

  try {
    const refreshRes = await fetch('/api/auth/reissue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (!refreshRes.ok) throw new Error('refresh failed')

    const json = await refreshRes.json()
    const data: AuthResponse = 'data' in json ? json.data : json

    // 새 토큰 저장
    localStorage.setItem('accessToken', data.accessToken)
    if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken)

    // 원래 요청 재시도 (새 토큰으로)
    const newInit: RequestInit = {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${data.accessToken}`,
      },
    }
    return fetch(input, newInit)
  } catch {
    // refresh 실패 → 로그아웃
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    window.location.href = '/login'
    return res
  }
}

// ── 인증 (/api/auth) ───────────────────────────────────────────────────────

/** POST /api/auth/login */
export async function login(req: LoginRequest): Promise<AuthResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  return unwrap<AuthResponse>(res)
}

/** POST /api/auth/login (어드민도 동일 엔드포인트, 역할은 서버가 검증) */
export async function adminLogin(req: LoginRequest): Promise<AuthResponse> {
  return login(req)
}

/** POST /api/auth/logout */
export async function logout(refreshToken: string): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
}

/** POST /api/auth/reissue */
export async function reissueToken(refreshToken: string): Promise<AuthResponse> {
  const res = await fetch('/api/auth/reissue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  return unwrap<AuthResponse>(res)
}

// ── 사용자 (/api/users) ────────────────────────────────────────────────────

/** POST /api/users/register */
export async function register(req: RegisterRequest): Promise<void> {
  const res = await fetch('/api/users/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) throw new Error(await extractError(res))
}

/** GET /api/users/me  — 서버에서 최신 사용자 정보 조회 */
export async function getMyInfo(userId: string, token: string): Promise<User> {
  const res = await fetchWithAuth('/api/users/me', {
    headers: { ...authHeaders(token), 'X-User-Id': userId },
  })
  return unwrap<User>(res)
}

// ── 대회 (/api/competitions) ───────────────────────────────────────────────

/** GET /api/competitions?status=&page=&size= → Page<FindCompetitionResponse> */
export async function getCompetitions(params?: {
  status?: string
  page?:   number
  size?:   number
}): Promise<Competition[]> {
  const q = new URLSearchParams()
  if (params?.status) q.set('status', params.status)
  if (params?.page   != null) q.set('page', String(params.page))
  if (params?.size   != null) q.set('size', String(params.size))
  const res = await fetch(`/api/competitions?${q}`, {
    headers: authHeaders(localStorage.getItem('accessToken')),
  })
  if (!res.ok) {
    const errText = await res.text()
    console.error('[getCompetitions] 오류 응답:', res.status, errText)
    throw new Error(errText || `서버 오류 (${res.status})`)
  }
  const json = await res.json()
  // 페이지 응답인 경우 .content 추출, 아니면 배열 그대로
  const raw = json?.data ?? json
  return Array.isArray(raw) ? raw : (raw?.content ?? [])
}

/** GET /api/competitions/{id} */
export async function getCompetition(id: string): Promise<Competition> {
  const res = await fetch(`/api/competitions/${id}`, {
    headers: authHeaders(localStorage.getItem('accessToken')),
  })
  return unwrap<Competition>(res)
}

/** PATCH /api/competitions/{id} — 대회 정보 수정 */
export interface UpdateCompetitionRequest {
  name:               string
  description:        string
  registerStartAt:    string
  registerEndAt:      string
  competitionStartAt: string
  competitionEndAt:   string
  minParticipants:    number
  maxParticipants:    number
  beforeContents?:    string
  afterContents?:     string
  reason?:            string
  updatedBy?:         string
}

export async function updateCompetition(
  id: string,
  req: UpdateCompetitionRequest,
  accessToken: string,
): Promise<Competition> {
  const res = await fetch(`/api/competitions/${id}`, {
    method:  'PATCH',
    headers: authHeaders(accessToken),
    body:    JSON.stringify(req),
  })
  return unwrap<Competition>(res)
}

/** PATCH /api/competitions/{id}/publish|start|finish|cancel */
export async function patchCompetitionStatus(
  id: string,
  action: 'publications' | 'starts' | 'finishes' | 'cancellations',
  accessToken: string,
): Promise<Competition> {
  const res = await fetch(`/api/competitions/${id}/${action}`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  })
  return unwrap<Competition>(res)
}

/**
 * POST /api/competitions  (대회 생성)
 * 기존 createCompetition(req, token) 시그니처 유지
 */
export async function createCompetition(
  req: {
    name: string
    type: string
    description: string
    firstSeed: number
    registerStartAt: string
    registerEndAt: string
    competitionStartAt: string
    competitionEndAt: string
    minParticipants: number
    maxParticipants: number
  },
  accessToken: string,
): Promise<void> {
  const res = await fetch('/api/competitions', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(req),
  })
  if (!res.ok) throw new Error(await extractError(res))
}

/**
 * DELETE /api/competitions/{id}?deletedBy=
 * 기존 deleteCompetition(id, token) 시그니처 유지
 */
export async function deleteCompetition(
  id: string,
  accessToken: string,
  deletedBy = 'admin',
): Promise<void> {
  const res = await fetch(
    `/api/competitions/${id}?deletedBy=${encodeURIComponent(deletedBy)}`,
    { method: 'DELETE', headers: authHeaders(accessToken) },
  )
  if (!res.ok) throw new Error(await extractError(res))
}

/** GET /api/competitions/{id}/change-notices */
export async function getChangeNotices(
  competitionId: string,
): Promise<CompetitionChangeNotice[]> {
  const res = await fetch(`/api/competitions/${competitionId}/change-notices`, {
    headers: authHeaders(localStorage.getItem('accessToken')),
  })
  return unwrap<CompetitionChangeNotice[]>(res)
}

// ── 대회 참가자 ────────────────────────────────────────────────────────────

/** GET /api/competitions/{competitionId}/participants */
export async function getParticipants(
  competitionId: string,
): Promise<CompetitionParticipant[]> {
  const res = await fetch(`/api/competitions/${competitionId}/participants`, {
    headers: authHeaders(localStorage.getItem('accessToken')),
  })
  return unwrap<CompetitionParticipant[]>(res)
}

/**
 * POST /api/competitions/{competitionId}/participants
 * Header: X-User-Id, X-User-Name (URL encoded)
 */
export async function joinCompetition(
  competitionId: string,
  userId: string,
  nickname: string,
  accessToken?: string,
): Promise<CompetitionParticipant> {
  const res = await fetch(`/api/competitions/${competitionId}/participants`, {
    method: 'POST',
    headers: {
      ...authHeaders(accessToken),
      'X-User-Id': userId,
      'X-User-Name': encodeURIComponent(nickname),
    },
  })
  return unwrap<CompetitionParticipant>(res)
}

/** DELETE /api/competitions/{competitionId}/participants */
export async function cancelJoinCompetition(
  competitionId: string,
  userId: string,
  nickname: string,
  accessToken?: string,
): Promise<CompetitionParticipant> {
  const res = await fetch(`/api/competitions/${competitionId}/participants`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ userId, nickname }),
  })
  return unwrap<CompetitionParticipant>(res)
}

// ── 랭킹 (/api/rankings) ──────────────────────────────────────────────────

/** GET /api/rankings/competitions/{competitionId}/me — 내 순위 */
export async function getMyRanking(
  competitionId: string,
): Promise<CompetitionRanking | null> {
  try {
    const res = await fetch(`/api/rankings/competitions/${competitionId}/me`, {
      headers: authHeaders(localStorage.getItem('accessToken')),
    })
    if (!res.ok) return null
    const json = await res.json()
    const d = 'data' in json ? json.data : json
    return { rank: Number(d.rank), userId: String(d.userId), totalAsset: Number(d.totalAsset) }
  } catch {
    return null
  }
}

/** POST /api/rankings/competitions/{competitionId}/finalize — 최종 순위 확정 */
export async function finalizeRankings(competitionId: string): Promise<void> {
  const res = await fetch(`/api/rankings/competitions/${competitionId}/finalize`, {
    method:  'POST',
    headers: authHeaders(localStorage.getItem('accessToken')),
  })
  if (!res.ok) throw new Error(await extractError(res))
}

/** GET /api/rankings/competitions/{competitionId}?page=&size= */
export async function getCompetitionRankings(
  competitionId: string,
  page = 0,
  size = 50,
): Promise<CompetitionRanking[]> {
  const res = await fetch(
    `/api/rankings/competitions/${competitionId}?page=${page}&size=${size}`,
    { headers: authHeaders(localStorage.getItem('accessToken')) },
  )
  const json = await res.json()
  if (!res.ok) throw new Error(json?.message ?? '랭킹 조회 실패')
  // 직접 배열 or ApiResponse<배열>
  return Array.isArray(json) ? json : (json?.data ?? json?.content ?? [])
}

// ── 계좌 / 자산 / 보유 종목 (/api/accounts, /api/assets, /api/holdings) ───

/** GET /api/accounts/{accountId}  (Header: X-User-Id) */
export async function getAccount(
  accountId: string,
  userId: string,
  accessToken?: string,
): Promise<AccountResult> {
  const res = await fetch(`/api/accounts/${accountId}`, {
    headers: { ...authHeaders(accessToken), 'X-User-Id': userId },
  })
  return unwrap<AccountResult>(res)
}

/** GET /api/assets?accountId=  (Header: X-User-Id) */
export async function getAsset(
  accountId: string,
  userId: string,
  token?: string,
): Promise<AssetResult> {
  const res = await fetch(`/api/assets?accountId=${accountId}`, {
    headers: { ...authHeaders(token), 'X-User-Id': userId },
  })
  return unwrap<AssetResult>(res)
}

/** GET /api/holdings?accountId=  (Header: X-User-Id) */
export async function getHoldings(
  accountId: string,
  userId: string,
  accessToken?: string,
): Promise<HoldingItem[]> {
  const res = await fetch(`/api/holdings?accountId=${accountId}`, {
    headers: { ...authHeaders(accessToken), 'X-User-Id': userId },
  })
  return unwrap<HoldingItem[]>(res)
}

/**
 * 계좌 + 자산 + 보유 종목을 한 번에 조회해서 AccountPortfolio 로 반환
 * (기존 getAccountDetail 대체)
 */
export async function getAccountDetail(
  accountId: string,
  userId: string,
  accessToken?: string,
): Promise<AccountPortfolio> {
  const [account, asset, holdings] = await Promise.all([
    getAccount(accountId, userId, accessToken),
    getAsset(accountId, userId, accessToken),
    getHoldings(accountId, userId, accessToken),
  ])
  return { account, asset, holdings }
}

/** GET /api/accounts — 내 계좌 목록 (게이트웨이가 X-User-Id 자동 주입) */
export async function getMyAccounts(token?: string): Promise<AccountResult[]> {
  const res = await fetch('/api/accounts', { headers: authHeaders(token) })
  if (!res.ok) return []
  const json = await res.json().catch(() => null)
  if (!json) return []
  const data = 'data' in json ? json.data : json
  return Array.isArray(data) ? data : []
}


// ── 매매 이력: 백엔드 미지원 → 빈 배열 반환 ──────────────────────────────
export async function getTradeHistory(
  _accountId: string,
  _accessToken: string,
): Promise<never[]> {
  return []
}

// ── 장 운영 상태 ─────────────────────────────────────────────────────────────

export interface MarketStatus {
  openTime:  string
  closeTime: string
  isHoliday: boolean
  message:   string
}

export async function getMarketStatus(): Promise<MarketStatus | null> {
  try {
    const res = await fetch('/api/market/status', {
      headers: authHeaders(localStorage.getItem('accessToken')),
    })
    if (!res.ok) return null
    const json = await res.json()
    return ('data' in json ? json.data : json) as MarketStatus
  } catch {
    return null
  }
}

// ── 어드민: 사용자 관리 ──────────────────────────────────────────────────────

export interface AdminUser {
  userId: string
  email:  string
  name:   string
  role:   string
  phone:  string
}

export interface CreateManagerRequest {
  email:    string
  password: string
  name:     string
  phone:    string
}

/** GET /api/admin/users */
export async function getAllUsers(): Promise<AdminUser[]> {
  const res = await fetch('/api/admin/users', {
    headers: authHeaders(localStorage.getItem('accessToken')),
  })
  return unwrap<AdminUser[]>(res)
}

/** POST /api/admin/users/manager */
export async function createManager(req: CreateManagerRequest): Promise<AdminUser> {
  const res = await fetch('/api/admin/users/manager', {
    method:  'POST',
    headers: authHeaders(localStorage.getItem('accessToken')),
    body:    JSON.stringify(req),
  })
  return unwrap<AdminUser>(res)
}

// ── 프로필 수정: 백엔드 미지원 → stub ─────────────────────────────────────
export async function updateProfile(
  _req: { nickname: string; password?: string },
  _accessToken: string,
): Promise<void> {
  throw new Error('프로필 수정 기능은 현재 지원되지 않습니다.')
}
