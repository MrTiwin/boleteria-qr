import QRCode from "qrcode";

export async function generateQrPng(token: string): Promise<Buffer> {
  return QRCode.toBuffer(token, { type: "png", width: 480, margin: 2 });
}

export async function generateQrDataUrl(token: string): Promise<string> {
  return QRCode.toDataURL(token, { width: 480, margin: 2 });
}
