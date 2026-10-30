// Bot check (Cloudflare Turnstile). When CAPTCHA is on in the Supabase project,
// creating a customer's phone account and staff sign-in each need a fresh token.
// Off when VITE_TURNSTILE_SITE_KEY isn't set.
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let turnstileLoading = null;

function loadTurnstile() {
  turnstileLoading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = () => {
      turnstileLoading = null; // try again next time
      reject(new Error("Couldn't load the bot check"));
    };
    document.head.appendChild(script);
  });
  return turnstileLoading;
}

// A one-use token, or undefined when CAPTCHA is off. Throws if the check fails
// or can't load. Usually invisible; Turnstile shows a box only when it needs
// the person to tick it.
export async function getCaptchaToken() {
  if (!SITE_KEY) return undefined;
  const turnstile = await loadTurnstile();
  const box = document.createElement("div");
  box.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:1000;";
  document.body.appendChild(box);
  let widgetId;
  try {
    return await new Promise((resolve, reject) => {
      const fail = () => reject(new Error("Bot check failed"));
      widgetId = turnstile.render(box, {
        sitekey: SITE_KEY,
        appearance: "interaction-only",
        callback: resolve,
        "error-callback": fail,
        "timeout-callback": fail,
      });
    });
  } finally {
    if (widgetId !== undefined) turnstile.remove(widgetId);
    box.remove();
  }
}
