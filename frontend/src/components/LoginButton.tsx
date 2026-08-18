import { startGoogleLogin } from '../api/auth';
import { useAuth } from '../hooks/useAuth';
import './LoginButton.css';

export default function LoginButton() {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return <div className="overlay-card login-button login-button-loading" aria-hidden="true" />;
  }

  if (user) {
    return (
      <div className="overlay-card login-button">
        <span className="login-button-name">{user.displayName}님</span>
        <button type="button" onClick={() => void logout()}>
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <div className="overlay-card login-button">
      <button type="button" onClick={startGoogleLogin}>
        Google로 로그인
      </button>
    </div>
  );
}
