# O que falta implementar – Nova estimativa

Documento gerado com base no **escopo da estimativa original** (MVP 60h / Robusta 100h) e no **estado atual do código** do projeto 342-Maria.

---

## 1. Visão geral: estado por módulo

| Módulo | Escopo original | Estado atual | Falta (MVP) | Falta (Robusta) |
|--------|-----------------|--------------|-------------|-----------------|
| 1. Login, Cadastro e Permissões | 8h MVP / 12h Robusta | ✅ Implementado (rotas protegidas, roles, menu por perfil, Administração) | — | Pequenos ajustes |
| 2. Painel Principal e Estrutura | 8h MVP / 10h Robusta | ✅ Dashboard com métricas reais e notificações do contexto; exportação base PDF/Excel | — | Backup em nuvem |
| 3. Prêmio de Produtividade | 8h MVP / 12h Robusta | ✅ CRUD, colaboradores reais, filtros, histórico, exportação Excel | — | Relatório mensal automático (se diferente do atual) |
| 4. Boletins de Medição | 8h MVP / 12h Robusta | ✅ CRUD, anexos (base64), filtros, dashboard, exportação | — | Anexos em Firebase Storage (opcional) |
| 5. Documentação e Integrações | 9h MVP / 14h Robusta | ✅ Documentos obrigatórios, validade, alertas, anexos, treinamentos (agenda) | Relatório documentos vencidos (export) | Integração agenda ↔ documentos; refinamentos |
| 6. Caderno Virtual | 8h MVP / 12h Robusta | ✅ CRUD, filtros, status Recebido/Pendente, identificação criadoPor/data | **Persistência de anexos** | Download de anexos, UX |
| 7. Sistema de Notificações | 4h MVP / 18h Robusta | ✅ Automáticas (documentos, prêmios, boletins), tempo real, histórico, configurações | — | **E-mail**, **Push (PWA)** |
| 8. Relatórios e Controle Geral | 7h MVP / 10h Robusta | ✅ Consolidado mensal, filtro período, exportação Excel | **PDF real**, **filtro por colaborador** | Backup, refinamentos |

---

## 2. Detalhamento do que falta (por módulo)

### Módulo 1 – Login, Cadastro e Permissões  
**Status:** ✅ Concluído para MVP e quase para Robusta.

- **Implementado:** Login seguro (Firebase Auth), cadastro, recuperação de senha, níveis admin/gestor/colaborador, rotas protegidas por `allowedRoles`, menu lateral por perfil, área Administração, base de usuários no Firestore.
- **Falta (Robusta):** Revisão de usabilidade (mensagens, acessibilidade), eventual auditoria de acessos.  
**Estimativa restante:** 0h (MVP) | 1–2h (Robusta).

---

### Módulo 2 – Painel Principal e Estrutura  
**Status:** ✅ Concluído para MVP.

- **Implementado:** Painel com resumo diário (métricas reais: lançamentos hoje, documentos pendentes/vencendo, boletins, prêmios, colaboradores), atividades recentes, seção “Notificações e Alertas” usando `NotificationContext` (dados reais). Estrutura base de exportação PDF/Excel em `exportUtils.ts` e uso em Boletins e Relatórios.
- **Falta (Robusta):** Backup automático em nuvem (ex.: exportação agendada para Firebase Storage ou serviço externo).  
**Estimativa restante:** 0h (MVP) | 4–6h (Robusta).

---

### Módulo 3 – Prêmio de Produtividade  
**Status:** ✅ Concluído para MVP e Robusta.

- **Implementado:** Cadastro de colaboradores (nome, CPF, cargo, setor), registro de prêmio (valor, data, motivo), histórico por colaborador, filtros (mês, ano, status, colaborador), listagem vinculada a `colaboradorService`, exportação Excel (CSV).
- **Falta:** Nada crítico; relatório mensal “com exportação automática” pode ser apenas o uso do relatório consolidado + exportação manual já existente.  
**Estimativa restante:** 0h (MVP) | 0–1h (Robusta, se quiser relatório mensal dedicado automático).

---

### Módulo 4 – Boletins de Medição  
**Status:** ✅ Concluído para MVP.

- **Implementado:** Cadastro por cliente, status (Emitido, Pendente, Aguardando assinatura), anexos (base64 no Firestore), filtros (mês, cliente, tipo de serviço, status), dashboard (total emitido, saldo pendente), exportação PDF/Excel da listagem.
- **Falta (Robusta):** Migrar anexos para Firebase Storage (recomendado para produção).  
**Estimativa restante:** 0h (MVP) | 3–4h (Robusta).

---

### Módulo 5 – Documentação e Integrações  
**Status:** Quase completo para MVP.

- **Implementado:** Cadastro de documentos obrigatórios por colaborador (ASO, NR-11, NR-18, NR-33, NR-35, CNH, etc.), controle de validade e vencimentos, alertas automáticos (notificações in-app), anexos, aba “Treinamentos” (agenda de treinamentos com CRUD e status).
- **Falta (MVP):** Relatório de **documentos vencidos** com opção de exportação (PDF ou Excel).  
- **Falta (Robusta):** Integração mais explícita entre agenda de treinamentos e documentos (ex.: vincular conclusão de treinamento à atualização de certificado); refinamentos de relatório.  
**Estimativa restante:** 2–3h (MVP) | 4–5h (Robusta).

---

### Módulo 6 – Caderno Virtual de Lançamentos Diários  
**Status:** Quase completo; falta persistência de anexos.

- **Implementado:** Registro de movimentações (serviços, pagamentos, recebimentos, observações), identificação de quem fez o lançamento e data/hora (`criadoPor`, `criadoEm`), status Recebido/Pendente, filtros por data e colaborador. **Interface** permite anexar comprovantes (depósito, OS, boletos), mas o serviço grava sempre `anexos: []` (não persiste arquivos).
- **Falta (MVP):** Persistir anexos (upload base64 no Firestore ou Firebase Storage) e exibir/download na listagem e no modal.  
- **Falta (Robusta):** Migrar anexos para Storage, melhorar UX de anexos (preview, download).  
**Estimativa restante:** 3–4h (MVP) | 5–6h (Robusta).

---

### Módulo 7 – Sistema de Notificações  
**Status:** MVP completo; Robusta exige e-mail e push.

- **Implementado:** Notificações automáticas (documentos vencendo/vencidos, prêmios lançados, boletins pendentes/vencendo), notificações em tempo real (Firestore), histórico na página Notificações, configurações (e-mail on/off, tipos, dias de antecedência), estrutura para e-mail (`emailEnviado`, etc.).
- **Falta (Robusta):** Envio real de **e-mail** (SMTP/API + templates + Cloud Functions ou backend) e **notificações push** (PWA/Service Worker).  
**Estimativa restante:** 0h (MVP) | 10–14h (Robusta).

---

### Módulo 8 – Relatórios e Controle Geral  
**Status:** Falta PDF real e filtro por colaborador.

- **Implementado:** Relatório consolidado mensal (prêmios, boletins, documentações, recebimentos), filtros por **período** (mês/ano), exportação **Excel** (CSV). “Exportar PDF” hoje gera HTML e download com extensão `.html`, não arquivo `.pdf`.
- **Falta (MVP):** Geração de **PDF real** (ex.: jsPDF + jspdf-autotable ou html2pdf.js) e **filtro por colaborador** no relatório (e na exportação).  
- **Falta (Robusta):** **Backup manual** (download de dados em CSV/Excel por entidade – usuários, prêmios, boletins, etc.), restrito a gestor/admin.  
**Estimativa restante:** 4–5h (MVP) | 7–9h (Robusta).

---

## 3. Resumo das lacunas prioritárias

| Prioridade | Item | Módulo | MVP (h) | Robusta (h) |
|------------|------|--------|---------|-------------|
| Alta | Persistência de anexos no Caderno Virtual | 6 | 3–4 | 5–6 |
| Alta | Exportação PDF real no Relatório | 8 | 3 | 3–4 |
| Alta | Filtro por colaborador no Relatório | 8 | 1–2 | 1–2 |
| Média | Relatório de documentos vencidos (export) | 5 | 2–3 | 2–3 |
| Média | Backup manual (CSV/Excel por entidade) | 2 / 8 | — | 2,5–3 |
| Média | Backup automático em nuvem | 2 | — | 4–6 |
| Robusta | Notificações por e-mail | 7 | — | 6–8 |
| Robusta | Notificações push (PWA) | 7 | — | 4–6 |
| Robusta | Anexos boletins → Firebase Storage | 4 | — | 3–4 |
| Robusta | Integração agenda treinamentos ↔ documentos | 5 | — | 2–3 |

---

## 4. Nova estimativa do que falta

### Versão MVP (fechar escopo MVP)

| # | Tarefa | Horas |
|---|--------|-------|
| 1 | Caderno Virtual: persistir anexos (upload + exibir) | 3–4h |
| 2 | Relatórios: PDF real (jsPDF ou similar) | 3h |
| 3 | Relatórios: filtro por colaborador + exportação | 1–2h |
| 4 | Documentações: relatório documentos vencidos (export PDF/Excel) | 2–3h |
| **Total estimado MVP** | | **9–12 h** |

Ou seja: do escopo original de **60 h** para o MVP, a maior parte já está implementada. **Faltam cerca de 9–12 h** para fechar 100% do MVP conforme a estimativa.

---

### Versão Robusta (fechar escopo Robusta)

Além do que falta no MVP:

| # | Tarefa | Horas |
|---|--------|-------|
| 5 | Backup manual (Configurações/Relatórios): export CSV por entidade | 2,5–3h |
| 6 | Backup automático em nuvem (agendado) | 4–6h |
| 7 | Notificações por e-mail (SMTP/API + Cloud Functions ou backend) | 6–8h |
| 8 | Notificações push (PWA / Service Worker) | 4–6h |
| 9 | Anexos boletins → Firebase Storage | 3–4h |
| 10 | Caderno Virtual: anexos em Storage + UX (download, preview) | 2h |
| 11 | Documentações: integração agenda ↔ documentos + refinamentos | 2–3h |
| 12 | Login/Permissões: revisão usabilidade e testes | 1–2h |
| **Subtotal Robusta (itens 5–12)** | | **25–34 h** |

**Total estimado para Robusta (tudo que falta):**  
**(9–12 h)** (MVP) + **(25–34 h)** (extras Robusta) = **34–46 h**.

Ou seja: do escopo original de **100 h** para a versão Robusta, restam aproximadamente **34–46 h** para concluir 100% do escopo.

---

## 5. Ordem sugerida de implementação

**Fase 1 – Fechar MVP (9–12 h)**  
1. Caderno Virtual: persistência de anexos (3–4h)  
2. Relatórios: PDF real (3h)  
3. Relatórios: filtro por colaborador (1–2h)  
4. Documentações: relatório documentos vencidos com export (2–3h)  

**Fase 2 – Robusta (25–34 h)**  
5. Backup manual (2,5–3h)  
6. Notificações por e-mail (6–8h)  
7. Anexos boletins e caderno em Firebase Storage (5–6h)  
8. Notificações push / PWA (4–6h)  
9. Backup automático em nuvem (4–6h)  
10. Integração treinamentos ↔ documentos + usabilidade (3–5h)  

---

## 6. Observações técnicas

- **PDF:** Hoje `relatoriosService.exportarRelatorioPDF` retorna `Blob` de HTML; o download em `Relatorios.tsx` usa `.html`. É necessário usar `jspdf` + `jspdf-autotable` (ou `html2pdf.js`) e gerar arquivo `.pdf`.
- **Anexos Caderno Virtual:** Em `cadernoVirtualService.create` e `update` o payload usa `anexos: []`; é preciso converter `File[]` em base64 (ou upload para Storage) e preencher `anexos` no documento.
- **Backup:** Não existe nenhuma função de backup no código; criar em Configurações ou Relatórios, com permissão apenas para admin/gestor.
- **E-mail:** A estrutura de notificações já suporta flags e configurações; falta serviço de envio (ex.: Cloud Functions + SendGrid/SES) e templates.

---

**Resumo final**

- **MVP:** Faltam **~9–12 h** para concluir 100% do escopo MVP da estimativa original.  
- **Robusta:** Faltam **~34–46 h** no total (incluindo o que falta do MVP) para concluir 100% do escopo Robusta.  
- As horas restantes são inferiores às da estimativa original porque a maior parte dos módulos (login, painel, prêmios, boletins, documentações, caderno virtual, notificações in-app e relatório consolidado) já está implementada.
