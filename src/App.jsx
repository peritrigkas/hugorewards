import React, { useState, useEffect, useRef } from "react";
import qrcode from "qrcode-generator";
import {
  Menu, User, Home, Star, QrCode, UtensilsCrossed, MapPin,
  ChevronRight, ChevronLeft, Gift, X, Instagram, Facebook, Music2,
} from "lucide-react";
import { supabase } from "./supabaseClient";
import { Capacitor } from "@capacitor/core";
import { BarcodeScanner } from "@capacitor-mlkit/barcode-scanning";

const STAMPS_FOR_REWARD = 9;
const STORAGE_KEY = "hugo_customer_code";
// Basic deterrent, not real security — this ships inside the app bundle, so anyone
// determined enough could find it. Fine for keeping casual customers out of the
// staff view; replace with real Supabase Auth before this matters for real security.
const STAFF_PIN = "4269";

function makeCode() {
  return `HUGO-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function CowMark({ size = 40, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
      <path d="M28 30 Q14 18 20 4 Q30 10 32 26 Z" fill="#1A1420" />
      <path d="M70 28 Q90 22 92 2 Q76 4 66 22 Q66 22 70 28" fill="#1A1420" />
      <ellipse cx="16" cy="46" rx="13" ry="9" fill="#F6EEDF" stroke="#1A1420" strokeWidth="3.5" transform="rotate(-18 16 46)" />
      <ellipse cx="86" cy="42" rx="15" ry="10" fill="#F6EEDF" stroke="#1A1420" strokeWidth="3.5" transform="rotate(24 86 42)" />
      <path d="M50 12 C72 12 82 30 80 52 C78 74 66 90 50 90 C34 90 22 74 20 52 C18 30 28 12 50 12 Z" fill="#F6EEDF" stroke="#1A1420" strokeWidth="4" />
      <path d="M60 20 Q76 26 72 44 Q64 50 56 40 Q52 26 60 20 Z" fill="#C9A8DC" stroke="#1A1420" strokeWidth="2.5" />
      <circle cx="38" cy="52" r="13" fill="#fff" stroke="#1A1420" strokeWidth="3" />
      <circle cx="38" cy="52" r="5.5" fill="#1A1420" />
      <circle cx="35.5" cy="49.5" r="1.6" fill="#fff" />
      <path d="M62 48 Q68 44 74 48" stroke="#1A1420" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M62 54 Q68 58 74 54" stroke="#1A1420" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <ellipse cx="50" cy="74" rx="20" ry="13" fill="#fff" stroke="#1A1420" strokeWidth="3.2" />
      <ellipse cx="43" cy="74" rx="2.6" ry="3.6" fill="#1A1420" />
      <ellipse cx="57" cy="74" rx="2.6" ry="3.6" fill="#1A1420" />
      <path d="M46 84 Q44 96 52 98 Q60 96 54 84 Z" fill="#E38699" stroke="#1A1420" strokeWidth="2.5" />
      <path d="M48 88 Q52 90 51 94" stroke="#1A1420" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

const COW_SPOTS = [
  { cx: 28, cy: 36, r: 12 }, { cx: 56, cy: 30, r: 9 }, { cx: 78, cy: 42, r: 11 },
  { cx: 40, cy: 58, r: 10 }, { cx: 66, cy: 62, r: 8 }, { cx: 95, cy: 60, r: 9 },
  { cx: 18, cy: 62, r: 7 }, { cx: 90, cy: 24, r: 7 }, { cx: 108, cy: 44, r: 10 },
];

function CowStampCard({ stamps }) {
  const isComplete = stamps >= STAMPS_FOR_REWARD;
  return (
    <svg width="100%" viewBox="-10 0 150 90" style={{ maxWidth: 320, display: "block", margin: "0 auto" }}>
      <ellipse cx="65" cy="50" rx="60" ry="34" fill="#F6EEDF" stroke="#1A1420" strokeWidth="3" />
      <circle cx="130" cy="34" r="20" fill="#F6EEDF" stroke="#1A1420" strokeWidth="3" />
      <path d="M117 16 L108 -2 L126 10 Z" fill="#1A1420" />
      <path d="M143 16 L155 -1 L149 18 Z" fill="#1A1420" />
      <circle cx="137" cy="30" r="3" fill="#1A1420" />
      <circle cx="121" cy="34" r="2.6" fill="#1A1420" />
      <path d="M116 42 Q130 50 144 42" stroke="#1A1420" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      {[10, 35, 90, 115].map((x, i) => (
        <rect key={i} x={x} y="78" width="9" height="16" rx="4" fill="#1A1420" />
      ))}
      {COW_SPOTS.map((s, i) => {
        const filled = i < stamps;
        return (
          <g key={i}>
            <circle cx={s.cx} cy={s.cy} r={s.r} fill={filled ? "#1A1420" : "#F6EEDF"} stroke="#1A1420" strokeWidth={filled ? 0 : 2} />
            {i === COW_SPOTS.length - 1 && isComplete && (
              <text x={s.cx} y={s.cy + 3} textAnchor="middle" fontSize="6.5" fill="#F6EEDF" fontFamily="Inter, sans-serif" fontWeight="700">
                free!
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function QrCanvas({ value, size = 200 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!value || !canvasRef.current) return;
    const qr = qrcode(0, "M");
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();
    const canvas = canvasRef.current;
    const cellSize = size / count;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#1A1420";
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (qr.isDark(row, col)) ctx.fillRect(col * cellSize, row * cellSize, cellSize + 0.5, cellSize + 0.5);
      }
    }
  }, [value, size]);
  return <canvas ref={canvasRef} style={{ borderRadius: 12, display: "block" }} />;
}

function TopBar({ onBack, onMenu, onSecretTap, onAccount }) {
  return (
    <div style={{ background: "#1A1420", padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      {onBack ? (
        <ChevronLeft color="#F6EEDF" size={24} onClick={onBack} style={{ cursor: "pointer" }} />
      ) : (
        <Menu color="#F6EEDF" size={24} onClick={onMenu} style={{ cursor: "pointer" }} />
      )}
      <div
        onClick={onSecretTap}
        style={{ fontFamily: "Baloo 2, sans-serif", fontWeight: 800, fontSize: 26, color: "#F6EEDF", userSelect: "none" }}
      >
        Hugo
      </div>
      <User color="#F6EEDF" size={24} onClick={onAccount} style={{ cursor: onAccount ? "pointer" : "default" }} />
    </div>
  );
}

function DrawerMenu({ open, onClose, navigate }) {
  const items = [
    { icon: Home, label: "Home", screen: "home" },
    { icon: Star, label: "My Rewards", screen: "rewards" },
    { icon: QrCode, label: "Scan Code", screen: "scan" },
    { icon: UtensilsCrossed, label: "Menu", screen: "menu" },
    { icon: MapPin, label: "Visit Us", screen: "visit" },
  ];
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(26,20,32,0.5)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity 0.25s ease", zIndex: 40 }} />
      <div style={{ position: "fixed", top: 0, bottom: 0, left: 0, width: "78%", maxWidth: 320, background: "#F6EEDF", zIndex: 50, transform: open ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.28s ease", boxShadow: open ? "4px 0 24px rgba(0,0,0,0.2)" : "none", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 20px 24px" }}>
          <X color="#1A1420" size={24} onClick={onClose} style={{ cursor: "pointer" }} />
        </div>
        {items.map((item) => (
          <div key={item.screen} onClick={() => { navigate(item.screen); onClose(); }} style={{ display: "flex", alignItems: "center", gap: 20, padding: "16px 24px", cursor: "pointer" }}>
            <item.icon color="#D9A441" size={24} />
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 17, color: "#1A1420" }}>{item.label}</span>
          </div>
        ))}
        <div style={{ marginTop: "auto", padding: "24px", display: "flex", gap: 12, justifyContent: "center" }}>
          {[Facebook, Music2, Instagram].map((Icon, i) => (
            <div key={i} style={{ width: 40, height: 40, borderRadius: "50%", background: "#D9A441", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon color="#1A1420" size={18} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function BottomNav({ screen, navigate }) {
  const tabs = [
    { icon: Home, label: "Home", screen: "home" },
    { icon: Star, label: "Rewards", screen: "rewards" },
    { icon: QrCode, label: "Scan Code", screen: "scan" },
    { icon: UtensilsCrossed, label: "Menu", screen: "menu" },
    { icon: MapPin, label: "Visit", screen: "visit" },
  ];
  const rewardsGroup = ["rewards", "cards", "gifts"];
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #ECE0F5", display: "flex", padding: "10px 4px 14px", maxWidth: 420, margin: "0 auto", zIndex: 10 }}>
      {tabs.map((t, i) => {
        const isActive = t.screen === "rewards" ? rewardsGroup.includes(screen) : t.screen === screen;
        return (
          <div key={i} onClick={() => navigate(t.screen)} style={{ flex: 1, textAlign: "center", cursor: "pointer" }}>
            <t.icon color={isActive ? "#D9A441" : "#B8ACC0"} size={22} style={{ margin: "0 auto" }} />
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: isActive ? "#D9A441" : "#B8ACC0", marginTop: 4 }}>{t.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function JoinScreen({ onJoin }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputStyle = { width: "100%", padding: "13px 14px", borderRadius: 12, border: "1px solid #D8C3E8", fontFamily: "Inter, sans-serif", fontSize: 15, marginBottom: 14, boxSizing: "border-box" };

  return (
    <div style={{ background: "#F6EEDF", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 360, width: "100%", textAlign: "center" }}>
        <CowMark size={72} style={{ margin: "0 auto 16px" }} />
        <div style={{ fontFamily: "Baloo 2, sans-serif", fontWeight: 800, fontSize: 30, color: "#1A1420", marginBottom: 6 }}>Hugo</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6E5A73", marginBottom: 24 }}>
          Join up — buy 9, the 10th's on the cow.
        </div>
        <input style={inputStyle} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
        <input style={inputStyle} placeholder="Phone or email" value={contact} onChange={(e) => setContact(e.target.value)} />
        {error && <p style={{ fontFamily: "Inter, sans-serif", color: "#8A2E2E", fontSize: 13, marginTop: -6, marginBottom: 12 }}>{error}</p>}
        <button
          disabled={!name || !contact || busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            const ok = await onJoin(name, contact);
            setBusy(false);
            if (!ok) setError("Couldn't join right now — check your connection and try again.");
          }}
          style={{ width: "100%", background: name && contact && !busy ? "#1A1420" : "#D8C3E8", color: "#F6EEDF", border: "none", padding: "14px", borderRadius: 999, fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 15, cursor: name && contact && !busy ? "pointer" : "not-allowed" }}
        >
          {busy ? "Joining…" : "Join Hugo Rewards"}
        </button>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#8B7A93", marginTop: 14 }}>
          Already joined? Enter the same phone or email to get your card back.
        </div>
      </div>
    </div>
  );
}

function StatBlock({ value, label, emoji }) {
  return (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div style={{ fontFamily: "Baloo 2, sans-serif", fontSize: 26, color: "#1A1420", fontWeight: 700 }}>{value}</div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6E5A73", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18 }}>{emoji}</div>
    </div>
  );
}

function Greeting({ customer }) {
  return (
    <div style={{ padding: "28px 20px 20px", textAlign: "center" }}>
      <div style={{ fontFamily: "Baloo 2, sans-serif", fontSize: 24, color: "#1A1420", marginBottom: 4 }}>
        Hey {customer.name.split(" ")[0]}!
      </div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6E5A73", marginBottom: 22 }}>
        Keep on mooing for more rewards!
      </div>
      <div style={{ display: "flex" }}>
        <StatBlock value={customer.stamps} label="Stamps" emoji="☕" />
        <div style={{ width: 1, background: "#E3D5ED" }} />
        <StatBlock value="0" label="Gift List" emoji="🎁" />
        <div style={{ width: 1, background: "#E3D5ED" }} />
        <StatBlock value="1" label="Cards" emoji="🐮" />
      </div>
    </div>
  );
}

function HeroBanner() {
  return (
    <div style={{ margin: "0 0 24px", background: "linear-gradient(160deg, #D8C3E8 0%, #C9A8DC 100%)", padding: "50px 24px", textAlign: "center" }}>
      <CowMark size={90} style={{ margin: "0 auto 8px", opacity: 0.9 }} />
      <div style={{ fontFamily: "Baloo 2, sans-serif", fontWeight: 800, fontSize: 40, color: "#1A1420", lineHeight: 1.05 }}>
        Offbeat
        <br />
        Coffee
      </div>
    </div>
  );
}

function SwirlDivider() {
  return (
    <div style={{ height: 200, margin: "0 0 32px", position: "relative", overflow: "hidden", background: "radial-gradient(circle at 20% 30%, #D9A441 0%, transparent 45%), radial-gradient(circle at 80% 70%, #C9A8DC 0%, transparent 50%), linear-gradient(160deg, #1A1420 0%, #3D2B45 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "Baloo 2, sans-serif", fontWeight: 800, fontSize: 34, color: "#F6EEDF", textAlign: "center", lineHeight: 1.1 }}>
        Small batch.
        <br />
        Big mood.
      </div>
    </div>
  );
}

function EarnRewardsCard({ onView }) {
  return (
    <div style={{ padding: "0 20px", marginBottom: 32 }}>
      <div onClick={onView} style={{ background: "linear-gradient(160deg, #D8C3E8 0%, #C9A8DC 100%)", borderRadius: 20, padding: "32px 24px", textAlign: "center", position: "relative", overflow: "hidden", cursor: "pointer" }}>
        <div style={{ position: "absolute", top: -14, right: -14, opacity: 0.2 }}>
          <CowMark size={140} />
        </div>
        <div style={{ fontFamily: "Baloo 2, sans-serif", fontSize: 26, color: "#1A1420", marginBottom: 10, position: "relative" }}>Earn Rewards</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#3D2B45", marginBottom: 22, position: "relative" }}>Buy 9, the 10th's on the cow.</div>
        <button style={{ background: "#1A1420", color: "#F6EEDF", border: "none", padding: "12px 28px", borderRadius: 999, fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer", position: "relative" }}>
          View Rewards
        </button>
      </div>
    </div>
  );
}

function MenuStrip() {
  const items = [
    { name: "The Usual", tag: "house oat latte", bg: "#F6EEDF" },
    { name: "Purple Day", tag: "ube cold foam", bg: "#D8C3E8" },
    { name: "Cow in Green", tag: "mint matcha", bg: "#C9DDB8" },
  ];
  return (
    <div style={{ padding: "0 20px", marginBottom: 32 }}>
      <div style={{ fontFamily: "Baloo 2, sans-serif", fontSize: 20, color: "#1A1420", marginBottom: 14 }}>On the menu</div>
      <div style={{ display: "flex", gap: 12 }}>
        {items.map((item) => (
          <div key={item.name} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ background: item.bg, borderRadius: 16, border: "2px solid #1A1420", aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
              <CowMark size={44} />
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 12, color: "#1A1420" }}>{item.name}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "#6E5A73" }}>{item.tag}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressSection({ customer }) {
  const pct = (customer.stamps / STAMPS_FOR_REWARD) * 100;
  return (
    <div style={{ padding: "0 20px", marginBottom: 32 }}>
      <div style={{ fontFamily: "Baloo 2, sans-serif", fontSize: 20, color: "#1A1420", marginBottom: 16 }}>My Stamp Progress</div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ fontFamily: "Baloo 2, sans-serif", fontSize: 22, color: "#D9A441", fontWeight: 700, whiteSpace: "nowrap" }}>{customer.stamps}/{STAMPS_FOR_REWARD}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#1A1420", marginBottom: 8 }}>Collect {STAMPS_FOR_REWARD} stamps for a free coffee</div>
          <div style={{ position: "relative" }}>
            <div style={{ height: 14, borderRadius: 999, background: "#ECE0F5", border: "2px solid #1A1420", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "#D9A441", borderRadius: 999, transition: "width 0.3s ease" }} />
            </div>
            <div style={{ position: "absolute", right: -6, top: -14 }}>
              <CowMark size={30} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FollowUs() {
  return (
    <div style={{ textAlign: "center", paddingBottom: 100 }}>
      <div style={{ fontFamily: "Baloo 2, sans-serif", fontSize: 20, color: "#1A1420", marginBottom: 18 }}>Follow us</div>
      <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
        {[Facebook, Music2, Instagram].map((Icon, i) => (
          <div key={i} style={{ width: 48, height: 48, borderRadius: "50%", background: "#D9A441", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon color="#1A1420" size={22} />
          </div>
        ))}
      </div>
    </div>
  );
}

function HomeScreen({ customer, goToRewards }) {
  return (
    <div>
      <Greeting customer={customer} />
      <HeroBanner />
      <SwirlDivider />
      <EarnRewardsCard onView={goToRewards} />
      <MenuStrip />
      <ProgressSection customer={customer} />
      <FollowUs />
    </div>
  );
}

function RewardsHero() {
  return (
    <div style={{ height: 150, position: "relative", overflow: "hidden", background: "radial-gradient(circle at 20% 30%, #D9A441 0%, transparent 45%), radial-gradient(circle at 80% 70%, #C9A8DC 0%, transparent 50%), linear-gradient(160deg, #1A1420 0%, #3D2B45 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "Baloo 2, sans-serif", fontWeight: 800, fontSize: 32, color: "#F6EEDF" }}>Your Rewards</div>
    </div>
  );
}

function PromoCard({ title, body, cta, bg, color, onClick }) {
  return (
    <div onClick={onClick} style={{ background: bg, borderRadius: 20, padding: "26px 22px", margin: "0 20px 20px", cursor: onClick ? "pointer" : "default" }}>
      <div style={{ fontFamily: "Baloo 2, sans-serif", fontWeight: 800, fontSize: 20, color, marginBottom: 12, letterSpacing: 0.3 }}>{title}</div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color, opacity: 0.9, lineHeight: 1.5, marginBottom: 28 }}>{body}</div>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4 }}>
        <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 12, color, letterSpacing: 0.5 }}>{cta}</span>
        <ChevronRight size={16} color={color} />
      </div>
    </div>
  );
}

function HowToEarn() {
  const steps = [
    { n: 1, title: "REGISTER", body: "Sign up for Hugo Rewards and get a free coffee just for joining, plus a treat on your birthday." },
    { n: 2, title: "VISIT US", body: "Collect a stamp on every visit. Just show your code when you order." },
    { n: 3, title: "REDEEM", body: "Buy 9 coffees, the 10th's on the cow. Simple as that." },
  ];
  return (
    <div style={{ padding: "8px 20px 32px" }}>
      <div style={{ fontFamily: "Baloo 2, sans-serif", fontSize: 24, color: "#1A1420", marginBottom: 18 }}>How to start earning</div>
      {steps.map((s) => (
        <div key={s.n} style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14, color: "#1A1420", marginBottom: 4 }}>{s.n}) {s.title}</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6E5A73", lineHeight: 1.5 }}>{s.body}</div>
        </div>
      ))}
    </div>
  );
}

function RewardsHome({ goToCards, goToGifts }) {
  return (
    <div style={{ paddingBottom: 100 }}>
      <RewardsHero />
      <div style={{ height: 20 }} />
      <PromoCard title="MY LOYALTY CARDS" body="Get a stamp on your Hugo card for every coffee — buy 9, and the 10th's on the cow." cta="VIEW CARDS" bg="#1A1420" color="#F6EEDF" onClick={goToCards} />
      <PromoCard title="MY GIFTS" body="Check what's waiting for you — like a free coffee on your birthday." cta="VIEW GIFT LIST" bg="#D9A441" color="#1A1420" onClick={goToGifts} />
      <HowToEarn />
    </div>
  );
}

function LoyaltyCardDetail({ customer }) {
  const [tab, setTab] = useState("active");
  return (
    <div style={{ paddingBottom: 60 }}>
      <div style={{ display: "flex", padding: "20px 20px 0" }}>
        {["active", "nonactive"].map((t) => (
          <div key={t} onClick={() => setTab(t)} style={{ flex: 1, textAlign: "center", paddingBottom: 12, borderBottom: tab === t ? "2px solid #1A1420" : "2px solid transparent", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, color: tab === t ? "#1A1420" : "#B8ACC0", cursor: "pointer" }}>
            {t === "active" ? "Active (1)" : "Non-Active"}
          </div>
        ))}
      </div>
      {tab === "active" ? (
        <div style={{ padding: "24px 20px" }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "24px 20px", border: "1px solid #ECE0F5", boxShadow: "0 8px 24px rgba(26,20,32,0.08)" }}>
            <div style={{ fontFamily: "Baloo 2, sans-serif", fontSize: 18, color: "#1A1420", marginBottom: 16 }}>Hugo Loyalty Card</div>
            <CowStampCard stamps={customer.stamps} />
            <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 12, color: "#8B7A93", marginTop: 12 }}>Code: {customer.code}</div>
          </div>
        </div>
      ) : (
        <div style={{ padding: "40px 20px", textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 13, color: "#8B7A93" }}>
          No past cards yet — your redeemed and expired cards will show up here.
        </div>
      )}
    </div>
  );
}

function GiftsView() {
  return (
    <div style={{ paddingBottom: 60 }}>
      <div style={{ padding: "24px 20px" }}>
        <div style={{ fontFamily: "Baloo 2, sans-serif", fontSize: 22, color: "#1A1420", marginBottom: 18 }}>My Gifts</div>
        <div style={{ background: "#D8C3E8", borderRadius: 18, padding: "20px", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ background: "#fff", borderRadius: "50%", width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Gift color="#1A1420" size={24} />
          </div>
          <div>
            <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14, color: "#1A1420" }}>Birthday Coffee</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#3D2B45", marginTop: 2 }}>Free drink of your choice — valid all week of your birthday</div>
          </div>
        </div>
        <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 13, color: "#8B7A93", marginTop: 24 }}>
          Nothing else waiting right now — check back after your next few visits.
        </div>
      </div>
    </div>
  );
}

function ScanCodeScreen({ customer }) {
  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ height: 130, position: "relative", overflow: "hidden", background: "radial-gradient(circle at 20% 30%, #D9A441 0%, transparent 45%), radial-gradient(circle at 80% 70%, #C9A8DC 0%, transparent 50%), linear-gradient(160deg, #1A1420 0%, #3D2B45 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "Baloo 2, sans-serif", fontWeight: 800, fontSize: 28, color: "#F6EEDF" }}>Scan Code</div>
      </div>
      <div style={{ padding: "28px 20px" }}>
        <div style={{ background: "#fff", borderRadius: 24, padding: "28px 24px", textAlign: "center", border: "1px solid #ECE0F5", boxShadow: "0 8px 24px rgba(26,20,32,0.08)" }}>
          <div style={{ fontFamily: "Baloo 2, sans-serif", fontSize: 18, color: "#1A1420", marginBottom: 4 }}>Show this to staff</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6E5A73", marginBottom: 24 }}>Scanned at checkout to add a stamp or redeem a reward</div>
          <div style={{ display: "inline-block", padding: 16, background: "#F6EEDF", borderRadius: 16, border: "2px solid #1A1420" }}>
            <QrCanvas value={customer.code} size={190} />
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: 1, color: "#D9A441", marginTop: 16 }}>{customer.code}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 24, padding: "0 4px" }}>
          <CowMark size={32} />
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#6E5A73", lineHeight: 1.5 }}>
            Your code stays the same — no need to screenshot it, just open this screen at the counter.
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuScreen() {
  const categories = [
    { title: "Coffee", body: "A small, considered coffee list pulled from our own house blend — proper speciality coffee, no fuss, made the way you like it." },
    { title: "Matcha", body: "Stone-ground ceremonial matcha, whisked to order. Earthy, vibrant, and never bitter — hot or over ice." },
    { title: "Food", body: "A short, honest food menu made fresh to order — think a proper sandwich and something warm on toast, not a hundred things done half-heartedly." },
  ];
  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ height: 150, position: "relative", overflow: "hidden", background: "radial-gradient(circle at 20% 30%, #D9A441 0%, transparent 45%), radial-gradient(circle at 80% 70%, #C9A8DC 0%, transparent 50%), linear-gradient(160deg, #1A1420 0%, #3D2B45 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "Baloo 2, sans-serif", fontWeight: 800, fontSize: 32, color: "#F6EEDF" }}>Our Menu</div>
      </div>
      <div style={{ padding: "28px 20px" }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: "#1A1420", lineHeight: 1.6, marginBottom: 32 }}>
          Hugo keeps things small and offbeat rather than trying to be everything — a short menu, done properly, adapted for dietary requirements on request.
        </div>
        {categories.map((c) => (
          <div key={c.title} style={{ marginBottom: 26 }}>
            <div style={{ fontFamily: "Baloo 2, sans-serif", fontSize: 20, color: "#1A1420", marginBottom: 6 }}>{c.title}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6E5A73", lineHeight: 1.6 }}>{c.body}</div>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, padding: "16px 4px 0", borderTop: "1px solid #ECE0F5" }}>
          <CowMark size={30} />
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#8B7A93", lineHeight: 1.5 }}>
            Ask in store for today's specials — the board changes more often than this page does.
          </div>
        </div>
      </div>
    </div>
  );
}

function VisitScreen() {
  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ height: 150, position: "relative", overflow: "hidden", background: "radial-gradient(circle at 20% 30%, #D9A441 0%, transparent 45%), radial-gradient(circle at 80% 70%, #C9A8DC 0%, transparent 50%), linear-gradient(160deg, #1A1420 0%, #3D2B45 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "Baloo 2, sans-serif", fontWeight: 800, fontSize: 32, color: "#F6EEDF" }}>Find Us</div>
      </div>
      <div style={{ padding: "28px 20px" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <CowMark size={70} />
        </div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#1A1420", textAlign: "center", lineHeight: 1.6, marginBottom: 28 }}>
          One shop, in the West Village. Come find the purple building, mind the cow.
        </div>
        <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #ECE0F5", padding: "22px 20px", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
            <MapPin color="#D9A441" size={22} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14, color: "#1A1420" }}>Address</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6E5A73", marginTop: 2 }}>17 Perry St, New York, NY 10014</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
            <div style={{ width: 22, textAlign: "center", flexShrink: 0, fontSize: 16 }}>🕐</div>
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14, color: "#1A1420" }}>Hours</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6E5A73", marginTop: 2 }}>7am – 7pm, every day</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            <div style={{ width: 22, textAlign: "center", flexShrink: 0, fontSize: 16 }}>📞</div>
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14, color: "#1A1420" }}>Contact</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6E5A73", marginTop: 2 }}>212-COW-HUGO</div>
            </div>
          </div>
        </div>
        <button style={{ width: "100%", background: "#1A1420", color: "#F6EEDF", border: "none", padding: "14px", borderRadius: 999, fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 32 }}>
          Get Directions
        </button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "Baloo 2, sans-serif", fontSize: 18, color: "#1A1420", marginBottom: 14 }}>Follow us</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            {[Facebook, Music2, Instagram].map((Icon, i) => (
              <div key={i} style={{ width: 42, height: 42, borderRadius: "50%", background: "#D9A441", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon color="#1A1420" size={18} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountScreen({ customer, onSave, onLogout, onDelete }) {
  const [name, setName] = useState(customer.name);
  const [contact, setContact] = useState(customer.contact || "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const inputStyle = { width: "100%", padding: "13px 14px", borderRadius: 12, border: "1px solid #D8C3E8", fontFamily: "Inter, sans-serif", fontSize: 15, marginBottom: 14, boxSizing: "border-box" };

  const save = async () => {
    setBusy(true);
    setError("");
    setSaved(false);
    const ok = await onSave(name, contact);
    setBusy(false);
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      setError("Couldn't save — check your connection and try again.");
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError("");
    const ok = await onDelete();
    setDeleting(false);
    if (!ok) {
      setDeleteError("Couldn't delete — check your connection and try again.");
    }
  };

  return (
    <div style={{ paddingBottom: 100 }}>
      <div
        style={{
          height: 130, position: "relative", overflow: "hidden",
          background: "radial-gradient(circle at 20% 30%, #D9A441 0%, transparent 45%), radial-gradient(circle at 80% 70%, #C9A8DC 0%, transparent 50%), linear-gradient(160deg, #1A1420 0%, #3D2B45 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <div style={{ fontFamily: "Baloo 2, sans-serif", fontWeight: 800, fontSize: 28, color: "#F6EEDF" }}>My Account</div>
      </div>

      <div style={{ padding: "28px 20px" }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: "24px 20px", border: "1px solid #ECE0F5", marginBottom: 20 }}>
          <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: "#8B7A93", display: "block", marginBottom: 6 }}>Name</label>
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
          <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: "#8B7A93", display: "block", marginBottom: 6 }}>Phone or email</label>
          <input style={{ ...inputStyle, marginBottom: 4 }} value={contact} onChange={(e) => setContact(e.target.value)} />
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#8B7A93", marginBottom: 18 }}>Your loyalty code: {customer.code}</div>
          {error && <p style={{ fontFamily: "Inter, sans-serif", color: "#8A2E2E", fontSize: 13, marginBottom: 12 }}>{error}</p>}
          {saved && <p style={{ fontFamily: "Inter, sans-serif", color: "#1A1420", fontSize: 13, marginBottom: 12, fontWeight: 600 }}>✓ Saved</p>}
          <button
            disabled={!name || busy}
            onClick={save}
            style={{ width: "100%", background: name && !busy ? "#1A1420" : "#D8C3E8", color: "#F6EEDF", border: "none", padding: "13px", borderRadius: 999, fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14, cursor: name && !busy ? "pointer" : "not-allowed" }}
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>

        {!confirmingLogout ? (
          <button
            onClick={() => setConfirmingLogout(true)}
            style={{ width: "100%", background: "transparent", color: "#8A2E2E", border: "1px solid #E3B8B8", padding: "13px", borderRadius: 999, fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer", marginBottom: 14 }}
          >
            Log out
          </button>
        ) : (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E3B8B8", padding: 16, textAlign: "center", marginBottom: 14 }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#1A1420", marginBottom: 12 }}>
              Log out of this card? You'll need to join again to get a new one on this device.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmingLogout(false)} style={{ flex: 1, background: "#ECE0F5", color: "#1A1420", border: "none", padding: "11px", borderRadius: 999, fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={onLogout} style={{ flex: 1, background: "#8A2E2E", color: "#fff", border: "none", padding: "11px", borderRadius: 999, fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Log out</button>
            </div>
          </div>
        )}

        {!confirmingDelete ? (
          <button
            onClick={() => setConfirmingDelete(true)}
            style={{ width: "100%", background: "transparent", color: "#8A2E2E", border: "none", padding: "10px", fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}
          >
            Delete my account and data
          </button>
        ) : (
          <div style={{ background: "#FBEAEA", borderRadius: 16, border: "1px solid #E3B8B8", padding: 16, textAlign: "center" }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#1A1420", marginBottom: 4, fontWeight: 700 }}>
              This can't be undone
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#1A1420", marginBottom: 12 }}>
              Your name, contact info, and stamp history will be permanently deleted.
            </div>
            {deleteError && (
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#8A2E2E", fontWeight: 600, marginBottom: 12 }}>
                {deleteError}
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmingDelete(false)} disabled={deleting} style={{ flex: 1, background: "#ECE0F5", color: "#1A1420", border: "none", padding: "11px", borderRadius: 999, fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={confirmDelete} disabled={deleting} style={{ flex: 1, background: "#8A2E2E", color: "#fff", border: "none", padding: "11px", borderRadius: 999, fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                {deleting ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ScanPanel({ customers, onFoundCode }) {
  const isNative = Capacitor.isNativePlatform();
  const [scanning, setScanning] = useState(false);
  const [supported, setSupported] = useState(true);
  const [message, setMessage] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [devices, setDevices] = useState([]);
  const [deviceIndex, setDeviceIndex] = useState(0);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const rafRef = useRef(null);

  const handleCode = async (raw) => {
    const result = await onFoundCode(raw.trim());
    setMessage(result.ok ? `✓ Added a stamp for ${result.name}` : result.message);
    setTimeout(() => setMessage(""), 2500);
  };

  // ---- Native path: Android's real camera pipeline via ML Kit, no black-frame issues ----
  const startNativeScan = async () => {
    setMessage("");
    try {
      const { camera } = await BarcodeScanner.checkPermissions();
      if (camera !== "granted") {
        const req = await BarcodeScanner.requestPermissions();
        if (req.camera !== "granted") {
          setMessage("Camera permission denied — enable it in phone settings, or type the code below.");
          return;
        }
      }
      const { barcodes } = await BarcodeScanner.scan();
      if (barcodes && barcodes.length > 0) {
        handleCode(barcodes[0].rawValue);
      }
    } catch (e) {
      setMessage("Scan cancelled or failed — try again, or type the code below.");
    }
  };

  // ---- Browser fallback path: only used when testing this page in a regular browser tab, not the installed app ----
  const stopStream = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
  };

  const stopBrowserScan = () => {
    setScanning(false);
    stopStream();
  };

  const openCamera = async (list, index) => {
    stopStream();
    detectorRef.current = new window.BarcodeDetector({ formats: ["qr_code"] });
    const chosen = list[index];
    const constraints = chosen
      ? { video: { deviceId: { exact: chosen.deviceId } } }
      : { video: { facingMode: { ideal: "environment" } } };
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e) {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
    }
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await new Promise((resolve) => { videoRef.current.onloadedmetadata = resolve; });
      await videoRef.current.play();
    }
    const tick = async () => {
      if (!videoRef.current || !detectorRef.current) return;
      try {
        const codes = await detectorRef.current.detect(videoRef.current);
        if (codes && codes.length > 0) { handleCode(codes[0].rawValue); stopBrowserScan(); return; }
      } catch (e) {}
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const startBrowserScan = async () => {
    setMessage("");
    if (!("BarcodeDetector" in window)) { setSupported(false); return; }
    try {
      const primer = await navigator.mediaDevices.getUserMedia({ video: true });
      primer.getTracks().forEach((t) => t.stop());
      const all = await navigator.mediaDevices.enumerateDevices();
      const cams = all.filter((d) => d.kind === "videoinput");
      setDevices(cams);
      setDeviceIndex(0);
      setScanning(true);
      await openCamera(cams, 0);
    } catch (e) {
      setSupported(false);
    }
  };

  const switchCamera = async () => {
    if (devices.length < 2) return;
    const next = (deviceIndex + 1) % devices.length;
    setDeviceIndex(next);
    await openCamera(devices, next);
  };

  useEffect(() => (isNative ? undefined : stopBrowserScan), []);

  if (isNative) {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto 28px", background: "#fff", border: "1px solid #ECE0F5", borderRadius: 18, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontFamily: "Baloo 2, sans-serif", fontSize: 18, color: "#1A1420", margin: 0 }}>Scan to add a stamp</h3>
          <button onClick={startNativeScan} style={{ background: "#1A1420", color: "#fff", border: "none", borderRadius: 999, padding: "8px 16px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Start scan</button>
        </div>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6E5A73", marginBottom: 12 }}>
          Opens your phone's camera to scan a customer's QR code directly.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={manualCode} onChange={(e) => setManualCode(e.target.value)} placeholder="Or type code, e.g. HUGO-A1B2C" style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid #D8C3E8", fontFamily: "Inter, sans-serif", fontSize: 13 }} />
          <button onClick={() => { if (manualCode.trim()) { handleCode(manualCode.trim()); setManualCode(""); } }} style={{ background: "#D9A441", color: "#1A1420", border: "none", borderRadius: 10, padding: "10px 16px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Add</button>
        </div>
        {message && <div style={{ marginTop: 10, fontFamily: "Inter, sans-serif", fontSize: 13, color: "#1A1420", fontWeight: 600 }}>{message}</div>}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto 28px", background: "#fff", border: "1px solid #ECE0F5", borderRadius: 18, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ fontFamily: "Baloo 2, sans-serif", fontSize: 18, color: "#1A1420", margin: 0 }}>Scan to add a stamp</h3>
        {!scanning ? (
          <button onClick={startBrowserScan} style={{ background: "#1A1420", color: "#fff", border: "none", borderRadius: 999, padding: "8px 16px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Start scan</button>
        ) : (
          <button onClick={stopBrowserScan} style={{ background: "#ECE0F5", color: "#1A1420", border: "none", borderRadius: 999, padding: "8px 16px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Stop</button>
        )}
      </div>
      {scanning && (
        <div style={{ position: "relative", marginBottom: 12 }}>
          <video ref={videoRef} muted playsInline style={{ width: "100%", borderRadius: 12, background: "#000", display: "block" }} />
          <div style={{ position: "absolute", top: 8, left: 8, display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.5)", padding: "4px 10px", borderRadius: 999 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ADE80" }} />
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#fff" }}>Camera live</span>
          </div>
          {devices.length > 1 && (
            <button
              onClick={switchCamera}
              style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: 999, padding: "6px 14px", fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
            >
              Switch camera ({deviceIndex + 1}/{devices.length})
            </button>
          )}
        </div>
      )}
      {!supported && <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#8A2E2E", marginBottom: 12 }}>Camera QR scanning needs Chrome or Edge. Enter the customer's code below as a fallback.</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <input value={manualCode} onChange={(e) => setManualCode(e.target.value)} placeholder="Or type code, e.g. HUGO-A1B2C" style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid #D8C3E8", fontFamily: "Inter, sans-serif", fontSize: 13 }} />
        <button onClick={() => { if (manualCode.trim()) { handleCode(manualCode.trim()); setManualCode(""); } }} style={{ background: "#D9A441", color: "#1A1420", border: "none", borderRadius: 10, padding: "10px 16px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Add</button>
      </div>
      {message && <div style={{ marginTop: 10, fontFamily: "Inter, sans-serif", fontSize: 13, color: "#1A1420", fontWeight: 600 }}>{message}</div>}
    </div>
  );
}

function StaffLogin({ onLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputStyle = { width: "100%", padding: "13px 14px", borderRadius: 12, border: "1px solid #D8C3E8", fontFamily: "Inter, sans-serif", fontSize: 15, marginBottom: 14, boxSizing: "border-box" };

  const submit = async () => {
    setBusy(true);
    setError("");
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (authError) {
      setError("Incorrect email or password.");
    } else {
      onLoggedIn();
    }
  };

  return (
    <div style={{ background: "#F6EEDF", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 340, width: "100%", textAlign: "center" }}>
        <CowMark size={64} style={{ margin: "0 auto 14px" }} />
        <div style={{ fontFamily: "Baloo 2, sans-serif", fontWeight: 800, fontSize: 24, color: "#1A1420", marginBottom: 4 }}>Staff sign in</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6E5A73", marginBottom: 22 }}>Sign in with your staff account to add stamps.</div>
        <input style={inputStyle} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input style={inputStyle} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
        {error && <p style={{ fontFamily: "Inter, sans-serif", color: "#8A2E2E", fontSize: 13, marginTop: -6, marginBottom: 12 }}>{error}</p>}
        <button
          disabled={!email || !password || busy}
          onClick={submit}
          style={{ width: "100%", background: email && password && !busy ? "#1A1420" : "#D8C3E8", color: "#F6EEDF", border: "none", padding: "13px", borderRadius: 999, fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 15, cursor: email && password && !busy ? "pointer" : "not-allowed" }}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </div>
  );
}

function OwnerApp({ onExit }) {
  const [session, setSession] = useState(undefined); // undefined = checking, null = signed out, object = signed in
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  const fetchCustomers = async () => {
    const { data, error } = await supabase.from("customers").select("*").order("created_at", { ascending: true });
    if (!error && data) setCustomers(data);
  };

  useEffect(() => {
    if (!session) return;
    fetchCustomers().finally(() => setLoading(false));
    const channel = supabase.channel("owner-customers").on("postgres_changes", { event: "*", schema: "public", table: "customers" }, fetchCustomers).subscribe();
    return () => supabase.removeChannel(channel);
  }, [session]);

  const addStampByCode = async (code) => {
    const target = customers.find((c) => c.code === code);
    if (!target) return { ok: false, message: "No customer found for that code" };
    const nextStamps = Math.min(target.stamps + 1, STAMPS_FOR_REWARD);
    const { error } = await supabase.from("customers").update({ stamps: nextStamps }).eq("code", code);
    if (error) return { ok: false, message: "Couldn't save — try again" };
    return { ok: true, name: target.name };
  };

  const resetStamps = async (code) => {
    await supabase.from("customers").update({ stamps: 0 }).eq("code", code);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (session === undefined) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <StaffLogin onLoggedIn={() => {}} />;
  }

  return (
    <div style={{ background: "#F6EEDF", minHeight: "100vh", padding: "0 0 40px", fontFamily: "Inter, sans-serif" }}>
      <div style={{ background: "#1A1420", padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "Baloo 2, sans-serif", fontWeight: 800, fontSize: 22, color: "#F6EEDF" }}>Hugo — Staff</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={signOut} style={{ background: "transparent", color: "#D8C3E8", border: "1px solid #D8C3E8", borderRadius: 999, padding: "6px 14px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
            Sign out
          </button>
          {onExit && (
            <button onClick={onExit} style={{ background: "#ECE0F5", color: "#1A1420", border: "none", borderRadius: 999, padding: "6px 14px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
              Exit staff mode
            </button>
          )}
        </div>
      </div>
      <div style={{ padding: "24px 20px" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "#6E5A73" }}>Loading…</div>
        ) : (
          <>
            <ScanPanel customers={customers} onFoundCode={addStampByCode} />
            {customers.map((c) => (
              <div key={c.code} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", border: "1px solid #ECE0F5", borderRadius: 14, padding: "12px 16px", marginBottom: 10, maxWidth: 480, margin: "0 auto 10px" }}>
                <div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 15, color: "#1A1420" }}>{c.name}</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#8B7A93" }}>{c.stamps} / {STAMPS_FOR_REWARD} stamps · {c.code}</div>
                </div>
                {c.stamps >= STAMPS_FOR_REWARD ? (
                  <button onClick={() => resetStamps(c.code)} style={{ background: "#D9A441", color: "#1A1420", border: "none", borderRadius: 999, padding: "8px 14px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Redeem</button>
                ) : (
                  <button onClick={() => addStampByCode(c.code)} style={{ background: "#1A1420", color: "#fff", border: "none", borderRadius: 999, padding: "8px 14px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>+ Add stamp</button>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div
      style={{
        background: "radial-gradient(circle at 30% 35%, #3D2B45 0%, #1A1420 70%)",
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
        <CowMark size={110} />
      </div>
      <div
        style={{
          fontFamily: "Baloo 2, sans-serif",
          fontWeight: 800,
          fontSize: 26,
          color: "#F6EEDF",
          marginTop: 20,
          animation: "moo-fade 0.6s ease-out 0.15s both",
        }}
      >
        Hugo
      </div>
      <div
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 14,
          color: "#D8C3E8",
          marginTop: 10,
          maxWidth: 260,
          lineHeight: 1.5,
          animation: "moo-fade 0.6s ease-out 0.3s both",
        }}
      >
        You're just a moo away from making your day amazing.
      </div>
    </div>
  );
}

function PinPrompt({ onSubmit, onCancel }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const submit = () => {
    if (pin === STAFF_PIN) {
      onSubmit();
    } else {
      setError(true);
      setPin("");
      setTimeout(() => setError(false), 1500);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,20,32,0.7)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <style>{`
        @keyframes pin-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
      `}</style>
      <div style={{ background: "#F6EEDF", borderRadius: 20, padding: "28px 24px", maxWidth: 320, width: "100%", textAlign: "center", animation: error ? "pin-shake 0.3s ease" : "none" }}>
        <CowMark size={56} style={{ margin: "0 auto 14px" }} />
        <div style={{ fontFamily: "Baloo 2, sans-serif", fontSize: 18, color: "#1A1420", marginBottom: 6 }}>Staff access</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6E5A73", marginBottom: 18 }}>Enter the staff PIN to continue</div>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          style={{ width: "100%", textAlign: "center", letterSpacing: 6, fontSize: 22, padding: "12px", borderRadius: 12, border: error ? "1px solid #8A2E2E" : "1px solid #D8C3E8", fontFamily: "Inter, sans-serif", marginBottom: error ? 8 : 18, boxSizing: "border-box" }}
        />
        {error && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#8A2E2E", marginBottom: 10 }}>Wrong PIN — try again</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, background: "#ECE0F5", color: "#1A1420", border: "none", padding: "12px", borderRadius: 999, fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Cancel</button>
          <button onClick={submit} style={{ flex: 1, background: "#1A1420", color: "#F6EEDF", border: "none", padding: "12px", borderRadius: 999, fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Enter</button>
        </div>
      </div>
    </div>
  );
}

function CustomerApp({ onStaffAccess }) {
  const [screen, setScreen] = useState("home");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef(null);

  const handleSecretTap = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, 2000);
    if (tapCountRef.current >= 7) {
      tapCountRef.current = 0;
      setShowPinPrompt(true);
    }
  };

  const fetchMe = async (code) => {
    const { data, error } = await supabase.from("customers").select("*").eq("code", code).single();
    if (!error && data) setCustomer(data);
  };

  useEffect(() => {
    const savedCode = localStorage.getItem(STORAGE_KEY);
    const minDelay = new Promise((resolve) => setTimeout(resolve, 5000));
    if (savedCode) {
      Promise.all([fetchMe(savedCode), minDelay]).finally(() => setLoading(false));
    } else {
      minDelay.then(() => setLoading(false));
    }
  }, []);

  useEffect(() => {
    if (!customer) return;
    const channel = supabase
      .channel(`customer-${customer.code}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "customers", filter: `code=eq.${customer.code}` }, (payload) => {
        setCustomer(payload.new);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [customer?.code]);

  const handleJoin = async (name, contact) => {
    // Returning customer: if this contact already has a card, log them back into
    // it instead of creating a duplicate — fixes losing stamps on logout/rejoin.
    if (contact) {
      const { data: existing } = await supabase
        .from("customers")
        .select("*")
        .ilike("contact", contact.trim())
        .limit(1)
        .maybeSingle();
      if (existing) {
        localStorage.setItem(STORAGE_KEY, existing.code);
        setCustomer(existing);
        return true;
      }
    }
    const code = makeCode();
    const { data, error } = await supabase.from("customers").insert({ name, contact, code, stamps: 0 }).select().single();
    if (error) return false;
    localStorage.setItem(STORAGE_KEY, code);
    setCustomer(data);
    return true;
  };

  const handleSaveAccount = async (name, contact) => {
    const { data, error } = await supabase.from("customers").update({ name, contact }).eq("code", customer.code).select().single();
    if (error) return false;
    setCustomer(data);
    return true;
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCustomer(null);
    setScreen("home");
  };

  const handleDeleteAccount = async () => {
    const { error, count } = await supabase.from("customers").delete({ count: "exact" }).eq("code", customer.code);
    if (error || !count) {
      return false;
    }
    localStorage.removeItem(STORAGE_KEY);
    setCustomer(null);
    setScreen("home");
    return true;
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!customer) {
    return <JoinScreen onJoin={handleJoin} />;
  }

  const subScreen = screen === "cards" || screen === "gifts" || screen === "account";
  const handleBack = () => {
    if (screen === "cards" || screen === "gifts") setScreen("rewards");
    else setScreen("home");
  };

  return (
    <div style={{ background: "#F6EEDF", minHeight: "100vh", maxWidth: 420, margin: "0 auto", fontFamily: "Inter, sans-serif", position: "relative" }}>
      <TopBar onBack={subScreen ? handleBack : null} onMenu={() => setDrawerOpen(true)} onSecretTap={handleSecretTap} onAccount={() => setScreen("account")} />
      {screen === "home" && <HomeScreen customer={customer} goToRewards={() => setScreen("rewards")} />}
      {screen === "rewards" && <RewardsHome goToCards={() => setScreen("cards")} goToGifts={() => setScreen("gifts")} />}
      {screen === "cards" && <LoyaltyCardDetail customer={customer} />}
      {screen === "gifts" && <GiftsView />}
      {screen === "scan" && <ScanCodeScreen customer={customer} />}
      {screen === "menu" && <MenuScreen />}
      {screen === "visit" && <VisitScreen />}
      {screen === "account" && <AccountScreen customer={customer} onSave={handleSaveAccount} onLogout={handleLogout} onDelete={handleDeleteAccount} />}
      <BottomNav screen={screen} navigate={setScreen} />
      <DrawerMenu open={drawerOpen} onClose={() => setDrawerOpen(false)} navigate={setScreen} />
      {showPinPrompt && (
        <PinPrompt
          onSubmit={() => { setShowPinPrompt(false); onStaffAccess(); }}
          onCancel={() => setShowPinPrompt(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  const queryOwner = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("owner");
  const [ownerMode, setOwnerMode] = useState(queryOwner);
  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&family=Inter:wght@400;500;600;700&display=swap');`}</style>
      {ownerMode ? (
        <OwnerApp onExit={() => setOwnerMode(false)} />
      ) : (
        <CustomerApp onStaffAccess={() => setOwnerMode(true)} />
      )}
    </>
  );
}
