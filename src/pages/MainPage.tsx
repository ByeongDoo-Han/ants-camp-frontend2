import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Flame } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { useTickerStore } from '@/store/tickerStore'
import { TICKER_STOCKS } from '@/config/stocks'
import { getCompetitions, getMyAccounts, getAsset, getMyRanking } from '@/services/authApi'
import { toKstDate, isTradingDay, nextKrxOpenAt } from '@/utils/krxHolidays'
import { formatAccountLabel } from '@/utils/formatAccount'
import { fetchStockPriceList } from '@/services/stockApi'
import type { CompetitionRanking } from '@/types/auth'
import { MarketTicker }   from '@/components/MarketTicker'
import { HeroSection }    from '@/components/home/HeroSection'
import { GuidesWidget }   from '@/components/home/GuidesWidget'
import { NewsFeed }       from '@/components/NewsFeed'
import { InvestmentQuiz } from '@/components/InvestmentQuiz'
import { LoadingDots }    from '@/components/ui/Spinner'
import type { Competition, AccountResult, AssetResult } from '@/types/auth'

// ── 공통 ────────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString('ko-KR')

function getDDay(comp: Competition): string | null {
  const now = Date.now()
  if (comp.status === 'ONGOING') {
    const d = Math.ceil((new Date(comp.competitionEndAt).getTime() - now) / 86400000)
    return d <= 0 ? '오늘 종료' : `D-${d} 종료`
  }
  if (comp.status === 'PREPARING') {
    const d = Math.ceil((new Date(comp.competitionStartAt).getTime() - now) / 86400000)
    if (d <= 0) return 'D-DAY'
    if (d <= 60) return `D-${d}`
  }
  return null
}

// ── 장 상태 카드 ─────────────────────────────────────────────────────────────
function computeKrxStatus(now: Date) {
  const kst   = toKstDate(now)
  const sec   = kst.getHours() * 3600 + kst.getMinutes() * 60 + kst.getSeconds()
  const open  = 9 * 3600
  const close = 15 * 3600 + 30 * 60

  const f = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
      : `${m}:${String(ss).padStart(2, '0')}`
  }

  // 영업일 + 장 진행 중: 마감까지 카운트다운
  if (isTradingDay(kst) && sec >= open && sec < close) {
    return { isOpen: true, countdown: f(close - sec) }
  }

  // 그 외: 다음 영업일 09:00 까지 카운트다운 (주말 + 휴장일 스킵)
  const remaining = Math.max(0, Math.floor((nextKrxOpenAt(kst).getTime() - kst.getTime()) / 1000))
  return { isOpen: false, countdown: f(remaining) }
}

function MarketStatusCard() {
  const [now, setNow] = useState(new Date())
  const { indexData } = useTickerStore()
  const { isDark } = useThemeStore()

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const { isOpen, countdown } = computeKrxStatus(now)

  const kospi  = indexData.find((d) => d.symbol === '^KS11')
  const kosdaq = indexData.find((d) => d.symbol === '^KQ11')

  const pct = (item: typeof kospi) => {
    if (!item) return null
    const up    = item.changePercent > 0
    const down  = item.changePercent < 0
    const changeColor = up
      ? (dk ? '#f87171' : '#ef4444')
      : down ? (dk ? '#60a5fa' : '#3b82f6')
      : '#9ca3af'
    const arrow = up ? '▲' : down ? '▼' : '━'
    return (
      <div>
        <p className="text-[10px] mb-0.5" style={{ color: dk ? '#94a3b8' : '#6b7280' }}>{item.label}</p>
        <p className="text-[12px] font-mono font-bold" style={{ color: dk ? '#f1f5f9' : '#18181b' }}>
          {item.price.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
        </p>
        <p className="text-[10px] font-medium" style={{ color: changeColor }}>
          {arrow} {Math.abs(item.changePercent).toFixed(2)}%
        </p>
      </div>
    )
  }

  const dk = isDark  // 다크모드 여부 shorthand

  const cardStyle = dk
    ? { background: 'linear-gradient(135deg, #042f2e 0%, #0a1410 60%)', borderColor: '#115e44' }
    : { background: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 60%)', borderColor: '#a7f3d0' }

  return (
    <div className="border rounded-2xl p-5 flex flex-col min-h-[140px]" style={cardStyle}>

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold" style={{ color: dk ? '#6ee7b7' : '#4b5563' }}>KRX 장 상태</span>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full"
          style={dk
            ? { background: 'rgba(16,185,129,0.12)', border: '1px solid #047857', color: '#34d399' }
            : { background: 'white', border: '1px solid #6ee7b7', color: '#059669' }}>
          {isOpen && (
            <span className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: dk ? '#34d399' : '#10b981', boxShadow: dk ? '0 0 6px #34d399' : 'none' }} />
          )}
          {isOpen ? 'OPEN' : 'CLOSED'}
        </span>
      </div>

      {/* 카운트다운 + 지수 */}
      <div className="flex items-start justify-between flex-1 mb-3">
        <div>
          <p className="text-3xl font-bold font-mono tracking-tight leading-none"
            style={{ color: dk ? '#f1f5f9' : '#18181b' }}>{countdown}</p>
          <p className="text-[11px] mt-1" style={{ color: dk ? '#94a3b8' : '#6b7280' }}>
            {isOpen ? '마감까지' : '개장까지'}
          </p>
        </div>
        {(kospi || kosdaq) && <div className="flex gap-3">{pct(kospi)}{pct(kosdaq)}</div>}
      </div>

      {/* 하단 */}
      <div className="flex items-center justify-between pt-2.5"
        style={{ borderTop: `1px solid ${dk ? '#115e44' : '#d1fae5'}` }}>
        <span className="text-[10px]" style={{ color: dk ? '#94a3b8' : '#6b7280' }}>정규 거래</span>
        <span className="text-[10px] font-mono" style={{ color: dk ? '#94a3b8' : '#6b7280' }}>09:00 ~ 15:30 KST</span>
      </div>
    </div>
  )
}

// ── 내 계좌 스냅샷 ────────────────────────────────────────────────────────────
function PortfolioSnapshotCard() {
  const { user, token } = useAuthStore()
  const [account, setAccount] = useState<AccountResult | null>(null)
  const [asset,   setAsset]   = useState<AssetResult   | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    getMyAccounts(localStorage.getItem("accessToken") ?? undefined)
      .then(async (accounts) => {
        if (!accounts.length) { setLoading(false); return }
        const acc = accounts[0]
        setAccount(acc)
        setAsset(await getAsset(acc.accountId, user.userId, token ?? undefined))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user, token])

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5 flex flex-col justify-between min-h-[140px] dark:bg-gray-900 dark:border-gray-800">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-500">내 포트폴리오</span>
        <Link to="/portfolio" className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors">
          상세 보기 →
        </Link>
      </div>
      {loading ? (
        <div className="flex justify-center py-4"><LoadingDots /></div>
      ) : !asset ? (
        <div className="flex-1 flex flex-col justify-center items-center gap-2.5 py-2">
          <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-xl">📊</div>
          <div className="text-center">
            <p className="text-xs text-gray-500 font-medium">연결된 계좌가 없습니다</p>
            <p className="text-[10px] text-gray-700 mt-0.5">대회 참가 시 자동 생성됩니다</p>
          </div>
          <Link to="/competitions"
            className="text-xs px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors">
            대회 참가하기
          </Link>
        </div>
      ) : (
        <>
          <div>
            <p className="text-2xl font-bold font-mono text-gray-100">
              {fmt(asset.totalAssetAmount)}<span className="text-sm text-gray-400 ml-1">원</span>
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{formatAccountLabel(account?.accountNumber)}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-2 dark:bg-gray-800 dark:border-transparent">
              <p className="text-[9px] text-zinc-400 mb-0.5">현금 잔고</p>
              <p className="text-xs font-mono font-semibold text-zinc-700 dark:text-gray-200">{fmt(asset.accountAmount)}원</p>
            </div>
            <div className="bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-2 dark:bg-gray-800 dark:border-transparent">
              <p className="text-[9px] text-zinc-400 mb-0.5">주식 평가액</p>
              <p className="text-xs font-mono font-semibold text-zinc-700 dark:text-gray-200">{fmt(asset.holdingEvaluationAmount)}원</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── 순위 뱃지 (금/은/동 그라데이션) ─────────────────────────────────────────
const RANK_BADGE = [
  { gradient: 'linear-gradient(135deg,#fde68a,#f59e0b)', color: '#78350f', shadow: '0 0 10px rgba(251,191,36,0.5)' },
  { gradient: 'linear-gradient(135deg,#e2e8f0,#94a3b8)', color: '#1e293b', shadow: '0 0 6px rgba(148,163,184,0.3)' },
  { gradient: 'linear-gradient(135deg,#fed7aa,#ea580c)', color: '#431407', shadow: '0 0 8px rgba(234,88,12,0.35)' },
  { gradient: 'rgba(71,85,105,0.3)',  color: '#94a3b8', shadow: 'none' },
  { gradient: 'rgba(71,85,105,0.3)',  color: '#94a3b8', shadow: 'none' },
]

// ── 🔥 실시간 인기 종목 ──────────────────────────────────────────────────────
function HotStocksWidget() {
  const { prices } = useTickerStore()
  const [restPrices, setRestPrices] = useState<Record<string, number>>({})
  const [flashes,    setFlashes]    = useState<Record<string, 'up' | 'down'>>({})
  const prevRef = useRef<Record<string, number>>({})

  useEffect(() => {
    const missingCodes = TICKER_STOCKS.filter((s) => !prices[s.code]).map((s) => s.code)
    if (missingCodes.length === 0) return
    fetchStockPriceList(missingCodes).then(setRestPrices)
  }, [prices])

  // 가격 변동 감지 → flash 배경
  useEffect(() => {
    const updates: Record<string, 'up' | 'down'> = {}
    TICKER_STOCKS.forEach(({ code }) => {
      const cur  = prices[code]?.currentPrice
      const prev = prevRef.current[code]
      if (cur !== undefined && prev !== undefined && cur !== prev)
        updates[code] = cur > prev ? 'up' : 'down'
      if (cur !== undefined) prevRef.current[code] = cur
    })
    if (!Object.keys(updates).length) return
    setFlashes((f) => ({ ...f, ...updates }))
    const id = setTimeout(() => setFlashes({}), 500)
    return () => clearTimeout(id)
  }, [prices])

  const sorted = useMemo(() =>
    [...TICKER_STOCKS]
      .sort((a, b) => {
        const pa = prices[a.code], pb = prices[b.code]
        if (!pa && !pb) return 0
        if (!pa) return 1
        if (!pb) return -1
        return Math.abs(pb.changeRate) - Math.abs(pa.changeRate)
      })
      .slice(0, 5),
  [prices])

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden flex flex-col h-full">
      <div
        className="flex items-center justify-between px-4 pt-3.5 pb-2.5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <h3 className="text-sm font-bold text-gray-100 flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-orange-400" />
          실시간 인기 종목
        </h3>
        <Link to="/stock" className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors">차트 →</Link>
      </div>
      <div className="divide-soft flex-1 flex flex-col">
        {sorted.map(({ code, name }, idx) => {
          const p       = prices[code]
          const rp      = restPrices[code]
          const flash   = flashes[code]
          const up      = p && p.changeRate > 0
          const down    = p && p.changeRate < 0
          const tc      = up ? '#ef4444' : down ? '#3b82f6' : '#9ca3af'
          const bbg     = up ? 'rgba(239,68,68,0.12)' : down ? 'rgba(59,130,246,0.12)' : 'rgba(107,114,128,0.1)'
          const arrow   = up ? '▲' : down ? '▼' : '━'
          const flashBg = flash === 'up' ? 'rgba(239,68,68,0.07)' : flash === 'down' ? 'rgba(59,130,246,0.07)' : 'transparent'
          const badge   = RANK_BADGE[idx] ?? RANK_BADGE[4]

          return (
            <Link key={code} to="/stock"
              className="flex-1 min-h-0 flex items-center gap-3 px-4 py-2 transition-all duration-300 hover:bg-gray-800/40 group"
              style={{ background: flashBg }}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ background: badge.gradient, color: badge.color, boxShadow: badge.shadow }}>
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-gray-200 group-hover:text-indigo-300 transition-colors truncate">{name}</p>
                <p className="text-[10px] text-gray-600">{code}</p>
              </div>
              {p ? (
                <div className="text-right flex-shrink-0">
                  <p className="text-[12px] font-mono font-bold text-gray-100">{p.currentPrice.toLocaleString()}</p>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: bbg, color: tc }}>
                    {arrow} {Math.abs(p.changeRate).toFixed(2)}%
                  </span>
                </div>
              ) : rp ? (
                <div className="text-right flex-shrink-0">
                  <p className="text-[12px] font-mono text-gray-500">{rp.toLocaleString()}</p>
                  <span className="text-[10px] text-gray-700">연결 중</span>
                </div>
              ) : (
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="h-3 w-16 rounded bg-gray-800 animate-pulse" />
                  <span className="h-2.5 w-10 rounded bg-gray-800 animate-pulse" />
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ── 내 참여 대회 위젯 ─────────────────────────────────────────────────────────
function MyCompetitionsWidget({ competitions }: { competitions: Competition[] }) {
  const [rankings, setRankings] = useState<Map<string, CompetitionRanking>>(new Map())
  const [loaded,   setLoaded]   = useState(false)

  useEffect(() => {
    const ongoing = competitions.filter((c) => c.status === 'ONGOING')
    if (ongoing.length === 0) { setLoaded(true); return }

    Promise.all(ongoing.map((c) =>
      getMyRanking(c.competitionId).then((r) => [c.competitionId, r] as const),
    )).then((results) => {
      const map = new Map<string, CompetitionRanking>()
      results.forEach(([id, rank]) => { if (rank) map.set(id, rank) })
      setRankings(map)
      setLoaded(true)
    })
  }, [competitions])

  if (!loaded) return null

  const myComps = competitions.filter(
    (c) => c.status === 'ONGOING' && rankings.has(c.competitionId),
  )
  if (myComps.length === 0) return null

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-gray-100">내 참여 대회</h2>
        <Link to="/competitions" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
          전체 보기 →
        </Link>
      </div>
      <div className="flex flex-col gap-2">
        {myComps.map((c) => {
          const rank  = rankings.get(c.competitionId)!
          const dday  = getDDay(c)
          const total = competitions.filter((x) => x.competitionId === c.competitionId)[0]?.currentRegisters ?? 0
          return (
            <Link
              key={c.competitionId}
              to={`/competitions/${c.competitionId}/dashboard`}
              className="bg-gray-900 border border-l-2 border-gray-800 border-l-green-500 rounded-2xl px-5 py-4 flex items-center gap-4 hover:border-indigo-700 hover:border-l-indigo-500 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-100 group-hover:text-indigo-300 transition-colors truncate">
                  {c.name}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {dday && <span className="text-amber-700 dark:text-amber-400 font-medium mr-2">{dday}</span>}
                  {total}명 참가 중
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-xl font-bold font-mono text-gray-100">
                  {rank.rank}<span className="text-sm text-gray-500 ml-0.5">위</span>
                </p>
                <p className="text-[10px] text-gray-600 font-mono">{fmt(rank.totalAsset)}원</p>
              </div>
              <svg className="w-4 h-4 text-gray-600 group-hover:text-indigo-400 flex-shrink-0 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────
export function MainPage() {
  const { user } = useAuthStore()
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [compLoading,  setCompLoading]  = useState(true)

  useEffect(() => {
    getCompetitions({ size: 100 })
      .then(setCompetitions)
      .catch(() => {})
      .finally(() => setCompLoading(false))
  }, [])

  return (
    <div>
      <MarketTicker />

      <div className="max-w-screen-xl mx-auto px-6">

        {/* 배너 */}
        <div className="pt-4 pb-4">
          <HeroSection competitions={competitions} />
        </div>

        {/* 장 상태 + 포트폴리오 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <MarketStatusCard />
          <PortfolioSnapshotCard />
        </div>

        {/* 내 참여 대회 — 로그인 사용자만 표시 */}
        {!compLoading && user && <MyCompetitionsWidget competitions={competitions} />}

        {/* ── 2 x 2 그리드 ─────────────────────────────────────────
            상단: [가이드] [실시간 인기 종목]
            하단: [실시간 증시 뉴스 (5건)] [투자 성향 테스트]
            각 행은 CSS grid stretch 로 좌우 카드 높이가 자동 정렬됨 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-6">
          <GuidesWidget />
          <HotStocksWidget />
          <NewsFeed pageSize={4} />
          <InvestmentQuiz />
        </div>

      </div>
    </div>
  )
}