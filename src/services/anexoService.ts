/**
 * Serviço de anexos: upload/remoção/download.
 * Usa Firebase Storage quando disponível; fallback em base64 para ambiente local/offline.
 */

import { storageService } from "./storageService";
import type { Anexo } from "../types/boletimMedicao";

const BASE_PATH_BOLETINS = "boletins_medicao";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Faz upload de anexos: Firebase Storage se configurado, senão base64 (fallback local).
 * @param basePath Pasta no Storage (default: boletins_medicao). Ignorado no fallback base64.
 */
export async function uploadAnexos(
  files: File[],
  basePath: string = BASE_PATH_BOLETINS
): Promise<Anexo[]> {
  if (storageService.isStorageAvailable() && files.length > 0) {
    const results = await storageService.uploadFiles(files, basePath);
    return results.map((r) => ({
      id: r.id,
      nome: r.nome,
      tipo: r.tipo,
      url: r.url,
      tamanho: r.tamanho,
      dataUpload: r.dataUpload,
      storagePath: r.storagePath,
    }));
  }

  const anexos: Anexo[] = [];
  for (const file of files) {
    const base64 = await fileToBase64(file);
    anexos.push({
      id: `anexo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      nome: file.name,
      tipo: file.type,
      url: base64,
      tamanho: file.size,
      dataUpload: new Date(),
    });
  }
  return anexos;
}

/**
 * Remove um anexo: se tiver storagePath, deleta do Firebase Storage.
 */
export async function removeAnexo(anexo: {
  id: string;
  storagePath?: string;
}): Promise<void> {
  if (anexo.storagePath && storageService.isStorageAvailable()) {
    await storageService.deleteFile(anexo.storagePath);
  }
}

/**
 * Baixa um anexo (abre ou baixa conforme o navegador; URL já é de download quando vem do Storage).
 */
export function downloadAnexo(anexo: Anexo): void {
  const link = document.createElement("a");
  link.href = anexo.url;
  link.download = anexo.nome;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

export function validateFileSize(file: File, maxSizeMB: number = 5): boolean {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxBytes;
}

export function validateFileType(
  file: File,
  allowedTypes: string[] = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/jpg",
  ]
): boolean {
  return allowedTypes.includes(file.type);
}
