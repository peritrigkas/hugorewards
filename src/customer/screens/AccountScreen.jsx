import { useState } from "react";

export function AccountScreen({ customer, onSave, onLogout, onDelete }) {
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
