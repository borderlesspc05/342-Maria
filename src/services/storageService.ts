/**
 * Serviço centralizado para upload e exclusão de arquivos no Firebase Storage.
 * Usado por Caderno Virtual e Boletins de Medição.
 *
 * No Firebase Console (Storage > Rules), use regras que exijam autenticação, por exemplo:
 *   match /caderno_virtual/{allPaths=**} { allow read, write: if request.auth != null; }
 *   match /boletins_medicao/{allPaths=**} { allow read, write: if request.auth != null; }
 */

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

export interface StorageUploadResult {
  id: string;
  nome: string;
  tipo: string;
  url: string;
  tamanho: number;
  dataUpload: Date;
  storagePath: string;
}

function isStorageAvailable(): boolean {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  return typeof projectId === "string" && projectId.trim().length > 0;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[#\[\]?*]/g, "_").slice(0, 200);
}

/**
 * Faz upload de um ou mais arquivos para o Firebase Storage.
 * @param files Arquivos a enviar
 * @param basePath Pasta base no Storage (ex: "caderno_virtual", "boletins_medicao")
 */
export async function uploadFiles(
  files: File[],
  basePath: string
): Promise<StorageUploadResult[]> {
  if (!isStorageAvailable()) {
    throw new Error("Firebase não está configurado. Verifique as variáveis de ambiente.");
  }

  const storage = getStorage();
  const results: StorageUploadResult[] = [];

  for (const file of files) {
    const safeName = sanitizeFileName(file.name);
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const storagePath = `${basePath}/${uniqueId}_${safeName}`;
    const storageRef = ref(storage, storagePath);

    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    results.push({
      id: `anexo-${uniqueId}`,
      nome: file.name,
      tipo: file.type,
      url,
      tamanho: file.size,
      dataUpload: new Date(),
      storagePath,
    });
  }

  return results;
}

/**
 * Remove um arquivo do Firebase Storage pelo caminho salvo.
 */
export async function deleteFile(storagePath: string): Promise<void> {
  if (!isStorageAvailable()) return;

  const storage = getStorage();
  const storageRef = ref(storage, storagePath);
  await deleteObject(storageRef);
}

export const storageService = {
  uploadFiles,
  deleteFile,
  isStorageAvailable,
};
