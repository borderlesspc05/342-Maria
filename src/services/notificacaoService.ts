import { db, auth } from "../lib/firebaseconfig";
import { emailNotificationService } from "./emailNotificationService";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  onSnapshot,
  type Unsubscribe,
  writeBatch,
} from "firebase/firestore";
import type {
  Notificacao,
  NotificacaoFormData,
  NotificacaoFilters,
  NotificacaoStats,
  ConfiguracaoNotificacao,
  ConfiguracaoNotificacaoFormData,
} from "../types/notificacao";
import {
  assertAuthenticated,
  assertOwnerOrRole,
  assertRole,
} from "./securityService";

const NOTIFICACOES_COLLECTION = "notificacoes";
const CONFIGURACOES_COLLECTION = "configuracoes_notificacoes";

function isMissingIndexError(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  const msg = (e?.message || "").toLowerCase();
  return (
    e?.code === "failed-precondition" ||
    msg.includes("requires an index") ||
    msg.includes("create it here") ||
    msg.includes("index")
  );
}

// ============== THROTTLING E DEDUPLICAÇÃO ==============
// Controle de rate-limiting: armazena último timestamp de cada tipo de notificação por recurso
const notificationRateLimit = new Map<string, number>();
const THROTTLE_INTERVAL_MS = 60 * 1000; // 1 minuto

function getNotificationThrottleKey(
  userId: string,
  tipo: string,
  resourceId?: string
): string {
  return `${userId}:${tipo}:${resourceId || "global"}`;
}

function canSendNotification(
  userId: string,
  tipo: string,
  resourceId?: string
): boolean {
  const key = getNotificationThrottleKey(userId, tipo, resourceId);
  const lastTime = notificationRateLimit.get(key);
  const now = Date.now();

  if (!lastTime || now - lastTime >= THROTTLE_INTERVAL_MS) {
    notificationRateLimit.set(key, now);
    return true;
  }
  return false;
}

// Função para verificar se já existe uma notificação similar não lida
async function findExistingNotification(
  userId: string,
  tipo: string,
  resourceId?: string,
  horasAntes: number = 24
): Promise<Notificacao | null> {
  try {
    const dataLimite = new Date();
    dataLimite.setHours(dataLimite.getHours() - horasAntes);

    const q = query(
      collection(db, NOTIFICACOES_COLLECTION),
      where("userId", "==", userId),
      where("tipo", "==", tipo),
      where("lida", "==", false),
      orderBy("criadoEm", "desc"),
      limit(1)
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.docs.length === 0) return null;

    const doc = snapshot.docs[0];
    const notif = convertTimestampToDate(doc.data()) as Notificacao;
    
    // Se tem resourceId, verificar se é do mesmo recurso
    if (resourceId && notif.metadata?.resourceId) {
      if (notif.metadata.resourceId === resourceId) {
        const timeSinceCreation = Date.now() - new Date(notif.criadoEm).getTime();
        if (timeSinceCreation < horasAntes * 60 * 60 * 1000) {
          return notif;
        }
      }
    } else if (!resourceId) {
      return notif;
    }

    return null;
  } catch (error) {
    console.error("Erro ao verificar notificação existente:", error);
    return null;
  }
}

// Função para remover notificações duplicadas antigas
async function removeDuplicateNotifications(
  userId: string,
  tipo: string,
  resourceId?: string,
  keepCount: number = 1
): Promise<void> {
  try {
    const q = query(
      collection(db, NOTIFICACOES_COLLECTION),
      where("userId", "==", userId),
      where("tipo", "==", tipo),
      orderBy("criadoEm", "desc")
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.docs.length <= keepCount) return;

    const batch = writeBatch(db);
    let deletedCount = 0;

    snapshot.docs.forEach((doc, index) => {
      if (index >= keepCount) {
        const data = doc.data() as any;
        // Se tem resourceId, só deletar a mesma
        if (resourceId && data.metadata?.resourceId !== resourceId) {
          return;
        }
        batch.delete(doc.ref);
        deletedCount++;
      }
    });

    if (deletedCount > 0) {
      await batch.commit();
      console.log(`Removidas ${deletedCount} notificações duplicadas de ${userId} tipo ${tipo}`);
    }
  } catch (error) {
    console.error("Erro ao remover notificações duplicadas:", error);
  }
}

// ============== FUNÇÕES AUXILIARES ==============
function sortByCriadoEmDesc(items: Notificacao[]): Notificacao[] {
  return [...items].sort(
    (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
  );
}

function getNotificationResourceId(notificacao: Notificacao): string {
  const metadata = (notificacao.metadata || {}) as Record<string, unknown>;
  return String(
    metadata.resourceId ||
      metadata.documentoId ||
      metadata.boletimId ||
      metadata.premioId ||
      "global"
  );
}

// Converter Timestamp do Firebase para Date
function convertTimestampToDate(data: any): any {
  if (!data) return data;

  const converted = { ...data };
  Object.keys(converted).forEach((key) => {
    if (converted[key] instanceof Timestamp) {
      converted[key] = converted[key].toDate();
    } else if (converted[key]?.metadata) {
      // Converter datas dentro de metadata
      Object.keys(converted[key].metadata).forEach((metaKey) => {
        if (converted[key].metadata[metaKey] instanceof Timestamp) {
          converted[key].metadata[metaKey] =
            converted[key].metadata[metaKey].toDate();
        }
      });
    }
  });

  return converted;
}

export const notificacaoService = {
  // ============== CRUD de Notificações ==============

  async criar(data: NotificacaoFormData): Promise<Notificacao> {
    await assertOwnerOrRole(
      data.userId,
      ["admin", "gestor"],
      "criar notificação para outro usuário"
    );

    try {
      const notificacaoData = {
        ...data,
        lida: false,
        emailEnviado: false,
        criadoEm: new Date(),
      };

      const docRef = await addDoc(
        collection(db, NOTIFICACOES_COLLECTION),
        notificacaoData
      );

      const notificacao: Notificacao = {
        id: docRef.id,
        ...notificacaoData,
      };

      // Envio por e-mail (EmailJS, plano Spark): fire-and-forget
      emailNotificationService
        .sendForNotificationIfEnabled(
          notificacao,
          auth.currentUser?.email ?? null,
          auth.currentUser?.uid ?? null
        )
        .catch(() => {});

      return notificacao;
    } catch (error) {
      console.error("Erro ao criar notificação:", error);
      throw new Error("Erro ao criar notificação");
    }
  },

  async criarEmLote(notificacoes: NotificacaoFormData[]): Promise<void> {
    await assertRole(["admin", "gestor"], "criar notificações em lote");
    try {
      const batch = writeBatch(db);

      notificacoes.forEach((notificacao) => {
        const docRef = doc(collection(db, NOTIFICACOES_COLLECTION));
        batch.set(docRef, {
          ...notificacao,
          lida: false,
          emailEnviado: false,
          criadoEm: new Date(),
        });
      });

      await batch.commit();
    } catch (error) {
      console.error("Erro ao criar notificações em lote:", error);
      throw new Error("Erro ao criar notificações em lote");
    }
  },

  async buscarPorId(id: string): Promise<Notificacao | null> {
    await assertAuthenticated();
    try {
      const docRef = doc(db, NOTIFICACOES_COLLECTION, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = convertTimestampToDate(docSnap.data());
      return {
        id: docSnap.id,
        ...data,
      } as Notificacao;
    } catch (error) {
      console.error("Erro ao buscar notificação:", error);
      throw new Error("Erro ao buscar notificação");
    }
  },

  async listarPorUsuario(
    userId: string,
    filters?: NotificacaoFilters,
    limitCount?: number
  ): Promise<Notificacao[]> {
    await assertOwnerOrRole(
      userId,
      ["admin", "gestor"],
      "listar notificações de outro usuário"
    );

    try {
      let q = query(
        collection(db, NOTIFICACOES_COLLECTION),
        where("userId", "==", userId),
        orderBy("criadoEm", "desc")
      );

      if (filters?.tipo) {
        q = query(q, where("tipo", "==", filters.tipo));
      }

      if (filters?.prioridade) {
        q = query(q, where("prioridade", "==", filters.prioridade));
      }

      if (filters?.lida !== undefined) {
        q = query(q, where("lida", "==", filters.lida));
      }

      if (limitCount) {
        q = query(q, limit(limitCount));
      }

      const snapshot = await getDocs(q);
      const notificacoes = snapshot.docs.map((doc) => {
        const data = convertTimestampToDate(doc.data());
        return {
          id: doc.id,
          ...data,
        } as Notificacao;
      });

      // Filtros adicionais (data)
      let filteredNotificacoes = notificacoes;

      if (filters?.dataInicio) {
        filteredNotificacoes = filteredNotificacoes.filter(
          (n) => n.criadoEm >= filters.dataInicio!
        );
      }

      if (filters?.dataFim) {
        filteredNotificacoes = filteredNotificacoes.filter(
          (n) => n.criadoEm <= filters.dataFim!
        );
      }

      return filteredNotificacoes;
    } catch (error) {
      // Fallback sem índice composto: busca por userId e filtra/ordena em memória
      if (isMissingIndexError(error)) {
        try {
          const baseQuery = query(
            collection(db, NOTIFICACOES_COLLECTION),
            where("userId", "==", userId)
          );
          const snapshot = await getDocs(baseQuery);
          let notificacoes = snapshot.docs.map((doc) => {
            const data = convertTimestampToDate(doc.data());
            return {
              id: doc.id,
              ...data,
            } as Notificacao;
          });

          if (filters?.tipo) {
            notificacoes = notificacoes.filter((n) => n.tipo === filters.tipo);
          }
          if (filters?.prioridade) {
            notificacoes = notificacoes.filter(
              (n) => n.prioridade === filters.prioridade
            );
          }
          if (filters?.lida !== undefined) {
            notificacoes = notificacoes.filter((n) => n.lida === filters.lida);
          }
          if (filters?.dataInicio) {
            notificacoes = notificacoes.filter(
              (n) => new Date(n.criadoEm) >= filters.dataInicio!
            );
          }
          if (filters?.dataFim) {
            notificacoes = notificacoes.filter(
              (n) => new Date(n.criadoEm) <= filters.dataFim!
            );
          }

          notificacoes = sortByCriadoEmDesc(notificacoes);
          if (limitCount) notificacoes = notificacoes.slice(0, limitCount);

          return notificacoes;
        } catch (fallbackError) {
          console.error("Erro ao listar notificações (fallback):", fallbackError);
          throw new Error("Erro ao listar notificações");
        }
      }

      console.error("Erro ao listar notificações:", error);
      throw new Error("Erro ao listar notificações");
    }
  },

  async marcarComoLida(id: string): Promise<void> {
    await assertAuthenticated();
    try {
      const docRef = doc(db, NOTIFICACOES_COLLECTION, id);
      await updateDoc(docRef, {
        lida: true,
        lidoEm: new Date(),
      });
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
      throw new Error("Erro ao marcar notificação como lida");
    }
  },

  async marcarTodasComoLidas(userId: string): Promise<void> {
    await assertOwnerOrRole(
      userId,
      ["admin", "gestor"],
      "marcar notificações de outro usuário"
    );

    try {
      let snapshot;
      try {
        const q = query(
          collection(db, NOTIFICACOES_COLLECTION),
          where("userId", "==", userId),
          where("lida", "==", false)
        );
        snapshot = await getDocs(q);
      } catch (err) {
        if (!isMissingIndexError(err)) throw err;
        // Fallback: busca tudo do usuário e filtra em memória
        const q = query(
          collection(db, NOTIFICACOES_COLLECTION),
          where("userId", "==", userId)
        );
        const all = await getDocs(q);
        snapshot = {
          docs: all.docs.filter((d) => (d.data() as any)?.lida === false),
        } as unknown as typeof all;
      }

      const batch = writeBatch(db);

      snapshot.docs.forEach((document) => {
        batch.update(document.ref, {
          lida: true,
          lidoEm: new Date(),
        });
      });

      await batch.commit();
    } catch (error) {
      console.error("Erro ao marcar todas notificações como lidas:", error);
      throw new Error("Erro ao marcar todas notificações como lidas");
    }
  },

  async marcarEmailEnviado(id: string): Promise<void> {
    await assertRole(["admin", "gestor"], "marcar e-mail como enviado");
    try {
      const docRef = doc(db, NOTIFICACOES_COLLECTION, id);
      await updateDoc(docRef, {
        emailEnviado: true,
        dataEmailEnviado: new Date(),
      });
    } catch (error) {
      console.error("Erro ao marcar email como enviado:", error);
      throw new Error("Erro ao marcar email como enviado");
    }
  },

  async deletar(id: string): Promise<void> {
    await assertAuthenticated();
    try {
      const docRef = doc(db, NOTIFICACOES_COLLECTION, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Erro ao deletar notificação:", error);
      throw new Error("Erro ao deletar notificação");
    }
  },

  async deletarTodasLidas(userId: string): Promise<void> {
    await assertOwnerOrRole(
      userId,
      ["admin", "gestor"],
      "deletar notificações lidas de outro usuário"
    );

    try {
      let snapshot;
      try {
        const q = query(
          collection(db, NOTIFICACOES_COLLECTION),
          where("userId", "==", userId),
          where("lida", "==", true)
        );
        snapshot = await getDocs(q);
      } catch (err) {
        if (!isMissingIndexError(err)) throw err;
        // Fallback: busca tudo do usuário e filtra em memória
        const q = query(
          collection(db, NOTIFICACOES_COLLECTION),
          where("userId", "==", userId)
        );
        const all = await getDocs(q);
        snapshot = {
          docs: all.docs.filter((d) => (d.data() as any)?.lida === true),
        } as unknown as typeof all;
      }

      const batch = writeBatch(db);

      snapshot.docs.forEach((document) => {
        batch.delete(document.ref);
      });

      await batch.commit();
    } catch (error) {
      console.error("Erro ao deletar notificações lidas:", error);
      throw new Error("Erro ao deletar notificações lidas");
    }
  },

  async deduplicarRepetidas(userId: string, janelaHoras: number = 24): Promise<number> {
    await assertOwnerOrRole(
      userId,
      ["admin", "gestor"],
      "deduplicar notificações de outro usuário"
    );

    try {
      const notificacoes = await this.listarPorUsuario(userId);
      const limite = Date.now() - janelaHoras * 60 * 60 * 1000;
      const recentes = sortByCriadoEmDesc(notificacoes).filter(
        (n) => new Date(n.criadoEm).getTime() >= limite
      );

      const seen = new Set<string>();
      const idsParaRemover: string[] = [];

      for (const notificacao of recentes) {
        const resourceId = getNotificationResourceId(notificacao);
        const chave = `${notificacao.tipo}:${resourceId}:${notificacao.titulo}:${notificacao.mensagem}`;
        if (seen.has(chave)) {
          idsParaRemover.push(notificacao.id);
        } else {
          seen.add(chave);
        }
      }

      if (idsParaRemover.length === 0) return 0;

      const batch = writeBatch(db);
      for (const id of idsParaRemover) {
        batch.delete(doc(db, NOTIFICACOES_COLLECTION, id));
      }
      await batch.commit();

      return idsParaRemover.length;
    } catch (error) {
      console.error("Erro ao deduplicar notificações:", error);
      return 0;
    }
  },

  // ============== Estatísticas ==============

  async obterEstatisticas(userId: string): Promise<NotificacaoStats> {
    await assertOwnerOrRole(
      userId,
      ["admin", "gestor"],
      "consultar estatísticas de outro usuário"
    );

    try {
      const notificacoes = await this.listarPorUsuario(userId);

      const stats: NotificacaoStats = {
        total: notificacoes.length,
        naoLidas: notificacoes.filter((n) => !n.lida).length,
        porTipo: {
          documento_vencendo: 0,
          documento_vencido: 0,
          premio_lancado: 0,
          boletim_pendente: 0,
          boletim_vencendo: 0,
          sistema: 0,
          outro: 0,
        },
        porPrioridade: {
          baixa: 0,
          media: 0,
          alta: 0,
          urgente: 0,
        },
      };

      notificacoes.forEach((n) => {
        stats.porTipo[n.tipo]++;
        stats.porPrioridade[n.prioridade]++;
      });

      return stats;
    } catch (error) {
      console.error("Erro ao obter estatísticas:", error);
      throw new Error("Erro ao obter estatísticas");
    }
  },

  // ============== Observadores em Tempo Real ==============

  observarNotificacoes(
    userId: string,
    callback: (notificacoes: Notificacao[]) => void
  ): Unsubscribe {
    // Evita índice composto (userId + orderBy): observa por userId e ordena/limita em memória
    const q = query(
      collection(db, NOTIFICACOES_COLLECTION),
      where("userId", "==", userId)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        let notificacoes = snapshot.docs.map((doc) => {
          const data = convertTimestampToDate(doc.data());
          return {
            id: doc.id,
            ...data,
          } as Notificacao;
        });
        notificacoes = sortByCriadoEmDesc(notificacoes).slice(0, 50);
        callback(notificacoes);
      },
      (error) => {
        console.error("Erro ao observar notificações:", error);
        callback([]);
      }
    );
  },

  observarNotificacoesNaoLidas(
    userId: string,
    callback: (count: number) => void
  ): Unsubscribe {
    // Evita índice composto (userId + lida): observa por userId e conta não lidas em memória
    const q = query(
      collection(db, NOTIFICACOES_COLLECTION),
      where("userId", "==", userId)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const count = snapshot.docs.reduce((acc, d) => {
          const data = d.data() as any;
          return acc + (data?.lida === false ? 1 : 0);
        }, 0);
        callback(count);
      },
      (error) => {
        console.error("Erro ao observar notificações não lidas:", error);
        callback(0);
      }
    );
  },

  // ============== Configurações de Notificação ==============

  async obterConfiguracoes(userId: string): Promise<ConfiguracaoNotificacao> {
    await assertOwnerOrRole(
      userId,
      ["admin"],
      "consultar configurações de outro usuário"
    );

    try {
      const docRef = doc(db, CONFIGURACOES_COLLECTION, userId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        // Criar configurações padrão
        const configPadrao: ConfiguracaoNotificacao = {
          id: userId,
          userId,
          emailNotificacoes: true,
          emailDocumentoVencendo: true,
          emailDocumentoVencido: true,
          emailPremioLancado: true,
          emailBoletimPendente: true,
          diasAntesVencimento: 7,
          horaVerificacao: "09:00",
          atualizadoEm: new Date(),
        };

        await this.atualizarConfiguracoes(userId, {
          emailNotificacoes: configPadrao.emailNotificacoes,
          emailDocumentoVencendo: configPadrao.emailDocumentoVencendo,
          emailDocumentoVencido: configPadrao.emailDocumentoVencido,
          emailPremioLancado: configPadrao.emailPremioLancado,
          emailBoletimPendente: configPadrao.emailBoletimPendente,
          diasAntesVencimento: configPadrao.diasAntesVencimento,
          horaVerificacao: configPadrao.horaVerificacao,
        });

        return configPadrao;
      }

      const data = convertTimestampToDate(docSnap.data());
      return {
        id: docSnap.id,
        ...data,
      } as ConfiguracaoNotificacao;
    } catch (error) {
      console.error("Erro ao obter configurações:", error);
      throw new Error("Erro ao obter configurações");
    }
  },

  async atualizarConfiguracoes(
    userId: string,
    data: ConfiguracaoNotificacaoFormData
  ): Promise<void> {
    await assertOwnerOrRole(
      userId,
      ["admin"],
      "atualizar configurações de outro usuário"
    );

    try {
      const docRef = doc(db, CONFIGURACOES_COLLECTION, userId);
      const payload = { ...data, atualizadoEm: new Date() };
      await updateDoc(docRef, payload).catch(async () => {
        // Se não existe, criar
        await addDoc(collection(db, CONFIGURACOES_COLLECTION), {
          userId,
          ...payload,
        });
      });
    } catch (error) {
      console.error("Erro ao atualizar configurações:", error);
      throw new Error("Erro ao atualizar configurações");
    }
  },

  // ============== Utilitários para Criar Notificações Específicas ==============

  async notificarDocumentoVencendo(
    userId: string,
    documentoId: string,
    colaboradorNome: string,
    tipoDocumento: string,
    dataVencimento: Date
  ): Promise<void> {
    await assertRole(["admin", "gestor"], "enviar notificação de documento vencendo");

    if (!canSendNotification(userId, "documento_vencendo", documentoId)) {
      return;
    }

    const existing = await findExistingNotification(
      userId,
      "documento_vencendo",
      documentoId,
      24
    );
    if (existing) {
      return;
    }

    const diasRestantes = Math.ceil(
      (dataVencimento.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    await this.criar({
      userId,
      tipo: "documento_vencendo",
      prioridade:
        diasRestantes <= 3 ? "urgente" : diasRestantes <= 7 ? "alta" : "media",
      titulo: `Documento prestes a vencer`,
      mensagem: `O documento ${tipoDocumento} de ${colaboradorNome} vence em ${diasRestantes} dia(s).`,
      link: `/documentacoes`,
      metadata: {
        documentoId,
        resourceId: documentoId,
        colaboradorNome,
        tipoDocumento,
        dataVencimento,
        diasRestantes,
      },
    });

    await removeDuplicateNotifications(userId, "documento_vencendo", documentoId, 1);
  },

  async notificarDocumentoVencido(
    userId: string,
    documentoId: string,
    colaboradorNome: string,
    tipoDocumento: string,
    dataVencimento: Date
  ): Promise<void> {
    await assertRole(["admin", "gestor"], "enviar notificação de documento vencido");

    if (!canSendNotification(userId, "documento_vencido", documentoId)) {
      return;
    }

    const existing = await findExistingNotification(
      userId,
      "documento_vencido",
      documentoId,
      24
    );
    if (existing) {
      return;
    }

    await this.criar({
      userId,
      tipo: "documento_vencido",
      prioridade: "urgente",
      titulo: `Documento vencido!`,
      mensagem: `O documento ${tipoDocumento} de ${colaboradorNome} está vencido desde ${dataVencimento.toLocaleDateString()}.`,
      link: `/documentacoes`,
      metadata: {
        documentoId,
        resourceId: documentoId,
        colaboradorNome,
        tipoDocumento,
        dataVencimento,
      },
    });

    await removeDuplicateNotifications(userId, "documento_vencido", documentoId, 1);
  },

  async notificarPremioLancado(
    userId: string,
    premioId: string,
    colaboradorNome: string,
    valor: number,
    motivo: string
  ): Promise<void> {
    await assertRole(["admin", "gestor"], "enviar notificação de prêmio");

    if (!canSendNotification(userId, "premio_lancado", premioId)) {
      return;
    }

    const existing = await findExistingNotification(
      userId,
      "premio_lancado",
      premioId,
      24
    );
    if (existing) {
      return;
    }

    await this.criar({
      userId,
      tipo: "premio_lancado",
      prioridade: "media",
      titulo: `Novo prêmio lançado`,
      mensagem: `Prêmio de R$ ${valor.toFixed(
        2
      )} lançado para ${colaboradorNome}: ${motivo}`,
      link: `/premios-produtividade`,
      metadata: {
        premioId,
        resourceId: premioId,
        colaboradorNome,
        valor,
        motivo,
      },
    });

    await removeDuplicateNotifications(userId, "premio_lancado", premioId, 1);
  },

  async notificarBoletimPendente(
    userId: string,
    boletimId: string,
    cliente: string,
    numero: string,
    valor: number
  ): Promise<void> {
    await assertRole(["admin", "gestor"], "enviar notificação de boletim pendente");

    if (!canSendNotification(userId, "boletim_pendente", boletimId)) {
      return;
    }

    const existing = await findExistingNotification(
      userId,
      "boletim_pendente",
      boletimId,
      24
    );
    if (existing) {
      return;
    }

    await this.criar({
      userId,
      tipo: "boletim_pendente",
      prioridade: "alta",
      titulo: `Boletim pendente`,
      mensagem: `Boletim ${numero} do cliente ${cliente} está pendente (R$ ${valor.toFixed(
        2
      )}).`,
      link: `/boletins-medicao`,
      metadata: {
        boletimId,
        resourceId: boletimId,
        cliente,
        numero,
        valor,
      },
    });

    await removeDuplicateNotifications(userId, "boletim_pendente", boletimId, 1);
  },

  async notificarBoletimVencendo(
    userId: string,
    boletimId: string,
    cliente: string,
    numero: string,
    dataVencimento: Date
  ): Promise<void> {
    await assertRole(["admin", "gestor"], "enviar notificação de boletim vencendo");

    if (!canSendNotification(userId, "boletim_vencendo", boletimId)) {
      return;
    }

    const existing = await findExistingNotification(
      userId,
      "boletim_vencendo",
      boletimId,
      24
    );
    if (existing) {
      return;
    }

    const diasRestantes = Math.ceil(
      (dataVencimento.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    await this.criar({
      userId,
      tipo: "boletim_vencendo",
      prioridade: diasRestantes <= 2 ? "urgente" : "alta",
      titulo: `Boletim vencendo`,
      mensagem: `Boletim ${numero} do cliente ${cliente} vence em ${diasRestantes} dia(s).`,
      link: `/boletins-medicao`,
      metadata: {
        boletimId,
        resourceId: boletimId,
        cliente,
        numero,
        dataVencimento,
        diasRestantes,
      },
    });

    await removeDuplicateNotifications(userId, "boletim_vencendo", boletimId, 1);
  },
};
