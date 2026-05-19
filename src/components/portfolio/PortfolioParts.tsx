import { useState, type ReactNode } from 'react'
import { BarChart2 } from 'lucide-react'
import type { AccountResult, AssetResult, HoldingItem } from '@/types/auth'
import { TICKER_STOCKS } from '@/config/stocks'
import { useThemeStore } from '@/store/themeStore'
import { formatAccountLabel } from '@/utils/formatAccount'

// Toss 정적 CDN — 종목 코드 → PNG 로고. 실패 시 차트 아이콘으로 폴백.
const tossLogoUrl = (code: string) =>
  `https://static.toss.im/png-icons/securities/icn-sec-fill-${code}.png`

function StockAvatar({ code }: { code: string }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: 'linear-gradient(135deg, var(--accent-soft), color-mix(in srgb, var(--accent) 18%, transparent))',
          color: 'var(--accent-text)',
        }}
      >
        <BarChart2 className="w-5 h-5" strokeWidth={2.2} />
      </div>
    )
  }

  return (
    <img
      src={tossLogoUrl(code)}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="w-10 h-10 rounded-xl flex-shrink-0 object-cover bg-white"
    />
  )
}

const fmt = (n: number) => n.toLocaleString('ko-KR')
const nameOf = (code: string) => TICKER_STOCKS.find((s) => s.code === code)?.name ?? null

// ── 요약 히어로 카드 ─ 라이트/다크 분리 그라데이션 + 분배 바 + 인라인 스탯 ──
interface SummaryHeroProps {
  account:   AccountResult
  asset:     AssetResult
  holdings:  HoldingItem[]
  /** 좌측: 계좌 라벨 슬롯 (기본은 ACCOUNT + 번호 칩) */
  leftSlot?: ReactNode
  /** 우측: 액션 슬롯 (새로고침 등) */
  rightSlot?: ReactNode
}

export function SummaryHero({ account, asset, holdings, leftSlot, rightSlot }: SummaryHeroProps) {
  const { isDark } = useThemeStore()

  const invested = holdings.reduce((s, h) => s + h.buyPrice * h.stockAmount, 0)
  const evalAmt  = asset.holdingEvaluationAmount
  const pl       = evalAmt - invested
  // 손익률은 매수금액 대비 평가금액. 시드/총자산 대비가 아니라 보유 종목 단위 손익이므로
  // 라벨/계산식이 어긋나지 않도록 칩 자체를 "보유 손익" 으로 분리해 표기한다.
  const plRate   = invested > 0 ? (pl / invested) * 100 : 0
  const plUp     = pl >= 0

  const total      = asset.totalAssetAmount || 1
  const cashPct    = (asset.accountAmount / total) * 100
  const holdingPct = 100 - cashPct

  // ── 테마 토큰 ─────────────────────────────────────────────────────────────
  const t = isDark
    ? {
        bg:       'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #0f172a 100%)',
        border:   '1px solid transparent',
        glow1:    'radial-gradient(circle, rgba(99,102,241,0.28), transparent 70%)',
        glow2:    'radial-gradient(circle, rgba(16,185,129,0.18), transparent 70%)',
        kicker:   'rgba(255,255,255,0.45)',
        title:    '#ffffff',
        dim:      'rgba(255,255,255,0.55)',
        subDim:   'rgba(255,255,255,0.45)',
        chipBg:   'rgba(255,255,255,0.08)',
        chipText: '#e5e7eb',
        divider:  'rgba(255,255,255,0.18)',
        barBg:    'rgba(255,255,255,0.08)',
        plUp:     { background: 'rgba(239,68,68,0.18)', color: '#fca5a5' },
        plDown:   { background: 'rgba(59,130,246,0.18)', color: '#93c5fd' },
        unitDim:  'rgba(255,255,255,0.5)',
      }
    : {
        bg:       'linear-gradient(135deg, #eef2ff 0%, #ffffff 55%, #ecfeff 100%)',
        border:   '1px solid #e5e7eb',
        glow1:    'radial-gradient(circle, rgba(99,102,241,0.18), transparent 70%)',
        glow2:    'radial-gradient(circle, rgba(16,185,129,0.12), transparent 70%)',
        kicker:   '#6b7280',
        title:    '#111827',
        dim:      '#475569',
        subDim:   '#94a3b8',
        chipBg:   '#ffffff',
        chipText: '#374151',
        divider:  '#e5e7eb',
        barBg:    '#e5e7eb',
        plUp:     { background: '#fee2e2', color: '#b91c1c' },
        plDown:   { background: '#dbeafe', color: '#1d4ed8' },
        unitDim:  '#9ca3af',
      }

  return (
    <div
      className="relative overflow-hidden rounded-2xl mb-6"
      style={{ background: t.bg, border: t.border }}
    >
      {/* 글로우 액센트 */}
      <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full pointer-events-none" style={{ background: t.glow1 }} />
      <div className="absolute -bottom-28 -left-24 w-72 h-72 rounded-full pointer-events-none" style={{ background: t.glow2 }} />

      <div className="relative z-10 p-6 md:p-7">
        {/* 상단: 좌측 슬롯 / 우측 슬롯 */}
        <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            {leftSlot ?? (
              <>
                <span className="text-[10px] font-bold tracking-widest" style={{ color: t.kicker }}>
                  ACCOUNT
                </span>
                <span
                  className="text-xs font-mono px-2.5 py-1 rounded-full truncate"
                  style={{ background: t.chipBg, color: t.chipText, border: isDark ? 'none' : '1px solid #e5e7eb' }}
                >
                  {formatAccountLabel(account.accountNumber)}
                </span>
              </>
            )}
          </div>
          {rightSlot}
        </div>

        {/* 가운데: 총 자산 + 보유 손익 */}
        <div className="mb-5">
          <p className="text-[10px] font-bold tracking-widest mb-1.5" style={{ color: t.kicker }}>
            TOTAL ASSET
          </p>
          <div className="flex items-baseline gap-3 flex-wrap">
            <p className="text-3xl md:text-4xl font-bold font-mono tracking-tight leading-none" style={{ color: t.title }}>
              {fmt(asset.totalAssetAmount)}
              <span className="text-base ml-1" style={{ color: t.unitDim }}>원</span>
            </p>
            {invested > 0 && (
              <span
                className="inline-flex items-center gap-1 text-xs font-bold font-mono px-2.5 py-1 rounded-full"
                style={plUp ? t.plUp : t.plDown}
              >
                <span className="text-[10px] font-semibold opacity-75 mr-0.5">보유 손익</span>
                {plUp ? '▲' : '▼'} {plUp ? '+' : ''}{fmt(pl)}원 ({plUp ? '+' : ''}{plRate.toFixed(2)}%)
              </span>
            )}
          </div>
        </div>

        {/* 분배 바 — 주식 / 현금 비율 */}
        <div className="mb-3">
          <div className="flex h-2 rounded-full overflow-hidden" style={{ background: t.barBg }}>
            <div style={{ width: `${holdingPct}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />
            <div style={{ width: `${cashPct}%`,    background: 'linear-gradient(90deg, #10b981, #34d399)' }} />
          </div>
        </div>

        {/* 분할 표시 — 점 + 라벨 + 값, 칸 없이 디바이더로만 구분 */}
        <div className="flex items-center gap-x-5 gap-y-2 text-xs flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: '#8b5cf6' }} />
            <span style={{ color: t.dim }}>주식 평가액</span>
            <span className="font-mono font-bold" style={{ color: t.title }}>{fmt(evalAmt)}원</span>
            <span className="font-mono" style={{ color: t.subDim }}>· {holdingPct.toFixed(1)}%</span>
          </div>
          <div className="h-3 w-px" style={{ background: t.divider }} />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: '#34d399' }} />
            <span style={{ color: t.dim }}>현금 잔고</span>
            <span className="font-mono font-bold" style={{ color: t.title }}>{fmt(asset.accountAmount)}원</span>
            <span className="font-mono" style={{ color: t.subDim }}>· {cashPct.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 보유 종목 카드 ─ 로고(폴백: 차트 아이콘) + 인라인 가격 흐름 + P/L 칩 + 비중 바
interface HoldingRowProps {
  holding:    HoldingItem
  totalAsset: number
}

export function HoldingRow({ holding: h, totalAsset }: HoldingRowProps) {
  // finalPrice가 0이면 buyPrice를 마지막 알려진 가격으로 사용
  const currentPrice = h.finalPrice > 0 ? h.finalPrice : h.buyPrice
  const evalAmt = currentPrice * h.stockAmount
  const costAmt = h.buyPrice   * h.stockAmount
  const pct     = totalAsset > 0 ? (evalAmt / totalAsset) * 100 : 0
  const pl      = evalAmt - costAmt
  const plRate  = costAmt > 0 ? (pl / costAmt) * 100 : 0
  const plUp    = pl >= 0
  const priceUp = currentPrice >= h.buyPrice
  const isPriceFallback = h.finalPrice === 0 || h.finalPrice === undefined
  const code    = h.stockCode?.trim() ?? ''
  const name    = code ? nameOf(code) : null
  // 백엔드가 일부 보유 종목에 stockName 매핑이 없을 뿐 아니라 stockCode 까지 빈 문자열로 내려오는 경우가 있음.
  // 종목명/코드 모두 비면 사용자에게 "정보 없음"으로 명시해 빈 칸 노출을 방지한다.
  const title = name ?? (code || '종목 정보 없음')

  return (
    <div className="row-card bg-gray-900 border border-gray-800 rounded-2xl p-4">
      <div className="flex items-center gap-3">
        {/* 종목 로고 (실패 시 차트 아이콘 폴백) */}
        <StockAvatar code={code} />

        {/* 종목 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <p className="text-sm font-semibold text-gray-100 truncate">
              {title}
            </p>
            {name && code && <p className="text-[10px] font-mono text-gray-500">{code}</p>}
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5">
            <span className="font-mono text-gray-400">{h.stockAmount}</span>주 ·{' '}
            <span className="font-mono">{fmt(h.buyPrice)}</span>
            <span className="mx-1 text-gray-600">→</span>
            <span className={`font-mono font-semibold ${priceUp ? 'text-red-500 dark:text-red-400' : 'text-blue-500 dark:text-blue-400'}`}>
              {fmt(currentPrice)}
            </span>
            {isPriceFallback && (
              <span className="ml-1 text-[9px] text-gray-600">(매수가)</span>
            )}
          </p>
        </div>

        {/* 평가액 + P/L */}
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-mono font-bold text-gray-100">
            {fmt(evalAmt)}
            <span className="text-[10px] text-gray-500 ml-0.5">원</span>
          </p>
          <span
            className={`inline-flex items-center gap-0.5 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md mt-0.5 ${
              plUp
                ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
            }`}
          >
            {plUp ? '▲' : '▼'} {plUp ? '+' : ''}{plRate.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* 비중 바 */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border-soft)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(pct, 100)}%`,
              background: 'linear-gradient(90deg, var(--accent), #8b5cf6)',
            }}
          />
        </div>
        <span className="text-[10px] font-mono text-gray-500 w-12 text-right">{pct.toFixed(1)}%</span>
      </div>
    </div>
  )
}

// ── 빈 상태 ───────────────────────────────────────────────────────────────────
export function EmptyHoldings({ message = '보유 종목이 없습니다' }: { message?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-800 px-6 py-10 text-center">
      <div
        className="w-10 h-10 mx-auto mb-3 rounded-2xl flex items-center justify-center"
        style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)' }}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-gray-200">{message}</p>
      <p className="text-xs text-gray-500 mt-1">주문이 체결되면 이곳에 표시됩니다</p>
    </div>
  )
}
