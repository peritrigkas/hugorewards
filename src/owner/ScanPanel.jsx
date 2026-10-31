import { useState, useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { BarcodeScanner } from "@capacitor-mlkit/barcode-scanning";
import { clientConfig } from "../client.config";
import { customerCodePattern } from "../lib/loyalty";

const CUSTOMER_CODE_RE = customerCodePattern(clientConfig.loyalty.codePrefix);

// Hands-free hardware scanners can re-fire the same read (a shaky hand holding
// the trigger, or a scanner without a configured reread delay) — ignore a repeat
// of the same code within this window instead of double-stamping.
const RESCAN_COOLDOWN_MS = 4000;

// onFoundCode resolves to { message }: shown briefly, or nothing when the
// code opened the customer view instead.
export function ScanPanel({ onFoundCode }) {
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
  const hardwareInputRef = useRef(null);
  const lastScanRef = useRef({ code: "", at: 0 });

  const handleCode = async (raw) => {
    const { message: result } = await onFoundCode(raw.trim());
    if (!result) return;
    setMessage(result);
    setTimeout(() => setMessage(""), 2500);
  };

  // A wired (USB) or wireless (Bluetooth) hardware barcode/QR scanner acts as a
  // keyboard: it types the code into whatever's focused, then sends Enter. Keeping
  // this field focused and submitting on Enter is all either kind needs to work,
  // hands-free, alongside typing a code in manually.
  const submitManualCode = () => {
    const code = manualCode.trim().toUpperCase();
    setManualCode("");
    hardwareInputRef.current?.focus();
    if (!code) return;
    if (!CUSTOMER_CODE_RE.test(code)) {
      setMessage(`That doesn't look like a ${clientConfig.brandName} code — try scanning again.`);
      setTimeout(() => setMessage(""), 2500);
      return;
    }
    const now = Date.now();
    if (code === lastScanRef.current.code && now - lastScanRef.current.at < RESCAN_COOLDOWN_MS) {
      return;
    }
    lastScanRef.current = { code, at: now };
    handleCode(code);
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

  // Keep the hardware-scanner field focused whenever the camera isn't the active
  // input, so a wired/wireless scanner can be used without tapping the screen first.
  useEffect(() => {
    if (isNative || !scanning) hardwareInputRef.current?.focus();
  }, [isNative, scanning]);

  if (isNative) {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto 28px", background: "#fff", border: "1px solid var(--c-border)", borderRadius: 18, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontFamily: "Baloo 2, sans-serif", fontSize: 18, color: "var(--c-dark)", margin: 0 }}>Scan a customer's code</h3>
          <button onClick={startNativeScan} style={{ background: "var(--c-dark)", color: "#fff", border: "none", borderRadius: 999, padding: "8px 16px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Start scan</button>
        </div>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--c-muted)", marginBottom: 12 }}>
          Opens your phone's camera to scan a customer's QR code directly.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            ref={hardwareInputRef}
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitManualCode(); }}
            placeholder="Type a code, or scan with a wired/wireless scanner"
            style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--c-lilac)", fontFamily: "Inter, sans-serif", fontSize: 13 }}
          />
          <button onClick={submitManualCode} style={{ background: "var(--c-gold)", color: "var(--c-dark)", border: "none", borderRadius: 10, padding: "10px 16px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Add</button>
        </div>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "var(--c-faint)", marginTop: 8 }}>
          A USB or Bluetooth barcode scanner also works here, hands-free — keep this field focused and scan. Only {clientConfig.brandName} codes are accepted, and re-scanning the same code within a few seconds is ignored so a lingering trigger doesn't double-stamp.
        </p>
        {message && <div style={{ marginTop: 10, fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--c-dark)", fontWeight: 600 }}>{message}</div>}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto 28px", background: "#fff", border: "1px solid var(--c-border)", borderRadius: 18, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ fontFamily: "Baloo 2, sans-serif", fontSize: 18, color: "var(--c-dark)", margin: 0 }}>Scan a customer's code</h3>
        {!scanning ? (
          <button onClick={startBrowserScan} style={{ background: "var(--c-dark)", color: "#fff", border: "none", borderRadius: 999, padding: "8px 16px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Start scan</button>
        ) : (
          <button onClick={stopBrowserScan} style={{ background: "var(--c-border)", color: "var(--c-dark)", border: "none", borderRadius: 999, padding: "8px 16px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Stop</button>
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
      {!supported && <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--c-error)", marginBottom: 12 }}>Camera QR scanning needs Chrome or Edge. Enter the customer's code below as a fallback.</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          ref={hardwareInputRef}
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submitManualCode(); }}
          placeholder="Type a code, or scan with a wired/wireless scanner"
          style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--c-lilac)", fontFamily: "Inter, sans-serif", fontSize: 13 }}
        />
        <button onClick={submitManualCode} style={{ background: "var(--c-gold)", color: "var(--c-dark)", border: "none", borderRadius: 10, padding: "10px 16px", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Add</button>
      </div>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "var(--c-faint)", marginTop: 8 }}>
        A USB or Bluetooth barcode scanner also works here, hands-free — keep this field focused and scan. Only {clientConfig.brandName} codes are accepted, and re-scanning the same code within a few seconds is ignored so a lingering trigger doesn't double-stamp.
      </p>
      {message && <div style={{ marginTop: 10, fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--c-dark)", fontWeight: 600 }}>{message}</div>}
    </div>
  );
}
