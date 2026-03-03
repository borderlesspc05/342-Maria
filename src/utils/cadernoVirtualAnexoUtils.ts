/**
 * Utilitários para anexos do Caderno Virtual: download robusto (data URL e HTTPS),
 * abertura em nova aba e verificação de disponibilidade.
 */

import type { AnexoLancamento } from "../types/cadernoVirtual";

/**
 * Verifica se o anexo possui URL utilizável para exibição/download.
 */
export function isAnexoDisponivel(anexo: AnexoLancamento): boolean {
  const url = anexo?.url?.trim();
  return !!url && (url.startsWith("data:") || url.startsWith("http://") || url.startsWith("https://"));
}

/**
 * Força o download do anexo com nome correto.
 * Data URLs: converte para blob e baixa. HTTPS: fetch + blob para respeitar nome e evitar abrir em nova aba.
 * Em falha (CORS, rede), fallback para abrir em nova aba.
 */
export async function downloadAnexo(anexo: AnexoLancamento): Promise<void> {
  const url = anexo?.url?.trim();
  if (!url) return;

  const link = document.createElement("a");
  link.rel = "noopener noreferrer";
  link.download = anexo.nome || "anexo";

  if (url.startsWith("data:")) {
    try {
      const [header, base64] = url.split(",", 2);
      const mimeMatch = header.match(/data:([^;]+)/);
      const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      link.href = blobUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    } catch {
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    return;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      link.href = blobUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    } catch {
      link.href = url;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}

/**
 * Abre o anexo em nova aba para visualização (imagem, PDF, etc.).
 * Data URLs: converte para blob URL e abre em nova aba. HTTPS: abre a URL diretamente.
 */
export function abrirAnexoNovaAba(anexo: AnexoLancamento): void {
  const url = anexo?.url?.trim();
  if (!url) return;

  if (url.startsWith("data:")) {
    try {
      const [header, base64] = url.split(",", 2);
      const mimeMatch = header.match(/data:([^;]+)/);
      const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    return;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
