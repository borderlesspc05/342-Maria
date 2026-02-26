import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
initializeApp();
const BACKUP_COLLECTIONS = [
    "premiosProdutividade",
    "boletinsMedicao",
    "lancamentosDiarios",
    "documentacoes",
    "treinamentos",
    "colaboradores",
];
const CONFIG_BACKUP = "config";
const CONFIG_BACKUP_DOC = "backup";
const BACKUPS_COLLECTION = "backups";
/** Tamanho máximo por documento Firestore ~1 MiB; usamos 900 KB por chunk para margem. */
const CHUNK_SIZE = 900_000;
function serializeDoc(data) {
    const out = {};
    for (const [k, v] of Object.entries(data)) {
        if (v && typeof v === "object" && "toDate" in v && typeof v.toDate === "function") {
            out[k] = v.toDate().toISOString();
        }
        else if (v && typeof v === "object" && !Array.isArray(v)) {
            out[k] = serializeDoc(v);
        }
        else {
            out[k] = v;
        }
    }
    return out;
}
async function runBackup() {
    const db = getFirestore();
    const timestamp = new Date();
    const timestampStr = timestamp.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const backupId = `backup-${timestampStr}`;
    const filename = `${backupId}.json`;
    const payload = {
        _exportedAt: [timestamp.toISOString()],
    };
    for (const collName of BACKUP_COLLECTIONS) {
        const snapshot = await db.collection(collName).get();
        const docs = snapshot.docs.map((d) => ({
            id: d.id,
            ...serializeDoc(d.data()),
        }));
        payload[collName] = docs;
    }
    const json = JSON.stringify(payload, null, 0);
    const dataSize = json.length;
    const chunks = [];
    for (let i = 0; i < json.length; i += CHUNK_SIZE) {
        chunks.push(json.slice(i, i + CHUNK_SIZE));
    }
    const chunkCount = chunks.length;
    const backupRef = db.collection(BACKUPS_COLLECTION).doc(backupId);
    await db.runTransaction(async (tx) => {
        tx.set(backupRef, {
            filename,
            createdAt: FieldValue.serverTimestamp(),
            dataSize,
            chunkCount,
        });
        for (let i = 0; i < chunks.length; i++) {
            tx.set(backupRef.collection("chunks").doc(String(i)), { content: chunks[i] });
        }
    });
    await db.collection(CONFIG_BACKUP).doc(CONFIG_BACKUP_DOC).set({
        lastRunAt: FieldValue.serverTimestamp(),
        lastBackupId: backupId,
        lastBackupFilename: filename,
    }, { merge: true });
    return { backupId, filename, timestamp: timestamp.toISOString() };
}
/**
 * Agendado: executa todo dia às 03:00 (America/Sao_Paulo).
 * Se config/backup tiver periodicity === "weekly", só roda aos domingos.
 */
export const scheduledBackup = onSchedule({ schedule: "0 3 * * *", timeZone: "America/Sao_Paulo" }, async () => {
    const db = getFirestore();
    const configSnap = await db.collection(CONFIG_BACKUP).doc(CONFIG_BACKUP_DOC).get();
    const periodicity = configSnap.data()?.periodicity ?? "daily";
    if (periodicity === "weekly") {
        const now = new Date();
        if (now.getDay() !== 0)
            return;
    }
    await runBackup();
});
/**
 * Acionável pelo app: "Fazer backup agora". Exige autenticação.
 */
export const runBackupNow = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "É necessário estar logado para executar o backup.");
    }
    return await runBackup();
});
