import { clientConfig } from "../client.config";
import { BrandMark } from "./BrandMark";

export function LoadingScreen() {
  return (
    <div
      style={{
        background: "radial-gradient(circle at 30% 35%, var(--c-darkAlt) 0%, var(--c-dark) 70%)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
      }}
    >
      <style>{`
        @keyframes moo-bounce {
          0%   { transform: scale(1) rotate(0deg); }
          25%  { transform: scale(1.18) rotate(-5deg); }
          50%  { transform: scale(0.94) rotate(0deg); }
          75%  { transform: scale(1.1) rotate(5deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes moo-fade {
          0%   { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div style={{ animation: "moo-bounce 1.8s ease-in-out infinite" }}>
        <BrandMark size={110} />
      </div>
      <div
        style={{
          fontFamily: "Baloo 2, sans-serif",
          fontWeight: 800,
          fontSize: 26,
          color: "var(--c-cream)",
          marginTop: 20,
          animation: "moo-fade 0.6s ease-out 0.15s both",
        }}
      >
        {clientConfig.brandName}
      </div>
      <div
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 14,
          color: "var(--c-lilac)",
          marginTop: 10,
          maxWidth: 260,
          lineHeight: 1.5,
          animation: "moo-fade 0.6s ease-out 0.3s both",
        }}
      >
        {clientConfig.loadingMessage}
      </div>
    </div>
  );
}
