// ── 공통 ──────────────────────────────────────────────────────────────────
import { fetchWithAuth } from './authApi'

export interface CursorPage<T> {
  items: T[]
  hasNext: boolean
  nextCursor: string | null
}

async function unwrap<T>(res: Response): Promise<T> {
  const text = await res.text()
  if (!text) throw new Error(`서버 오류 (${res.status})`)
  const json = JSON.parse(text)
  if (!res.ok) throw new Error(json?.message ?? `서버 오류 (${res.status})`)
  return ('data' in json ? json.data : json) as T
}

function authHeaders(contentType = false): HeadersInit {
  const token = localStorage.getItem('accessToken') ?? ''
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
  if (contentType) headers['Content-Type'] = 'application/json'
  return headers
}

function toQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') q.set(k, String(v))
  }
  const str = q.toString()
  return str ? `?${str}` : ''
}

// ── 타입 ──────────────────────────────────────────────────────────────────

export type DocType      = 'FAQ' | 'POLICY' | 'GUIDE' | 'TERMS'
export type IngestStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CLEANUP_PENDING' | 'DELETED'
export type EvalRunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'

export const DOC_TYPE_LABEL: Record<DocType, string> = {
  FAQ:    'FAQ',
  POLICY: '정책',
  GUIDE:  '가이드',
  TERMS:  '약관',
}

export const INGEST_STATUS_LABEL: Record<IngestStatus, string> = {
  PROCESSING:      '처리 중',
  COMPLETED:       '완료',
  FAILED:          '실패',
  CLEANUP_PENDING: '삭제 대기',
  DELETED:         '삭제됨',
}

export const JUDGE_MODELS = [
  'gpt-4o',
  'claude-sonnet-4-6',
] as const

export const RAG_MODELS = [
  'gpt-4o-mini',
  'claude-haiku-4-5-20251001',
] as const

// ── Player 타입 ────────────────────────────────────────────────────────────

export interface ChatSession {
  chatSessionId: string
  userId: string
  title: string | null
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  chatMessageId: string
  role: 'USER' | 'BOT'
  content: string
  seq: number
  sources: Array<{ knowledgeDocumentId: string; title: string; docType: string }> | null
  createdAt: string
}

// ── Document 타입 ──────────────────────────────────────────────────────────

export interface DocumentItem {
  documentId: string
  title: string
  docType: DocType
  ingestStatus: IngestStatus
  updatedAt: string
}

export interface DocumentDetail {
  documentId: string
  title: string
  docType: DocType
  content: string
  chunkCount: number
  ingestStatus: IngestStatus
  failureReason: string | null
  createdAt: string
  updatedAt: string | null  // 상세 응답에 미포함
}

export interface SaveDocumentRequest {
  title: string
  docType: DocType
  content: string
}

export interface DocumentUploadResponse {
  documentId: string
}

// ── Prompt 타입 ────────────────────────────────────────────────────────────

export interface PromptVersion {
  promptVersionId: string
  name: string
  content: string
}

// ── Evaluation 타입 ────────────────────────────────────────────────────────

export interface EvalQuestion {
  question: string
  referenceAnswer: string | null
}

export interface RunEvaluationRequest {
  questions: EvalQuestion[]
  judgeModels: string[]
  promptVersionId: string | null
  ragModel: string
  memo: string
}

export interface EvalScore {
  relevance: number | null
  faithfulness: number | null
  contextPrecision: number | null
  feedback: string | null
}

// 백엔드 RetrievedChunk 구조 (텍스트 내용 없음 — 메타데이터만 제공)
export interface RetrievedChunk {
  documentChunkId: string
  score: number
  rank: number
  used: boolean
}

export interface EvalResultItem {
  evalResultId: string
  runId: string          // 백엔드 미제공 → 빈 문자열 기본값 (추가 예정)
  question: string
  referenceAnswer: string | null  // 백엔드 미제공
  answer: string
  judgeModel: string
  score: EvalScore
  retrievedChunks: RetrievedChunk[]
  promptUsed: string | null
  memo: string | null    // 백엔드 미제공
  ragModel: string       // 백엔드 미제공
  judgeModels: string[]  // 백엔드 미제공
  runAt: string
}

export interface EvalResultListResponse {
  content: EvalResultItem[]
  hasNext: boolean
  nextCursor: string | null
}

// ── Pairwise 타입 ──────────────────────────────────────────────────────────

export interface PairwiseJudgeResult {
  judgeModel: string
  winA: number
  draw: number
  winB: number
}

export interface PairwiseSummaryResponse {
  evalRunIdA: string
  evalRunIdB: string
  ragModelA: string
  ragModelB: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | null  // PairwiseRun 없으면 null
  totalCount: number
  doneCount: number
  byJudge: PairwiseJudgeResult[]
  totalWinA: number
  totalDraw: number
  totalWinB: number
}

// ── Player API ─────────────────────────────────────────────────────────────

export async function createSession(): Promise<ChatSession> {
  const res = await fetch('/api/assistants/sessions', {
    method: 'POST',
    headers: authHeaders(),
  })
  return unwrap<ChatSession>(res)
}

export async function getSessions(params?: {
  keyword?: string
  lastUpdatedAt?: string
}): Promise<CursorPage<ChatSession>> {
  const res = await fetchWithAuth(`/api/assistants/sessions${toQuery(params ?? {})}`, {
    headers: authHeaders(),
  })
  return unwrap<CursorPage<ChatSession>>(res)
}

export async function getMessages(chatSessionId: string): Promise<ChatMessage[]> {
  const res = await fetchWithAuth(`/api/assistants/sessions/${chatSessionId}/messages`, {
    headers: authHeaders(),
  })
  return unwrap<ChatMessage[]>(res)
}

export async function sendMessage(chatSessionId: string, content: string): Promise<ChatMessage> {
  const res = await fetchWithAuth(`/api/assistants/sessions/${chatSessionId}/messages`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({ content }),
  })
  return unwrap<ChatMessage>(res)
}

// ── Document API ───────────────────────────────────────────────────────────

export async function listDocuments(params?: {
  keyword?: string
  type?: DocType
  title?: string
  lastUpdatedAt?: string
}): Promise<CursorPage<DocumentItem>> {
  const res = await fetchWithAuth(`/api/assistants/documents${toQuery(params ?? {})}`, {
    headers: authHeaders(),
  })
  const raw = await unwrap<any>(res)
  return {
    items:      (raw.items ?? []).map(mapDocumentItem),
    hasNext:    raw.hasNext,
    nextCursor: raw.nextCursor ?? null,
  }
}

export async function getDocument(documentId: string): Promise<DocumentDetail> {
  const res = await fetchWithAuth(`/api/assistants/documents/${documentId}`, {
    headers: authHeaders(),
  })
  const raw = await unwrap<any>(res)
  return {
    documentId:    raw.documentId,
    title:         raw.title,
    docType:       raw.type as DocType,   // 백엔드: type → 프론트: docType
    content:       raw.content,
    chunkCount:    raw.chunkCount,
    ingestStatus:  raw.ingestStatus as IngestStatus,
    failureReason: raw.failureReason ?? null,
    createdAt:     raw.createdAt,
    updatedAt:     raw.updatedAt ?? null, // 상세 응답에 미포함
  }
}

export async function createDocument(req: SaveDocumentRequest): Promise<DocumentUploadResponse> {
  const res = await fetch('/api/assistants/documents', {
    method: 'POST',
    headers: authHeaders(true),
    // 백엔드 필드명: type (docType → type 변환)
    body: JSON.stringify({ title: req.title, type: req.docType, content: req.content }),
  })
  return unwrap<DocumentUploadResponse>(res)
}

export async function updateDocument(
  documentId: string,
  req: SaveDocumentRequest,
): Promise<DocumentUploadResponse> {
  const res = await fetchWithAuth(`/api/assistants/documents/${documentId}`, {
    method: 'PUT',
    headers: authHeaders(true),
    body: JSON.stringify({ title: req.title, type: req.docType, content: req.content }),
  })
  return unwrap<DocumentUploadResponse>(res)
}

function mapDocumentItem(raw: any): DocumentItem {
  return {
    documentId:   raw.documentId,
    title:        raw.title,
    docType:      raw.type as DocType,  // 백엔드: type → 프론트: docType
    ingestStatus: raw.ingestStatus as IngestStatus,
    updatedAt:    raw.updatedAt,
  }
}

// 로그인 사용자 공개 조회 — title/docType/content만 사용, 운영 메타 미노출
export async function getPublicDocument(documentId: string): Promise<DocumentDetail> {
  const res = await fetchWithAuth(`/api/assistants/documents/${documentId}`, {
    headers: authHeaders(),
  })
  const raw = await unwrap<any>(res)
  return {
    documentId:    raw.documentId,
    title:         raw.title,
    docType:       raw.type as DocType,
    content:       raw.content,
    chunkCount:    0,
    ingestStatus:  'COMPLETED' as IngestStatus,
    failureReason: null,
    createdAt:     '',
    updatedAt:     null,
  }
}

export async function deleteDocument(documentId: string): Promise<void> {
  const res = await fetchWithAuth(`/api/assistants/documents/${documentId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json?.message ?? `서버 오류 (${res.status})`)
  }
}

// ── Prompt API ─────────────────────────────────────────────────────────────

export async function listPromptVersions(): Promise<PromptVersion[]> {
  const res = await fetch('/api/assistants/prompt-versions', {
    headers: authHeaders(),
  })
  return unwrap<PromptVersion[]>(res)
}

export async function createPromptVersion(req: {
  name: string
  content: string
}): Promise<PromptVersion> {
  const res = await fetch('/api/assistants/prompt-versions', {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify(req),
  })
  return unwrap<PromptVersion>(res)
}

// ── Evaluation API ─────────────────────────────────────────────────────────

export async function generateQuestions(count: number): Promise<EvalQuestion[]> {
  const res = await fetch('/api/assistants/evaluations/questions/generate', {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({ count }),
  })
  // 백엔드 응답: { questions: [{question, referenceAnswer}] }
  const data = await unwrap<{ questions: EvalQuestion[] }>(res)
  return data.questions
}

export async function runEvaluation(req: RunEvaluationRequest): Promise<{ runId: string }> {
  const res = await fetch('/api/assistants/evaluations', {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify(req),
  })
  return unwrap<{ runId: string }>(res)
}

export async function getEvalRunStatus(runId: string): Promise<EvalRunStatus> {
  const res = await fetchWithAuth(`/api/assistants/evaluations/${runId}/status`, {
    headers: authHeaders(),
  })
  return unwrap<EvalRunStatus>(res)
}

export async function listEvalResults(params?: {
  runId?: string
  judgeModel?: string
  startDate?: string
  endDate?: string
  lastUpdatedAt?: string
}): Promise<EvalResultListResponse> {
  const res = await fetchWithAuth(`/api/assistants/evaluations${toQuery(params ?? {})}`, {
    headers: authHeaders(),
  })
  const text = await res.text()
  if (!text) throw new Error(`서버 오류 (${res.status})`)
  const json = JSON.parse(text)
  if (!res.ok) throw new Error(json?.message ?? `서버 오류 (${res.status})`)
  const raw = ('data' in json ? json.data : json) as any

  return {
    content: (raw.content ?? []).map(mapEvalItem),
    hasNext: raw.hasNext,
    // 백엔드 cursor 필드명: lastUpdatedAt → nextCursor로 통일
    nextCursor: raw.lastUpdatedAt ?? null,
  }
}

function mapEvalItem(item: any): EvalResultItem {
  return {
    evalResultId:    item.evalResultId,
    runId:           item.runId           ?? '',
    question:        item.question,
    referenceAnswer: item.referenceAnswer ?? null,
    answer:          item.llmResponse,             // 백엔드 필드명: llmResponse
    judgeModel:      item.judgeModel,
    score: {
      relevance:        item.relevance        ?? null,
      faithfulness:     item.faithfulness     ?? null,
      contextPrecision: item.contextPrecision ?? null,
      feedback:         item.feedback         ?? null,
    },
    retrievedChunks: item.retrievedChunks ?? [],
    promptUsed:      item.promptUsed      ?? null,
    memo:            item.memo            ?? null,
    ragModel:        item.ragModel        ?? '',
    judgeModels:     item.judgeModels     ?? [],
    runAt:           item.evaluatedAt,             // 백엔드 필드명: evaluatedAt
  }
}

// ── Pairwise API ───────────────────────────────────────────────────────────

export async function runPairwise(req: {
  evalRunIdA: string
  evalRunIdB: string
  judgeModels: string[]
}): Promise<void> {
  const res = await fetch('/api/assistants/evaluations/pairwise', {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json?.message ?? `서버 오류 (${res.status})`)
  }
}

export async function getPairwiseSummary(
  evalRunIdA: string,
  evalRunIdB: string,
): Promise<PairwiseSummaryResponse> {
  const res = await fetch(
    `/api/assistants/evaluations/pairwise${toQuery({ evalRunIdA, evalRunIdB })}`,
    { headers: authHeaders() },
  )
  const raw = await unwrap<any>(res)

  // 백엔드 필드명: aWins/bWins/ties → 프론트: winA/winB/draw
  const byJudge: PairwiseJudgeResult[] = (raw.byJudge ?? []).map((j: any) => ({
    judgeModel: j.judgeModel,
    winA: j.aWins,
    winB: j.bWins,
    draw: j.ties,
  }))

  return {
    evalRunIdA: raw.evalRunIdA,
    evalRunIdB: raw.evalRunIdB,
    ragModelA:  raw.ragModelA,
    ragModelB:  raw.ragModelB,
    status:     raw.status ?? null,
    totalCount: raw.totalCount ?? 0,
    doneCount:  raw.doneCount  ?? 0,
    byJudge,
    totalWinA: byJudge.reduce((s, j) => s + j.winA, 0),
    totalWinB: byJudge.reduce((s, j) => s + j.winB, 0),
    totalDraw: byJudge.reduce((s, j) => s + j.draw, 0),
  }
}