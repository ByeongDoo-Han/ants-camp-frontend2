import {useState} from "react";
import {useNavigate} from "react-router-dom";
import {login} from "@/services/authApi";
import {useAuthStore} from "@/store/authStore";
import {Alert} from "@/components/ui/Alert";

export function LoginPage() {
	const navigate = useNavigate();
	const setAuth = useAuthStore((s) => s.setAuth);

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		try {
			const {user, accessToken, refreshToken} = await login({
				email,
				password,
			});
			if (user.role === "ADMIN" || user.role === "MANAGER") {
				setError("관리자 계정은 관리자 로그인 페이지를 이용해주세요.");
				return;
			}
			setAuth(user, accessToken, refreshToken);
			navigate("/");
		} catch (err) {
			setError(err instanceof Error ? err.message : "로그인 실패");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-[calc(100vh-57px)] flex items-center justify-center px-4">
			<div className="w-full max-w-sm">
				<p className="text-xs text-gray-500 text-center mb-8">
					AntCamp에 오신 것을 환영합니다
				</p>

				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div>
						<label className="text-xs text-gray-400 mb-1.5 block">
							이메일
						</label>
						<input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-indigo-500 transition-colors"
						/>
					</div>
					<div>
						<label className="text-xs text-gray-400 mb-1.5 block">
							비밀번호
						</label>
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-indigo-500 transition-colors"
						/>
					</div>

					{error && <Alert>{error}</Alert>}

					<button
						type="submit"
						disabled={loading}
						className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors disabled:opacity-50"
					>
						{loading ? "로그인 중..." : "로그인"}
					</button>
				</form>
			</div>
		</div>
	);
}
