import {useState, useEffect, useRef} from "react";
import {Link, useNavigate, useLocation} from "react-router-dom";
import {useAuthStore} from "@/store/authStore";
import {useThemeStore} from "@/store/themeStore";
import {logout as logoutApi} from "@/services/authApi";

export function Header() {
	const {isLoggedIn, isAdmin, logout, user} = useAuthStore();
	const {isDark, toggle} = useThemeStore();
	const navigate = useNavigate();
	const location = useLocation();
	const [scrolled, setScrolled] = useState(false);
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 8);
		window.addEventListener("scroll", onScroll, {passive: true});
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	// 드롭다운 바깥 클릭 시 닫기
	useEffect(() => {
		if (!dropdownOpen) return;
		const handler = (e: MouseEvent) => {
			if (!dropdownRef.current?.contains(e.target as Node))
				setDropdownOpen(false);
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [dropdownOpen]);

	const handleLogout = async () => {
		setDropdownOpen(false);
		const refreshToken = localStorage.getItem("refreshToken");
		if (refreshToken) {
			try {
				await logoutApi(refreshToken);
			} catch {
				/* 무시 */
			}
		}
		logout();
		navigate("/login");
	};

	const isActive = (path: string) =>
		location.pathname === path || location.pathname.startsWith(path + "/");

	// 이니셜 아바타
	const initials = user?.name
		? user.name.slice(0, 2).toUpperCase()
		: (user?.email?.slice(0, 2).toUpperCase() ?? "?");

	return (
		<header
			className={`sticky top-0 z-50 bg-gray-950/95 backdrop-blur-md px-6 py-0 transition-all duration-200 ${scrolled ? "border-b border-gray-800/80 shadow-sm dark:shadow-[0_1px_8px_rgba(0,0,0,0.3)]" : "border-b border-transparent"}`}
		>
			<div className="max-w-screen-xl mx-auto flex items-center justify-between h-14 gap-6">
				{/* 로고 */}
				<Link
					to="/"
					className="flex items-center gap-2.5 flex-shrink-0"
				>
					<div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/40">
						<svg
							className="w-[18px] h-[18px] text-white"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							viewBox="0 0 24 24"
						>
							<path d="M3 17l6-6 4 4 8-8" />
						</svg>
					</div>
					<span className="font-extrabold text-gray-100 text-[15px] tracking-tight">
						AntCamp
					</span>
				</Link>

				{/* 네비게이션 */}
				{isLoggedIn && (
					<nav className="flex items-center gap-1 flex-1">
						{[
							{to: "/competitions", label: "대회"},
							{to: "/portfolio", label: "포트폴리오"},
							{to: "/stock", label: "주식차트"},
						].map(({to, label}) => {
							// 홈은 정확히 '/'일 때만 active
							const active =
								to === "/"
									? location.pathname === "/"
									: isActive(to);
							return (
								<Link
									key={to}
									to={to}
									className="text-[13px] px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
									style={
										active
											? {
													background:
														"var(--accent-soft)",
													color: "var(--accent-text)",
													fontWeight: 700,
												}
											: {
													color: isDark
														? "#9ca3af"
														: "#6b7280",
												}
									}
									onMouseEnter={(e) => {
										if (!active) {
											const el = e.currentTarget;
											el.style.background = isDark
												? "rgba(255,255,255,0.06)"
												: "#f3f4f6";
											el.style.color = isDark
												? "#f9fafb"
												: "#111827";
										}
									}}
									onMouseLeave={(e) => {
										if (!active) {
											const el = e.currentTarget;
											el.style.background = "transparent";
											el.style.color = isDark
												? "#9ca3af"
												: "#6b7280";
										}
									}}
								>
									{label}
								</Link>
							);
						})}
						{isAdmin && (
							<>
								<div
									className="w-px h-4 mx-1"
									style={{
										background: isDark
											? "#374151"
											: "#e5e7eb",
									}}
								/>
								<Link
									to="/admin"
									className="text-[13px] px-3 py-1.5 rounded-lg transition-colors"
									style={
										isActive("/admin")
											? {
													background:
														"var(--accent-soft)",
													color: "var(--accent-text)",
													fontWeight: 700,
												}
											: {
													color: isDark
														? "#9ca3af"
														: "#6b7280",
												}
									}
								>
									관리자
								</Link>
							</>
						)}
					</nav>
				)}

				{/* 우측 */}
				<div className="flex items-center gap-1.5 flex-shrink-0">
					{isLoggedIn ? (
						// 사용자 아바타 + 드롭다운
						<div ref={dropdownRef} className="relative">
							<button
								onClick={() => setDropdownOpen((v) => !v)}
								className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-800/70 transition-colors group"
							>
								{/* 이니셜 아바타 */}
								<div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
									{initials}
								</div>
								<span className="text-[13px] text-gray-300 group-hover:text-gray-100 hidden sm:block max-w-[80px] truncate">
									{user?.name ?? user?.email}
								</span>
								<svg
									className={`w-3.5 h-3.5 text-gray-500 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
									fill="none"
									stroke="currentColor"
									strokeWidth="2.5"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M19 9l-7 7-7-7"
									/>
								</svg>
							</button>

							{/* 드롭다운 메뉴 */}
							{dropdownOpen && (
								<div className="absolute right-0 top-full mt-1.5 w-48 bg-gray-900 border border-gray-800 rounded-2xl shadow-xl shadow-black/30 overflow-hidden z-50">
									{/* 사용자 정보 */}
									<div className="px-4 py-3 border-b border-gray-800">
										<p className="text-xs font-semibold text-gray-200 truncate">
											{user?.name}
										</p>
										<p className="text-[11px] text-gray-500 truncate">
											{user?.email}
										</p>
									</div>
									{/* 메뉴 아이템 */}
									<div className="py-1">
										<Link
											to="/mypage"
											onClick={() =>
												setDropdownOpen(false)
											}
											className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-gray-300 hover:text-gray-100 hover:bg-gray-800/70 transition-colors"
										>
											<svg
												className="w-4 h-4 text-gray-500"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
												/>
											</svg>
											마이페이지
										</Link>
										<button
											onClick={handleLogout}
											className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-gray-400 hover:text-red-400 hover:bg-gray-800/70 transition-colors"
										>
											<svg
												className="w-4 h-4"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
												/>
											</svg>
											로그아웃
										</button>
									</div>
								</div>
							)}
						</div>
					) : (
						<>
							{[
								{to: "/login", label: "로그인"},
								{to: "/register", label: "회원가입"},
							].map(({to, label}) => {
								const active = isActive(to);
								return (
									<Link
										key={to}
										to={to}
										className="text-[13px] px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
										style={
											active
												? {
														background:
															"var(--accent-soft)",
														color: "var(--accent-text)",
														fontWeight: 700,
													}
												: {
														color: isDark
															? "#9ca3af"
															: "#6b7280",
													}
										}
										onMouseEnter={(e) => {
											if (!active) {
												const el = e.currentTarget;
												el.style.background = isDark
													? "rgba(255,255,255,0.06)"
													: "#f3f4f6";
												el.style.color = isDark
													? "#f9fafb"
													: "#111827";
											}
										}}
										onMouseLeave={(e) => {
											if (!active) {
												const el = e.currentTarget;
												el.style.background =
													"transparent";
												el.style.color = isDark
													? "#9ca3af"
													: "#6b7280";
											}
										}}
									>
										{label}
									</Link>
								);
							})}
						</>
					)}

					{/* 다크모드 */}
					<div className="w-px h-4 bg-gray-800 mx-1" />
					<button
						onClick={toggle}
						aria-label={isDark ? "라이트 모드" : "다크 모드"}
						className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-100 hover:bg-gray-800 transition-colors"
					>
						{isDark ? (
							<svg
								className="w-4 h-4"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								viewBox="0 0 24 24"
							>
								<circle cx="12" cy="12" r="5" />
								<line x1="12" y1="1" x2="12" y2="3" />
								<line x1="12" y1="21" x2="12" y2="23" />
								<line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
								<line
									x1="18.36"
									y1="18.36"
									x2="19.78"
									y2="19.78"
								/>
								<line x1="1" y1="12" x2="3" y2="12" />
								<line x1="21" y1="12" x2="23" y2="12" />
								<line
									x1="4.22"
									y1="19.78"
									x2="5.64"
									y2="18.36"
								/>
								<line
									x1="18.36"
									y1="5.64"
									x2="19.78"
									y2="4.22"
								/>
							</svg>
						) : (
							<svg
								className="w-4 h-4"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								viewBox="0 0 24 24"
							>
								<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
							</svg>
						)}
					</button>
				</div>
			</div>
		</header>
	);
}
