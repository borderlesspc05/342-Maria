import { useEffect, useState } from "react";
import Layout from "../../components/Layout/Layout";
import { backupService } from "../../services/backupService";
import type { BackupConfig, BackupPeriodicity, BackupListItem } from "../../types/backup";
import {
  HiCloudUpload,
  HiRefresh,
  HiCalendar,
  HiDownload,
  HiExclamation,
  HiCheckCircle,
} from "react-icons/hi";
import "./Backup.css";

const PERIODICITY_LABELS: Record<BackupPeriodicity, string> = {
  daily: "Diário (todo dia às 03:00)",
  weekly: "Semanal (domingos às 03:00)",
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function Backup() {
  const [config, setConfig] = useState<BackupConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [list, setList] = useState<BackupListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [runStatus, setRunStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [runError, setRunError] = useState<string | null>(null);
  const [periodicityChanging, setPeriodicityChanging] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loadConfig = async () => {
    setConfigLoading(true);
    try {
      const data = await backupService.getBackupConfig();
      setConfig(data);
    } catch (e) {
      setConfig({ periodicity: "daily" });
    } finally {
      setConfigLoading(false);
    }
  };

  const loadList = async () => {
    setListLoading(true);
    try {
      const items = await backupService.listBackups();
      setList(items);
    } catch {
      setList([]);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
    loadList();
  }, []);

  const handlePeriodicityChange = async (value: BackupPeriodicity) => {
    if (!config || value === config.periodicity) return;
    setPeriodicityChanging(true);
    setRunError(null);
    try {
      await backupService.setBackupPeriodicity(value);
      setConfig((c) => (c ? { ...c, periodicity: value } : c));
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Erro ao salvar periodicidade.");
    } finally {
      setPeriodicityChanging(false);
    }
  };

  const handleRunNow = async () => {
    setRunStatus("loading");
    setRunError(null);
    try {
      await backupService.runBackupNow();
      setRunStatus("success");
      await loadConfig();
      await loadList();
      setTimeout(() => setRunStatus("idle"), 3000);
    } catch (e) {
      setRunStatus("error");
      setRunError(e instanceof Error ? e.message : "Erro ao executar backup.");
    }
  };

  const handleDownload = async (item: BackupListItem) => {
    setDownloadingId(item.id);
    try {
      await backupService.downloadBackup(item.id, item.name);
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Erro ao baixar backup.");
    } finally {
      setDownloadingId(null);
    }
  };

  function formatBytes(bytes: number | undefined): string {
    if (bytes == null) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <Layout>
      <div className="backup-container">
        <h2 className="backup-title">
          <HiCloudUpload aria-hidden /> Backup em nuvem
        </h2>
        <p className="backup-description">
          Dados incluídos: prêmios de produtividade, boletins de medição, lançamentos diários,
          documentações, treinamentos e colaboradores. Backup executado no navegador e salvo no Firestore (sem Cloud Functions).
        </p>

        {/* Configuração e última execução */}
        <section className="backup-card" aria-labelledby="backup-config-heading">
          <h3 id="backup-config-heading" className="backup-card-title">
            <HiCalendar aria-hidden /> Configuração
          </h3>

          {configLoading ? (
            <div className="backup-loading" role="status" aria-live="polite">
              Carregando…
            </div>
          ) : (
            <>
              <div className="backup-field">
                <label htmlFor="backup-periodicity" className="backup-label">
                  Periodicidade
                </label>
                <select
                  id="backup-periodicity"
                  className="backup-select"
                  value={config?.periodicity ?? "daily"}
                  onChange={(e) => handlePeriodicityChange(e.target.value as BackupPeriodicity)}
                  disabled={periodicityChanging}
                  aria-describedby="backup-periodicity-desc"
                >
                  <option value="daily">{PERIODICITY_LABELS.daily}</option>
                  <option value="weekly">{PERIODICITY_LABELS.weekly}</option>
                </select>
                <span id="backup-periodicity-desc" className="backup-hint">
                  A periodicidade é salva aqui; o backup agendado automático requer plano Blaze. Use &quot;Fazer backup agora&quot; para gerar e baixar.
                </span>
              </div>

              <div className="backup-field">
                <span className="backup-label">Última execução</span>
                <span className="backup-value" aria-live="polite">
                  {formatDate(config?.lastRunAt ?? null)}
                </span>
              </div>

              <div className="backup-actions">
                <button
                  type="button"
                  className="backup-button primary"
                  onClick={handleRunNow}
                  disabled={runStatus === "loading"}
                  aria-busy={runStatus === "loading"}
                  aria-live="polite"
                >
                  {runStatus === "loading" ? (
                    <>
                      <span className="backup-spinner" aria-hidden /> Executando…
                    </>
                  ) : (
                    <>
                      <HiRefresh aria-hidden /> Fazer backup agora
                    </>
                  )}
                </button>
              </div>

              {runStatus === "success" && (
                <p className="backup-message success" role="status">
                  <HiCheckCircle aria-hidden /> Backup concluído com sucesso.
                </p>
              )}
              {runStatus === "error" && runError && (
                <p className="backup-message error" role="alert">
                  <HiExclamation aria-hidden /> {runError}
                </p>
              )}
            </>
          )}
        </section>

        {/* Lista de backups recentes */}
        <section className="backup-card" aria-labelledby="backup-list-heading">
          <h3 id="backup-list-heading" className="backup-card-title">
            <HiDownload aria-hidden /> Backups recentes
          </h3>
          {listLoading ? (
            <div className="backup-loading" role="status" aria-live="polite">
              Carregando…
            </div>
          ) : list.length === 0 ? (
            <p className="backup-empty">Nenhum backup encontrado.</p>
          ) : (
            <ul className="backup-list" role="list">
              {list.map((item) => (
                <li key={item.id} className="backup-list-item">
                  <span className="backup-list-name">{item.name}</span>
                  <span className="backup-list-date">
                    {new Date(item.createdAt).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                  {item.dataSize != null && (
                    <span className="backup-list-size">{formatBytes(item.dataSize)}</span>
                  )}
                  <button
                    type="button"
                    className="backup-list-download"
                    onClick={() => handleDownload(item)}
                    disabled={downloadingId === item.id}
                    aria-busy={downloadingId === item.id}
                  >
                    {downloadingId === item.id ? "Baixando…" : "Baixar"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Layout>
  );
}
