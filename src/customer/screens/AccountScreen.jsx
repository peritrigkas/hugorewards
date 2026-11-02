import { useState } from "react";
import { clientConfig } from "../../client.config";
import { daysInMonth, formatBirthday, hasBirthday, isBirthdayLocked, MAX_BIRTHDAY_SAVES, MONTHS } from "../../lib/birthday";

const label = { fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: "var(--c-faint)", display: "block", marginBottom: 6 };
const note = { fontFamily: "Inter, sans-serif", fontSize: 12, color: "var(--c-muted)", lineHeight: 1.5, marginBottom: 14 };
const selectStyle = { flex: 1, padding: "12px 10px", borderRadius: 12, border: "1px solid var(--c-lilac)", fontFamily: "Inter, sans-serif", fontSize: 15, background: "#fff", color: "var(--c-dark)" };

// Day and month, for the shop's birthday treat. A customer can save it
// twice: the second save locks it, and only staff can change it after that.
// Removing it doesn't count as a save.
function BirthdayCard({ customer, onSave }) {
  const [month, setMonth] = useState(customer.birthday_month ?? "");
  const [day, setDay] = useState(customer.birthday_day ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const locked = isBirthdayLocked(customer);
  const savesLeft = MAX_BIRTHDAY_SAVES - customer.birthday_saves;
  const changed = Number(month) !== (customer.birthday_month ?? 0) || Number(day) !== (customer.birthday_day ?? 0);
  const canSave = month && day && changed && !busy;

  const save = async (m, d) => {
    setBusy(true);
    setMessage("");
    const error = await onSave(m, d);
    setBusy(false);
    if (error) setMessage(error.includes("locked") ? error : "Couldn't save. Check your connection and try again.");
    else setMessage(m ? "✓ Birthday saved" : "✓ Birthday removed");
    if (!m && !error) { setMonth(""); setDay(""); }
  };

  return (
    <div data-testid="birthday-card" style={{ background: "#fff", borderRadius: 20, padding: "24px 20px", border: "1px solid var(--c-border)", marginBottom: 20 }}>
      <label style={label}>Birthday</label>
      {locked ? (
        <>
          <div data-testid="birthday-locked" style={{ fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 600, color: "var(--c-dark)", marginBottom: 6 }}>🔒 {formatBirthday(customer)}</div>
          <div style={{ ...note, marginBottom: 0 }}>Your birthday is locked. If it's wrong, ask staff to correct it.</div>
        </>
      ) : (
        <>
          <div style={note}>
            Add your birthday to get your {clientConfig.gift.title}.{" "}
            {savesLeft === 1
              ? <b>You can change it one more time: after that it's locked.</b>
              : "You can change it once after saving it."}
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <select aria-label="Birthday day" value={day} onChange={(e) => setDay(e.target.value)} style={selectStyle}>
              <option value="">Day</option>
              {Array.from({ length: month ? daysInMonth(Number(month)) : 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select aria-label="Birthday month" value={month} onChange={(e) => { setMonth(e.target.value); if (Number(day) > daysInMonth(Number(e.target.value))) setDay(""); }} style={{ ...selectStyle, flex: 2 }}>
              <option value="">Month</option>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <button
            disabled={!canSave}
            onClick={() => save(Number(month), Number(day))}
            style={{ width: "100%", background: canSave ? "var(--c-dark)" : "var(--c-lilac)", color: "var(--c-cream)", border: "none", padding: "13px", borderRadius: 999, fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14, cursor: canSave ? "pointer" : "not-allowed" }}
          >
            {busy ? "Saving…" : savesLeft === 1 ? "Save and lock birthday" : "Save birthday"}
          </button>
          {hasBirthday(customer) && (
            <button disabled={busy} onClick={() => save(null, null)} style={{ width: "100%", background: "transparent", color: "var(--c-muted)", border: "none", padding: "10px 0 0", fontFamily: "Inter, sans-serif", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>
              Remove birthday
            </button>
          )}
        </>
      )}
      {message && <p data-testid="birthday-message" style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: message.startsWith("✓") ? "var(--c-dark)" : "var(--c-error)", margin: "12px 0 0" }}>{message}</p>}
    </div>
  );
}

export function AccountScreen({ customer, onSave, onSaveBirthday, onLogout, onDelete }) {
  const [name, setName] = useState(customer.name);
  const [contact, setContact] = useState(customer.contact || "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const inputStyle = { width: "100%", padding: "13px 14px", borderRadius: 12, border: "1px solid var(--c-lilac)", fontFamily: "Inter, sans-serif", fontSize: 15, marginBottom: 14, boxSizing: "border-box" };

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
          background: "radial-gradient(circle at 20% 30%, var(--c-gold) 0%, transparent 45%), radial-gradient(circle at 80% 70%, var(--c-purple) 0%, transparent 50%), linear-gradient(160deg, var(--c-dark) 0%, var(--c-darkAlt) 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <div style={{ fontFamily: "Baloo 2, sans-serif", fontWeight: 800, fontSize: 28, color: "var(--c-cream)" }}>My Account</div>
      </div>

      <div style={{ padding: "28px 20px" }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: "24px 20px", border: "1px solid var(--c-border)", marginBottom: 20 }}>
          <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: "var(--c-faint)", display: "block", marginBottom: 6 }}>Name</label>
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
          <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: "var(--c-faint)", display: "block", marginBottom: 6 }}>Phone or email</label>
          <input style={{ ...inputStyle, marginBottom: 4 }} value={contact} onChange={(e) => setContact(e.target.value)} />
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "var(--c-faint)", marginBottom: 18 }}>Your loyalty code: {customer.code}</div>
          {error && <p style={{ fontFamily: "Inter, sans-serif", color: "var(--c-error)", fontSize: 13, marginBottom: 12 }}>{error}</p>}
          {saved && <p style={{ fontFamily: "Inter, sans-serif", color: "var(--c-dark)", fontSize: 13, marginBottom: 12, fontWeight: 600 }}>✓ Saved</p>}
          <button
            disabled={!name || busy}
            onClick={save}
            style={{ width: "100%", background: name && !busy ? "var(--c-dark)" : "var(--c-lilac)", color: "var(--c-cream)", border: "none", padding: "13px", borderRadius: 999, fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14, cursor: name && !busy ? "pointer" : "not-allowed" }}
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>

        <BirthdayCard customer={customer} onSave={onSaveBirthday} />

        {!confirmingLogout ? (
          <button
            onClick={() => setConfirmingLogout(true)}
            style={{ width: "100%", background: "transparent", color: "var(--c-error)", border: "1px solid var(--c-errorBorder)", padding: "13px", borderRadius: 999, fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer", marginBottom: 14 }}
          >
            Log out
          </button>
        ) : (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--c-errorBorder)", padding: 16, textAlign: "center", marginBottom: 14 }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--c-dark)", marginBottom: 12 }}>
              Log out on this phone? Your card and stamps stay saved here — tap “Log back in” to open them again.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmingLogout(false)} style={{ flex: 1, background: "var(--c-border)", color: "var(--c-dark)", border: "none", padding: "11px", borderRadius: 999, fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={onLogout} style={{ flex: 1, background: "var(--c-error)", color: "#fff", border: "none", padding: "11px", borderRadius: 999, fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Log out</button>
            </div>
          </div>
        )}

        {!confirmingDelete ? (
          <button
            onClick={() => setConfirmingDelete(true)}
            style={{ width: "100%", background: "transparent", color: "var(--c-error)", border: "none", padding: "10px", fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}
          >
            Delete my account and data
          </button>
        ) : (
          <div style={{ background: "var(--c-errorBg)", borderRadius: 16, border: "1px solid var(--c-errorBorder)", padding: 16, textAlign: "center" }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--c-dark)", marginBottom: 4, fontWeight: 700 }}>
              This can't be undone
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--c-dark)", marginBottom: 12 }}>
              Your name, contact info, and stamp history will be permanently deleted.
            </div>
            {deleteError && (
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--c-error)", fontWeight: 600, marginBottom: 12 }}>
                {deleteError}
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmingDelete(false)} disabled={deleting} style={{ flex: 1, background: "var(--c-border)", color: "var(--c-dark)", border: "none", padding: "11px", borderRadius: 999, fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={confirmDelete} disabled={deleting} style={{ flex: 1, background: "var(--c-error)", color: "#fff", border: "none", padding: "11px", borderRadius: 999, fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                {deleting ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
