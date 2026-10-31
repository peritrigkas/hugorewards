import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { STAMP_ICONS } from "../components/StampCard";
import { addDays, endNowDates, formatDay, groupPromos, MAX_PROMO_STAMPS, promoFormError, promoPhase } from "../lib/promos";

const pill = { border: "none", borderRadius: 999, padding: "8px 14px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" };
const box = { background: "#fff", border: "1px solid var(--c-border)", borderRadius: 14, padding: "12px 16px", marginBottom: 10 };
const field = { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--c-lilac)", fontFamily: "Inter, sans-serif", fontSize: 14 };
const label = { display: "block", fontSize: 12, fontWeight: 600, color: "var(--c-muted)", margin: "12px 0 4px" };
const heading = { fontFamily: "Baloo 2, sans-serif", fontSize: 18, color: "var(--c-dark)", margin: "18px 0 8px" };

const DEFAULT_PROMO_DAYS = 28;

// A new promo starts today, or the day after the last one ends, as promos
// can't overlap.
function newPromo(promos, today) {
  const lastEnd = promos.reduce((latest, p) => (p.ends_on > latest ? p.ends_on : latest), "");
  const start = lastEnd >= today ? addDays(lastEnd, 1) : today;
  return { name: "", icon: "cookie", stamps_for_reward: 5, starts_on: start, ends_on: addDays(start, DEFAULT_PROMO_DAYS - 1) };
}

// Create or edit one promo. A running promo keeps its start date; once anyone
// has a stamp, stamps needed is locked and it can't be deleted.
function PromoForm({ promo, today, inUse, onSave, onDelete, onCancel }) {
  const [form, setForm] = useState(promo);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const phase = promo.id ? promoPhase(promo, today) : "scheduled";
  const set = (key) => (e) => setForm({ ...form, [key]: key === "stamps_for_reward" ? Number(e.target.value) : e.target.value });

  const run = async (action) => {
    setBusy(true);
    const error = await action();
    setBusy(false);
    if (error) setMessage(error);
    else onCancel();
  };

  const save = () => {
    const error = promoFormError(form);
    if (error) return setMessage(error);
    const { id, name, icon, stamps_for_reward, starts_on, ends_on } = form;
    run(() => onSave({ id, name: name.trim(), icon, stamps_for_reward, starts_on, ends_on }));
  };

  return (
    <div data-testid="promo-form" style={box}>
      <div style={{ ...heading, marginTop: 0 }}>{promo.id ? "Edit promo" : "New promo"}</div>
      <label style={label}>Product name
        <input value={form.name} onChange={set("name")} placeholder="e.g. Waffle month" style={field} />
      </label>
      <div style={label}>Icon</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {Object.entries(STAMP_ICONS).map(([key, Icon]) => (
          <button key={key} aria-label={key} aria-pressed={form.icon === key} onClick={() => setForm({ ...form, icon: key })} style={{ width: 40, height: 40, borderRadius: 10, border: form.icon === key ? "2px solid var(--c-dark)" : "1px solid var(--c-border)", background: form.icon === key ? "var(--c-lilac)" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Icon size={20} color="var(--c-dark)" />
          </button>
        ))}
      </div>
      <label style={label}>Stamps needed (1–{MAX_PROMO_STAMPS}){inUse && " · locked, customers have stamps"}
        <input type="number" min={1} max={MAX_PROMO_STAMPS} value={form.stamps_for_reward} disabled={inUse} onChange={set("stamps_for_reward")} style={field} />
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <label style={{ ...label, flex: 1 }}>Starts
          <input type="date" value={form.starts_on} disabled={phase !== "scheduled"} onChange={set("starts_on")} style={field} />
        </label>
        <label style={{ ...label, flex: 1 }}>Ends
          <input type="date" value={form.ends_on} onChange={set("ends_on")} style={field} />
        </label>
      </div>
      {message && <div style={{ marginTop: 10, fontSize: 13, fontWeight: 600, color: "var(--c-error)" }}>{message}</div>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
        <button disabled={busy} onClick={save} style={{ ...pill, background: "var(--c-dark)", color: "#fff" }}>Save</button>
        <button disabled={busy} onClick={onCancel} style={{ ...pill, background: "var(--c-border)", color: "var(--c-dark)" }}>Cancel</button>
        {phase === "running" && (confirmEnd ? (
          <button disabled={busy} onClick={() => run(() => onSave({ id: promo.id, ...endNowDates(promo, today) }))} style={{ ...pill, background: "var(--c-error)", color: "#fff" }}>
            Yes, end it today
          </button>
        ) : (
          <button onClick={() => setConfirmEnd(true)} style={{ ...pill, background: "var(--c-gold)", color: "var(--c-dark)" }}>End now</button>
        ))}
        {promo.id && !inUse && (
          <button disabled={busy} onClick={() => run(() => onDelete(promo.id))} style={{ ...pill, background: "transparent", color: "var(--c-error)", border: "1px solid var(--c-error)" }}>Delete</button>
        )}
      </div>
    </div>
  );
}

function PromoLine({ promo, today, redeemedCount, onEdit }) {
  const Icon = STAMP_ICONS[promo.icon];
  const phase = promoPhase(promo, today);
  const past = phase === "claim" || phase === "finished";
  return (
    <div data-testid="promo-line" style={{ ...box, display: "flex", alignItems: "center", gap: 12 }}>
      {Icon && <Icon size={22} color="var(--c-dark)" />}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 15, color: "var(--c-dark)" }}>{promo.name}</div>
        <div style={{ fontSize: 12, color: "var(--c-faint)" }}>
          {formatDay(promo.starts_on)} – {formatDay(promo.ends_on)} · {promo.stamps_for_reward} stamps
          {past && ` · ${redeemedCount} redeemed`}
        </div>
      </div>
      {!past && <button onClick={onEdit} style={{ ...pill, background: "var(--c-border)", color: "var(--c-dark)" }}>Edit</button>}
    </div>
  );
}

// Staff menu → Promos: the running promo, upcoming ones and past ones (with
// how many rewards were redeemed), and the form to add or edit one.
export function PromoPage({ promos, promoStamps, history, today, onSave, onDelete, onBack }) {
  const [editing, setEditing] = useState(null);
  const { running, upcoming, past } = groupPromos(promos, today);
  const inUse = (id) => promoStamps.some((s) => s.promo_id === id) || history.some((h) => h.promo_id === id);
  const redeemedCount = (id) => history.filter((h) => h.promo_id === id).length;

  const section = (title, list) => list.length > 0 && (
    <>
      <div style={heading}>{title}</div>
      {list.map((p) => (
        editing?.id === p.id
          ? <PromoForm key={p.id} promo={p} today={today} inUse={inUse(p.id)} onSave={onSave} onDelete={onDelete} onCancel={() => setEditing(null)} />
          : <PromoLine key={p.id} promo={p} today={today} redeemedCount={redeemedCount(p.id)} onEdit={() => setEditing(p)} />
      ))}
    </>
  );

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button aria-label="Back" onClick={onBack} style={{ background: "none", border: "none", padding: 4, cursor: "pointer", display: "flex" }}>
          <ChevronLeft size={24} color="var(--c-dark)" />
        </button>
        <div style={{ flex: 1, fontFamily: "Baloo 2, sans-serif", fontWeight: 700, fontSize: 22, color: "var(--c-dark)" }}>Promos</div>
        {!editing && <button onClick={() => setEditing(newPromo(promos, today))} style={{ ...pill, background: "var(--c-dark)", color: "#fff" }}>New promo</button>}
      </div>
      <div style={{ fontSize: 13, color: "var(--c-muted)", margin: "8px 0 0" }}>
        A promo is a second card for one product, with an end date. One runs at a time; full cards can be claimed for 14 days after it ends.
      </div>
      {editing && !editing.id && <div style={{ marginTop: 16 }}><PromoForm promo={editing} today={today} inUse={false} onSave={onSave} onDelete={onDelete} onCancel={() => setEditing(null)} /></div>}
      {section("Running now", running)}
      {section("Coming up", upcoming)}
      {section("Past", past)}
      {promos.length === 0 && !editing && <div style={{ marginTop: 24, textAlign: "center", fontSize: 13, color: "var(--c-faint)" }}>No promos yet.</div>}
    </div>
  );
}
