import {useEffect} from "react";
import {BrowserRouter, Routes, Route, Navigate} from "react-router-dom";
import {Header} from "@/components/Header";
import {useAuthStore} from "@/store/authStore";
import {useThemeStore} from "@/store/themeStore";

// 페이지
import {LoginPage} from "@/pages/LoginPage";
import {AdminLoginPage} from "@/pages/AdminLoginPage";
import {RegisterPage} from "@/pages/RegisterPage";
import {MainPage} from "@/pages/MainPage";
import {CompetitionsPage} from "@/pages/CompetitionsPage";
import {CompetitionDetailPage} from "@/pages/CompetitionDetailPage";
import {CompetitionDashboardPage} from "@/pages/CompetitionDashboardPage";
import {StockChartPage} from "@/pages/StockChartPage";
import {MyPage} from "@/pages/MyPage";
import {ProfileEditPage} from "@/pages/ProfileEditPage";
import {PortfolioPage} from "@/pages/PortfolioPage";
import {GuidesPage} from "@/pages/GuidesPage";
import {GuideDetailPage} from "@/pages/GuideDetailPage";
import {ChatBot} from "@/components/ChatBot";
import {Footer} from "@/components/Footer";

// 어드민
import {AdminLayout} from "@/pages/admin/AdminLayout";
import {AdminCompetitionPage} from "@/pages/admin/AdminCompetitionPage";
import {DocumentListPage} from "@/pages/admin/assistant/DocumentListPage";
import {DocumentNewPage} from "@/pages/admin/assistant/DocumentNewPage";
import {DocumentDetailPage} from "@/pages/admin/assistant/DocumentDetailPage";
import {PromptVersionPage} from "@/pages/admin/assistant/PromptVersionPage";
import {EvalListPage} from "@/pages/admin/assistant/EvalListPage";
import {EvalRunPage} from "@/pages/admin/assistant/EvalRunPage";
import {EvalDetailPage} from "@/pages/admin/assistant/EvalDetailPage";
import {PairwiseResultPage} from "@/pages/admin/assistant/PairwiseResultPage";
import {PairwiseNewPage} from "@/pages/admin/assistant/PairwiseNewPage";
import {NotificationListPage} from "@/pages/admin/notification/NotificationListPage";
import {NotificationDetailPage} from "@/pages/admin/notification/NotificationDetailPage";
import {AdminUsersPage} from "@/pages/admin/AdminUsersPage";

/** 로그인 필요 라우트 */
function PrivateRoute({children}: {children: React.ReactNode}) {
	const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
	return isLoggedIn ? <>{children}</> : <Navigate to="/login" replace />;
}

/** 어드민 전용 라우트 */
function AdminRoute({children}: {children: React.ReactNode}) {
	const {isLoggedIn, isAdmin} = useAuthStore();
	if (!isLoggedIn) return <Navigate to="/login" replace />;
	if (!isAdmin) return <Navigate to="/" replace />;
	return <>{children}</>;
}

export default function App() {
	const isDark = useThemeStore((s) => s.isDark);

	useEffect(() => {
		document.documentElement.classList.toggle("dark", isDark);
	}, [isDark]);

	return (
		<BrowserRouter>
			<div className="min-h-screen bg-gray-950 text-gray-100 font-[Noto_Sans_KR,sans-serif] flex flex-col">
				<Header />

				<main className="flex-1">
					<Routes>
						{/* 공개 */}
						<Route path="/login" element={<LoginPage />} />
						<Route
							path="/admin/login"
							element={<AdminLoginPage />}
						/>
						<Route path="/register" element={<RegisterPage />} />

						{/* 로그인 필요 */}
						<Route path="/" element={<MainPage />} />
						<Route
							path="/competitions"
							element={
								<PrivateRoute>
									<CompetitionsPage />
								</PrivateRoute>
							}
						/>

						<Route
							path="/competitions/:id"
							element={
								<PrivateRoute>
									<CompetitionDetailPage />
								</PrivateRoute>
							}
						/>
						<Route
							path="/competitions/:id/dashboard"
							element={
								<PrivateRoute>
									<CompetitionDashboardPage />
								</PrivateRoute>
							}
						/>

						<Route
							path="/stock"
							element={
								<PrivateRoute>
									<StockChartPage />
								</PrivateRoute>
							}
						/>

						<Route
							path="/mypage"
							element={
								<PrivateRoute>
									<MyPage />
								</PrivateRoute>
							}
						/>
						<Route
							path="/mypage/edit"
							element={
								<PrivateRoute>
									<ProfileEditPage />
								</PrivateRoute>
							}
						/>

						<Route
							path="/portfolio"
							element={
								<PrivateRoute>
									<PortfolioPage />
								</PrivateRoute>
							}
						/>

						{/* 가이드 — 비로그인 허용 */}
						<Route path="/guides" element={<GuidesPage />} />
						<Route path="/guides/:documentId" element={<GuideDetailPage />} />

						{/* 어드민 — 공통 레이아웃 + 중첩 라우트 */}
						<Route
							path="/admin"
							element={
								<AdminRoute>
									<AdminLayout />
								</AdminRoute>
							}
						>
							<Route
								index
								element={<Navigate to="competitions" replace />}
							/>
							<Route
								path="competitions"
								element={<AdminCompetitionPage />}
							/>

							<Route
								path="assistant"
								element={<Navigate to="documents" replace />}
							/>
							<Route
								path="assistant/documents"
								element={<DocumentListPage />}
							/>
							<Route
								path="assistant/documents/new"
								element={<DocumentNewPage />}
							/>
							<Route
								path="assistant/documents/:documentId"
								element={<DocumentDetailPage />}
							/>

							<Route
								path="assistant/prompts"
								element={<PromptVersionPage />}
							/>

							<Route
								path="assistant/evaluations"
								element={<EvalListPage />}
							/>
							<Route
								path="assistant/evaluations/new"
								element={<EvalRunPage />}
							/>
							<Route
								path="assistant/evaluations/pairwise"
								element={<PairwiseResultPage />}
							/>
							<Route
								path="assistant/evaluations/pairwise/new"
								element={<PairwiseNewPage />}
							/>
							<Route
								path="assistant/evaluations/:evalRunId"
								element={<EvalDetailPage />}
							/>

							<Route
								path="notifications"
								element={<NotificationListPage />}
							/>
							<Route
								path="notifications/:notificationId"
								element={<NotificationDetailPage />}
							/>
							<Route path="users" element={<AdminUsersPage />} />
						</Route>

						{/* fallback */}
						<Route path="*" element={<Navigate to="/" replace />} />
					</Routes>
				</main>
			</div>

			<Footer />
			<ChatBot />
		</BrowserRouter>
	);
}
