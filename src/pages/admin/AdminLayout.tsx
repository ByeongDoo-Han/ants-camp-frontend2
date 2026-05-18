import { Outlet, Link, useLocation } from 'react-router-dom'

// ── 사이드바 아이콘 ───────────────────────────────────────────────────────
type IconProps = { className?: string }

function IconTrophy({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2L19 21z"/>
    </svg>
  )
}
function IconUsers({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
    </svg>
  )
}
function IconBell({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
    </svg>
  )
}
function IconDoc({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
    </svg>
  )
}
function IconPrompt({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
    </svg>
  )
}
function IconChart({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
    </svg>
  )
}

// ── 네비 정의 (그룹별) ───────────────────────────────────────────────────
type NavItem = { label: string; to: string; icon: (p: IconProps) => JSX.Element }

const OPS_ITEMS: NavItem[] = [
  { label: '대회 관리',  to: '/admin/competitions',   icon: IconTrophy },
  { label: '사용자 관리', to: '/admin/users',          icon: IconUsers },
  { label: '알림 관리',  to: '/admin/notifications',  icon: IconBell },
]
const ASSISTANT_ITEMS: NavItem[] = [
  { label: '문서 관리', to: '/admin/assistant/documents',   icon: IconDoc },
  { label: '프롬프트',  to: '/admin/assistant/prompts',     icon: IconPrompt },
  { label: '평가',      to: '/admin/assistant/evaluations', icon: IconChart },
]

function isNavActive(to: string, pathname: string): boolean {
  return pathname.startsWith(to)
}

// ── 사이드바 아이템 (active dot + 아이콘 + 라벨) ─────────────────────────
function SideLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <Link
      to={item.to}
      className={`text-[13px] px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 transition-colors ${
        active
          ? 'bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-600/15 dark:text-indigo-300'
          : 'text-gray-500 hover:text-gray-100 hover:bg-gray-950 dark:hover:bg-gray-800/60'
      }`}
    >
      <span
        className="w-1 h-4 rounded-full flex-shrink-0"
        style={{ background: active ? 'var(--accent)' : 'transparent' }}
      />
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  )
}

export function AdminLayout() {
  const { pathname } = useLocation()

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 flex gap-6 min-h-[calc(100vh-64px)]">
      {/* 사이드바 */}
      <aside className="w-56 flex-shrink-0">
        {/* 메인 네비 카드 */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
          <p className="kicker px-2 pt-1 pb-2">관리</p>

          {/* 운영 그룹 */}
          <p className="text-[10px] font-semibold text-gray-600 px-2 pt-1 pb-1.5">운영</p>
          <nav className="flex flex-col gap-0.5 mb-3">
            {OPS_ITEMS.map((item) => (
              <SideLink key={item.to} item={item} active={isNavActive(item.to, pathname)} />
            ))}
          </nav>

          {/* 어시스턴트 그룹 */}
          <p className="text-[10px] font-semibold text-gray-600 px-2 pt-1 pb-1.5 flex items-center gap-1.5">
            어시스턴트
            <span className="chip chip-violet" style={{ padding: '0 5px', fontSize: 9, lineHeight: '14px' }}>RAG</span>
          </p>
          <nav className="flex flex-col gap-0.5">
            {ASSISTANT_ITEMS.map((item) => (
              <SideLink key={item.to} item={item} active={isNavActive(item.to, pathname)} />
            ))}
          </nav>
        </div>

        {/* Grafana 모니터링 대시보드 링크 카드 */}
        <a
          href="https://https://monitoring.antcamp.site/dashboards"
          target="_blank"
          rel="noopener noreferrer"
          className="block border border-dashed border-gray-800 hover:border-gray-700 rounded-xl p-3 mt-3 transition-colors group"
          style={{ background: 'var(--bg-hover)' }}
        >
          <p className="kicker mb-1.5">모니터링</p>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(245,158,11,0.15)' }}
              >
                {/* Grafana 로고 풍 아이콘 */}
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.75">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 14l4-4 4 4 5-5"/>
                </svg>
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-gray-100 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors leading-tight">Grafana</p>
                <p className="text-[10px] text-gray-500 leading-tight">대시보드 열기</p>
              </div>
            </div>
            <svg className="w-3 h-3 text-gray-500 flex-shrink-0 group-hover:text-orange-500 dark:group-hover:text-orange-400 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7-7 7M5 12h14"/>
            </svg>
          </div>
        </a>
      </aside>

      {/* 콘텐츠 */}
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
