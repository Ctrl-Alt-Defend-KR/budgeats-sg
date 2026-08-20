import './RecenterButton.css';

interface RecenterButtonProps {
  onClick: () => void;
}

/**
 * 지도를 현재 위치로 되돌리는 버튼.
 *
 * 위치 권한을 받았을 때만 렌더한다 — 돌아갈 위치가 없으면 버튼이 아무 일도 못 한다.
 * 배치는 `.overlay-bottom-left`가 담당하며, Google attribution 위로 띄운다
 * (로고를 가리면 약관 위반 — CLAUDE.md 3.1절).
 */
export default function RecenterButton({ onClick }: RecenterButtonProps) {
  return (
    <button type="button" className="recenter" onClick={onClick} title="현재 위치로 이동">
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
        <path
          d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6v3m0 14v3m10-10h-3M5 12H2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span className="recenter-label">현재 위치</span>
    </button>
  );
}
