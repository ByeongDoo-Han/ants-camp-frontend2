import { fetchWithAuth } from './authApi'
import type {
  StockSearchResult, CandleData, ApiResponse, MinutePriceResponse,
  TradeRequest, TradeResponse,
  TradeOrderRequest, TradeOrderResponse, PendingOrderResponse,
  Timeframe,
} from '@/types/stock'

const BASE_URL = '/api'

/**
 * 종목 검색
 */
export async function searchStocks(
  query: string,
  limit = 20,
): Promise<StockSearchResult[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) })
  const res = await fetch(`${BASE_URL}/stocks/search?${params}`)
  if (!res.ok) throw new Error('종목 검색 실패')
  return res.json()
}

/**
 * 종목 실시간 구독 등록 (체결가 + 호가 동시)
 */
export async function subscribeStock(stockCode: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/stocks/realtime/${stockCode}`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error(`${stockCode} 구독 등록 실패`)
}

/**
 * 종목 실시간 구독 해제
 */
export async function unsubscribeStock(stockCode: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/stocks/realtime/${stockCode}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(`${stockCode} 구독 해제 실패`)
}

/**
 * KIS WebSocket 연결 상태 확인
 */
export async function getKisStatus(): Promise<string> {
  const res = await fetch(`${BASE_URL}/trades/realtime/status`)
  if (!res.ok) return 'KIS WebSocket 미연결'
  return res.text()
}

// ── 시장가 / 지정가 주문 ──────────────────────────────────────────────────

/**
 * 시장가/지정가 매수  POST /api/trades/order  { side: 'BUY', ... }
 */
export async function placeOrderBuy(
  req: Omit<TradeOrderRequest, 'side'>,
  accountId: string,
): Promise<TradeOrderResponse> {
  return placeOrder({ ...req, side: 'BUY' }, accountId)
}

/**
 * 시장가/지정가 매도  POST /api/trades/order  { side: 'SELL', ... }
 */
export async function placeOrderSell(
  req: Omit<TradeOrderRequest, 'side'>,
  accountId: string,
): Promise<TradeOrderResponse> {
  return placeOrder({ ...req, side: 'SELL' }, accountId)
}

/**
 * 통합 주문  POST /api/trades/order
 * side 포함 전체 요청을 직접 전달할 때 사용
 */
async function placeOrder(
  req: TradeOrderRequest,
  accountId: string,
): Promise<TradeOrderResponse> {
  const token = localStorage.getItem('accessToken')
  const res = await fetchWithAuth(`${BASE_URL}/trades/order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ACCOUNT-ID': accountId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ ...req, accountId }),  // accountId를 body에도 포함
  })
  const json: ApiResponse<TradeOrderResponse> = await res.json()
  if (!res.ok) throw new Error(json.message ?? '주문 실패')
  return json.data
}

/**
 * 미체결 주문 목록 조회  GET /api/trades/pending
 */
export async function getPendingOrders(
  accountId: string,
): Promise<PendingOrderResponse[]> {
  const token = localStorage.getItem('accessToken')
  const res = await fetch(`${BASE_URL}/trades/pending`, {
    headers: {
      'X-ACCOUNT-ID': accountId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  const json: ApiResponse<PendingOrderResponse[]> = await res.json()
  if (!res.ok) throw new Error(json.message ?? '미체결 조회 실패')
  return json.data ?? []
}

/**
 * 미체결 지정가 주문 취소  DELETE /api/trades/order/{tradeId}
 */
export async function cancelPendingOrder(
  tradeId: string,
  accountId: string,
): Promise<TradeOrderResponse> {
  const token = localStorage.getItem('accessToken')
  const res = await fetch(`${BASE_URL}/trades/order/${tradeId}`, {
    method: 'DELETE',
    headers: {
      'X-ACCOUNT-ID': accountId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  const json: ApiResponse<TradeOrderResponse> = await res.json()
  if (!res.ok) throw new Error(json.message ?? '주문 취소 실패')
  return json.data
}

// ── 레거시 매수/매도 (기존 엔드포인트) ───────────────────────────────────

/**
 * 주식 매수
 * POST /api/trades/buy
 * Header: X-ACCOUNT-ID
 * Body: { stockCode, stockAmount }
 */
export async function buyStock(
  req: TradeRequest,
  accountId: string,
): Promise<TradeResponse> {
  const token = localStorage.getItem('accessToken')
  const res = await fetch(`${BASE_URL}/trades/buy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ACCOUNT-ID': accountId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(req),
  })
  const json: ApiResponse<TradeResponse> = await res.json()
  if (!res.ok) throw new Error(json.message ?? '매수 실패')
  return json.data
}

/**
 * 주식 매도
 * POST /api/trades/sell
 * Header: X-ACCOUNT-ID
 * Body: { stockCode, stockAmount }
 */
export async function sellStock(
  req: TradeRequest,
  accountId: string,
): Promise<TradeResponse> {
  const token = localStorage.getItem('accessToken')
  const res = await fetch(`${BASE_URL}/trades/sell`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ACCOUNT-ID': accountId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(req),
  })
  const json: ApiResponse<TradeResponse> = await res.json()
  if (!res.ok) throw new Error(json.message ?? '매도 실패')
  return json.data
}

/**
 * timeframe에 맞는 캔들 데이터를 가져온다.
 *
 * - 1m        → GET /api/trades/price (분봉 원본)
 * - 5m/15m/30m/60m → 1분봉 fetch 후 클라이언트 resample
 * - 1d/1w/1M  → GET /api/trades/chart/daily (기간별 시세)
 */
export async function fetchCandleData(
  stockCode: string,
  timeframe: Timeframe = '1m',
  dateTime?: Date,
): Promise<CandleData[]> {
  if (timeframe === '1d' || timeframe === '1w' || timeframe === '1M') {
    return fetchDailyCandles(stockCode, timeframe)
  }
  // 분봉 계열
  const minuteCandles = await fetchMinuteCandles(stockCode, dateTime)
  if (timeframe === '1m') return minuteCandles
  return resampleCandles(minuteCandles, parseInt(timeframe))  // '5m' → 5
}

// ── 내부: 1분봉 원본 조회 ──────────────────────────────────────────────────
async function fetchMinuteCandles(stockCode: string, dateTime?: Date): Promise<CandleData[]> {
  const dt = dateTime ?? new Date()

  const local = new Date(
    dt.getTime() - dt.getTimezoneOffset() * 60000
  )
  const isoLocal = local.toISOString().slice(0, 19)

  const token = localStorage.getItem('accessToken')
  const params = new URLSearchParams({ stock_code: stockCode, date_time: isoLocal })
  const res = await fetch(`${BASE_URL}/trades/price?${params}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`분봉 조회 실패: ${res.status}`)

  const json: ApiResponse<MinutePriceResponse> = await res.json()
  return (json.data?.output2 ?? [])
    .filter((o) => o.stck_oprc && o.stck_hgpr && o.stck_lwpr && o.stck_prpr)
    .map((o) => ({
      date:   o.stck_bsop_date,
      time:   o.stck_cntg_hour,
      open:   Number(o.stck_oprc),
      high:   Number(o.stck_hgpr),
      low:    Number(o.stck_lwpr),
      close:  Number(o.stck_prpr),
      volume: Number(o.cntg_vol),
    }))
    .reverse()
}

// ── 내부: 기간별 시세 조회 (일/주/월봉) ──────────────────────────────────
interface DailyChartApiResponse {
  output2: Array<{
    stck_bsop_date: string
    stck_oprc: string
    stck_hgpr: string
    stck_lwpr: string
    stck_clpr: string
    acml_vol:  string
  }>
}

async function fetchDailyCandles(stockCode: string, timeframe: '1d' | '1w' | '1M'): Promise<CandleData[]> {
  const periodMap: Record<string, string> = { '1d': 'D', '1w': 'W', '1M': 'M' }
  const period = periodMap[timeframe]

  // start_date / end_date: KST 기준 오늘 ~ 조회 범위
  const today = new Date()
  const toDate = fmtDate(today)

  // 기간별 기본 조회 범위: 일봉 1년 / 주봉 3년 / 월봉 5년
  const rangeYears: Record<string, number> = { D: 1, W: 3, M: 5 }
  const from = new Date(today)
  from.setFullYear(from.getFullYear() - (rangeYears[period] ?? 1))
  const fromDate = fmtDate(from)

  const params = new URLSearchParams({
    stock_code: stockCode,
    start_date: fromDate,
    end_date:   toDate,
    period,
  })
  const token = localStorage.getItem('accessToken')
  const res = await fetch(`${BASE_URL}/trades/chart?${params}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`기간별 차트 조회 실패: ${res.status}`)

  const json: ApiResponse<DailyChartApiResponse> = await res.json()
  return (json.data?.output2 ?? [])
    .filter((o) => o.stck_oprc && o.stck_clpr)
    .map((o) => ({
      date:   o.stck_bsop_date,
      time:   '',
      open:   Number(o.stck_oprc),
      high:   Number(o.stck_hgpr),
      low:    Number(o.stck_lwpr),
      close:  Number(o.stck_clpr),   // 일봉은 stck_clpr
      volume: Number(o.acml_vol),
    }))
    .reverse()  // KIS는 최신순 → 오름차순으로 뒤집기
}

// ── 여러 종목 현재가 일괄 조회 ────────────────────────────────────────────

/**
 * POST /api/trades/stock-price-list
 * 요청: { "stock-list": ["005930", "000660", ...] }
 * 응답: { stockPrice: { "005930": "75000", ... } }
 */
export async function fetchStockPriceList(
  codes: string[],
): Promise<Record<string, number>> {
  const token = localStorage.getItem('accessToken') ?? ''
  try {
    const res = await fetch(`${BASE_URL}/trades/stock-price-list`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ 'stock-list': codes }),
    })
    if (!res.ok) return {}
    const json = await res.json()
    const raw: Record<string, string> = json?.data?.stockPrice ?? json?.stockPrice ?? {}
    return Object.fromEntries(
      Object.entries(raw).map(([code, price]) => [code, Number(price)]),
    )
  } catch {
    return {}
  }
}

// ── 내부: 날짜 → 'YYYYMMDD' 문자열 변환 (KST 기준) ─────────────────────
function fmtDate(d: Date): string {
  const yyyy = d.getFullYear()
  const mm   = String(d.getMonth() + 1).padStart(2, '0')
  const dd   = String(d.getDate()).padStart(2, '0')
  return `${yyyy}${mm}${dd}`
}

// ── 내부: N분봉 집계 (1분봉 → 5/15/30/60분봉) ──────────────────────────
function resampleCandles(candles: CandleData[], minutes: number): CandleData[] {
  if (candles.length === 0) return []
  const result: CandleData[] = []

  for (let i = 0; i < candles.length; i += minutes) {
    const chunk = candles.slice(i, i + minutes)
    if (chunk.length === 0) continue
    result.push({
      date:   chunk[0].date,
      time:   chunk[0].time,
      open:   chunk[0].open,
      high:   Math.max(...chunk.map((c) => c.high)),
      low:    Math.min(...chunk.map((c) => c.low)),
      close:  chunk[chunk.length - 1].close,
      volume: chunk.reduce((s, c) => s + c.volume, 0),
    })
  }
  return result
}
