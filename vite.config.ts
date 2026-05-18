import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  // .env 파일에서 NAVER_* 등 비공개 키 로드 (VITE_ 접두사 없이도 읽힘)
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 3001,
      proxy: {
        // ── 인증 / 사용자 (user-service :8082) ───────────────────────────
        '/api/auth': { target: 'https://api.antcamp.site', changeOrigin: true, secure: true },
        '/api/users': { target: 'https://api.antcamp.site', changeOrigin: true, secure: true },
        // ── 대회 (competition-service :8092) ──────────────────────────────
        '/api/competitions': { target: 'https://api.antcamp.site', changeOrigin: true, secure: true },
        // ── 랭킹 (ranking-service :8094) ──────────────────────────────────
        '/api/rankings': { target: 'https://api.antcamp.site', changeOrigin: true, secure: true },
        // ── 거래 / 시세 / 종목 / 장 상태 (trade-service :8084) ────────────
        '/api/market':  { target: 'https://api.antcamp.site', changeOrigin: true, secure: true },
        '/api/trades':  { target: 'https://api.antcamp.site', changeOrigin: true, secure: true },
        '/api/stocks':  { target: 'https://api.antcamp.site', changeOrigin: true, secure: true },
        // ── 자산 / 계좌 / 보유 종목 (asset-service :8086) ─────────────────
        '/api/accounts': { target: 'https://api.antcamp.site', changeOrigin: true, secure: true },
        '/api/assets':   { target: 'https://api.antcamp.site', changeOrigin: true, secure: true },
        '/api/holdings': { target: 'https://api.antcamp.site', changeOrigin: true, secure: true },
        // ── AI 어시스턴트 (assistant-service :8096) ───────────────────────
        '/api/assistants': { target: 'https://api.antcamp.site', changeOrigin: true, secure: true },
        // ── 알림 (notification-service :8098) ─────────────────────────────
        '/api/notifications': { target: 'https://api.antcamp.site', changeOrigin: true, secure: true },
        // ── STOMP WebSocket ───────────────────────────────────────────────
        '/ws-stomp': {
          target: 'http://localhost:8084',
          changeOrigin: true,
          ws: true,
        },
        // ── Yahoo Finance (지수·환율 지연) ────────────────────────────────
        '/yahoo': {
          target: 'https://query1.finance.yahoo.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/yahoo/, ''),
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        },
        // ── 네이버 뉴스 검색 (API 키를 vite 프록시가 주입) ───────────────
        '/api/naver/news': {
          target: 'https://openapi.naver.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/naver\/news/, '/v1/search/news.json'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('X-Naver-Client-Id',     env.NAVER_CLIENT_ID     ?? '')
              proxyReq.setHeader('X-Naver-Client-Secret', env.NAVER_CLIENT_SECRET ?? '')
            })
          },
        },
      },
    },
  }
})