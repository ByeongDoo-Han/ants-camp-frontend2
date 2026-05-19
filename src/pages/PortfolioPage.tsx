import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { getMyAccounts, getAccountDetail } from '@/services/authApi'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { PageSpinner } from '@/components/ui/Spinner'
import { Alert } from '@/components/ui/Alert'
import { SummaryHero, HoldingRow, EmptyHoldings } from '@/components/portfolio/PortfolioParts'
import { formatAccountLabel } from '@/utils/formatAccount'
import type { AccountResult, AccountPortfolio } from '@/types/auth'

export function PortfolioPage() {
  const { token, user } = useAuthStore()
  const { isDark }      = useThemeStore()
  const navigate        = useNavigate()

  const [accounts,   setAccounts]   = useState<AccountResult[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [portfolio,  setPortfolio]  = useState<AccountPortfolio | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [fetching,   setFetching]   = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  // 내 계좌 목록 자동 로드
  useEffect(() => {
    if (!user) { setLoading(false); return }
    // localStorage에서 최신 토큰 사용
    getMyAccounts()
      .then(async (accs) => {
        setAccounts(accs)
        if (accs.length > 0) {
          const id = accs[0].accountId
          setSelectedId(id)
          await loadPortfolio(id)
        }
      })
      .catch(() => setError('계좌 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadPortfolio = async (id: string) => {
    if (!user) return
    setFetching(true); setError(null)
    try {
      // 항상 최신 토큰 사용
      const currentToken = localStorage.getItem('accessToken') ?? undefined
      setPortfolio(await getAccountDetail(id, user.userId, currentToken))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '자산 조회 실패')
    } finally {
      setFetching(false)
    }
  }

  const handleSelect = (id: string) => {
    if (id === selectedId) return
    setSelectedId(id)
    loadPortfolio(id)
  }

  const holdings = portfolio?.holdings ?? []

  // 히어로 내부 슬롯의 라이트/다크 색상 (히어로와 동일한 톤 매핑)
  const slot = isDark
    ? {
        kicker:     'rgba(255,255,255,0.45)',
        chipBg:     'rgba(255,255,255,0.08)',
        chipText:   '#e5e7eb',
        chipBorder: 'none',
        tabIdle:    { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)', border: '1px solid transparent' },
        tabActive:  { background: 'rgba(99,102,241,0.25)', color: '#a5b4fc',                 border: '1px solid rgba(99,102,241,0.45)' },
        action:     { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)' },
      }
    : {
        kicker:     '#6b7280',
        chipBg:     '#ffffff',
        chipText:   '#374151',
        chipBorder: '1px solid #e5e7eb',
        tabIdle:    { background: '#ffffff', color: '#475569', border: '1px solid #e5e7eb' },
        tabActive:  { background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' },
        action:     { background: '#ffffff', color: '#475569', border: '1px solid #e5e7eb' },
      }

  if (loading) return <PageSpinner />

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8">
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-100">포트폴리오</h1>
        <p className="text-xs text-gray-500 mt-1">내 계좌 자산과 보유 종목을 한 눈에 확인하세요</p>
      </div>

      {/* 빈 계좌 */}
      {accounts.length === 0 && (
        <div
          className="relative overflow-hidden rounded-2xl px-6 py-10 text-center"
          style={isDark
            ? { background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)' }
            : { background: 'linear-gradient(135deg, #eef2ff 0%, #ffffff 60%, #ecfeff 100%)', border: '1px solid #e5e7eb' }}
        >
          <div
            className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
            style={{ background: isDark
              ? 'radial-gradient(circle, rgba(99,102,241,0.25), transparent 70%)'
              : 'radial-gradient(circle, rgba(99,102,241,0.18), transparent 70%)' }}
          />
          <div className="relative z-10">
            <p className="text-base font-semibold mb-1" style={{ color: isDark ? '#fff' : '#111827' }}>
              연결된 계좌가 없습니다
            </p>
            <p className="text-xs mb-5" style={{ color: isDark ? 'rgba(255,255,255,0.55)' : '#6b7280' }}>
              대회에 참가하면 계좌가 자동으로 생성됩니다
            </p>
            <button
              onClick={() => navigate('/competitions')}
              className="text-xs font-semibold px-5 py-2 rounded-xl transition-colors"
              style={isDark
                ? { background: '#fff', color: '#0f172a' }
                : { background: '#4f46e5', color: '#fff' }}
            >
              대회 참가하기 →
            </button>
          </div>
        </div>
      )}

      {/* 계좌 있음 */}
      {accounts.length > 0 && portfolio && (
        <>
          <SummaryHero
            account={portfolio.account}
            asset={portfolio.asset}
            holdings={holdings}
            leftSlot={
              accounts.length > 1 ? (
                <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1">
                  {accounts.map((acc) => {
                    const active = acc.accountId === selectedId
                    return (
                      <button
                        key={acc.accountId}
                        onClick={() => handleSelect(acc.accountId)}
                        className="text-[11px] font-mono px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
                        style={active ? slot.tabActive : slot.tabIdle}
                      >
                        {formatAccountLabel(acc.accountNumber)}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <>
                  <span className="text-[10px] font-bold tracking-widest" style={{ color: slot.kicker }}>
                    ACCOUNT
                  </span>
                  <span
                    className="text-xs font-mono px-2.5 py-1 rounded-full"
                    style={{ background: slot.chipBg, color: slot.chipText, border: slot.chipBorder }}
                  >
                    {formatAccountLabel(portfolio.account.accountNumber)}
                  </span>
                </>
              )
            }
            rightSlot={
              <button
                onClick={() => loadPortfolio(selectedId)}
                disabled={fetching}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
                style={slot.action}
              >
                <RefreshCw className={`w-3 h-3 ${fetching ? 'animate-spin' : ''}`} />
                {fetching ? '조회 중' : '새로고침'}
              </button>
            }
          />

          {error && <Alert className="mb-4">{error}</Alert>}

          {/* 보유 종목 헤더 */}
          <div className="flex items-baseline gap-2 mb-3">
            <h2 className="text-sm font-bold text-gray-100">보유 종목</h2>
            <span className="text-[11px] font-mono text-gray-500">{holdings.length}개</span>
          </div>

          {fetching && !error ? (
            <PageSpinner />
          ) : holdings.length === 0 ? (
            <EmptyHoldings />
          ) : (
            <div className="flex flex-col gap-2">
              {holdings.map((h) => (
                <HoldingRow key={h.holdingId} holding={h} totalAsset={portfolio.asset.totalAssetAmount} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
