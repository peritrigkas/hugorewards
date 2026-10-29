import { useEffect, useRef } from "react";
import qrcode from "qrcode-generator";
import { clientConfig } from "../client.config";

export function QrCanvas({ value, size = 200 }) {
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
    ctx.fillStyle = clientConfig.colors.dark;
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (qr.isDark(row, col)) ctx.fillRect(col * cellSize, row * cellSize, cellSize + 0.5, cellSize + 0.5);
      }
    }
  }, [value, size]);
  return <canvas ref={canvasRef} style={{ borderRadius: 12, display: "block" }} />;
}
