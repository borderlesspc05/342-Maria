1. Reestruturação da Segurança no Firestore
* Implementamos um endurecimento estrutural das regras para migrar de permissões amplas para um modelo baseado em autenticação e papel de usuário.
🔹 Definimos funções centrais de verificação (`isSignedIn`, `currentRole`, `isAdmin`, `isGestor`, `isColaborador`) para padronizar decisões de acesso.
🔹 Reduzimos risco de acesso indevido ao substituir regras genéricas por controles explícitos por coleção.
🔹 Estabelecemos base para evoluir o isolamento por usuário sem reescrever todas as regras.
✔️ Benefícios:
- Aumenta a previsibilidade de segurança em produção.
- Diminui a superfície de exposição de dados sensíveis.
- Facilita auditoria de permissões por coleção.

----

2. Padronização de Funções de Política de Acesso
* Criamos funções reutilizáveis nas regras do Firestore para centralizar validações e reduzir inconsistências.
🔹 Consolidamos validações como `isAdminOrGestor`, `isKnownRole` e verificações de dono.
🔹 Evitamos duplicação de lógica de autorização em múltiplos blocos de regra.
🔹 Organizamos o fluxo de decisão para leitura, criação, atualização e remoção.
✔️ Benefícios:
- Reduz erros de manutenção em regras extensas.
- Acelera ajustes futuros de segurança.
- Melhora a legibilidade para revisão técnica.

----

3. Restrição de Acesso à Coleção de Usuários
* Aplicamos regras específicas para leitura e escrita em `users`, alinhando permissões com o papel do solicitante.
🔹 Permitimos leitura própria e leitura administrativa com critérios objetivos.
🔹 Restringimos criação self-service para perfil padrão e mantivemos criação ampla sob privilégio administrativo.
🔹 Validamos consistência de campos críticos em atualizações do próprio perfil.
✔️ Benefícios:
- Reduz manipulação indevida de perfis e papéis.
- Protege integridade dos dados de identidade.
- Reforça governança de cadastro de contas.

----

4. Isolamento de `lancamentosDiarios` por Dono
* Reescrevemos as regras de `lancamentosDiarios` para exigir vínculo de propriedade em cenários de colaborador.
🔹 Aplicamos leitura e escrita por owner para perfis não privilegiados.
🔹 Mantivemos visão ampliada para admin/gestor, conforme decisão de negócio.
🔹 Exigimos `ownerUid` válido na criação para garantir rastreabilidade.
✔️ Benefícios:
- Evita vazamento de lançamentos entre contas.
- Mantém flexibilidade operacional para gestão.
- Fortalece rastreabilidade de autoria.

----

5. Exigência de `ownerUid` na Criação de Boletins
* Ajustamos as regras de `boletinsMedicao` para exigir `ownerUid` do usuário autenticado em creates.
🔹 Mantivemos leitura e gestão para papéis privilegiados.
🔹 Impedimos gravação sem vínculo explícito de dono.
🔹 Alinhamos backend de segurança com escopo aplicado no frontend.
✔️ Benefícios:
- Garante consistência entre regra e serviço.
- Facilita filtros por usuário em consultas futuras.
- Reduz risco de registros órfãos.

----

6. Exigência de `ownerUid` em Notas Fiscais
* Endurecemos regras de `notas_fiscais` para criação com dono definido e autorizado.
🔹 Mantivemos controle administrativo para leituras e alterações.
🔹 Bloqueamos gravações sem identificação de proprietário.
🔹 Suportamos estratégia de separação de dados por conta.
✔️ Benefícios:
- Reforça controle de origem dos documentos.
- Melhora segurança de dados financeiros.
- Apoia relatórios segmentados por conta.

----

7. Exigência de `ownerUid` em Comprovantes Bancários
* Aplicamos o mesmo padrão de propriedade em `comprovantes_bancarios` para padronização financeira.
🔹 Exigimos `ownerUid` em criação.
🔹 Preservamos gestão por papéis privilegiados.
🔹 Harmonizamos regra com payload persistido pelos serviços.
✔️ Benefícios:
- Uniformiza segurança entre módulos financeiros.
- Diminui risco de inconsistência regulatória interna.
- Facilita troubleshooting por trilha de dono.

----

8. Reforço de Criação Segura em Documentações
* Atualizamos regras de `documentacoes` para exigir dono e validar contexto de criação.
🔹 Vinculamos cada novo registro a um usuário autenticado.
🔹 Mantivemos governança de leitura e manutenção via admin/gestor.
🔹 Preparamos base para filtros de isolamento por owner.
✔️ Benefícios:
- Evita registros sem responsável.
- Eleva qualidade dos dados para auditoria.
- Apoia visão segura por perfil.

----

9. Reforço de Criação Segura em Treinamentos
* Aplicamos validação de owner em `treinamentos` para manter padrão de segurança transversal.
🔹 Exigimos `ownerUid` no momento da criação.
🔹 Preservamos gerenciamento por papéis de liderança.
🔹 Sincronizamos regra com payload dos serviços de treinamento.
✔️ Benefícios:
- Padroniza governança entre subdomínios de RH e compliance.
- Reduz ambiguidade de autoria de ações.
- Melhora consistência de consultas segmentadas.

----

10. Reforço de Criação Segura em Prêmios
* Ajustamos `premiosProdutividade` para exigir owner na origem do registro.
🔹 Mantivemos edição e leitura sob gestão privilegiada.
🔹 Alinhamos modelo de dados à estratégia de isolamento por conta.
🔹 Evitamos entrada de dados sem vínculo de usuário.
✔️ Benefícios:
- Melhora precisão de relatórios por proprietário.
- Fortalece trilha de responsabilidade.
- Reduz retrabalho de saneamento de dados.

----

11. Reforço de Criação Segura em Colaboradores
* Atualizamos regras da coleção `colaboradores` para incluir validação de dono em criação.
🔹 Exigimos owner coerente com usuário autenticado.
🔹 Mantivemos leitura e manutenção por administração/gestão.
🔹 Padronizamos comportamento com outras coleções de negócio.
✔️ Benefícios:
- Eleva consistência do ecossistema de dados.
- Evita inclusão sem autoria rastreável.
- Facilita governança operacional.

----

12. Refinamento de Regras de Notificações
* Redesenhamos as permissões de `notificacoes` para equilibrar propriedade do usuário com visão gerencial.
🔹 Permitimos acesso do próprio destinatário e de perfis privilegiados.
🔹 Restringimos criação, atualização e remoção conforme dono ou papel autorizado.
🔹 Preservamos fluxo de operação sem abrir acesso indiscriminado.
✔️ Benefícios:
- Protege privacidade de notificações pessoais.
- Mantém operação administrativa quando necessário.
- Diminui risco de leitura cruzada indevida.

----

13. Restrição de Configurações de Notificação por Usuário
* Aplicamos regras em `configuracoes_notificacoes` para permitir alteração apenas do próprio usuário ou admin.
🔹 Reforçamos controle de preferências individuais.
🔹 Evitamos que terceiros alterem canal de alertas.
🔹 Mantivemos exceção administrativa para suporte.
✔️ Benefícios:
- Protege autonomia das preferências de notificação.
- Reduz falhas operacionais por alteração indevida.
- Melhora confiabilidade de comunicação.

----

14. Blindagem de Configuração e Backups
* Endurecemos as regras de `config` e `backups` para acesso administrativo e escrita bloqueada quando aplicável.
🔹 Permitimos leitura sensível apenas para admin.
🔹 Bloqueamos escrita direta em backups via regras.
🔹 Eliminamos caminhos de alteração sem governança.
✔️ Benefícios:
- Diminui risco de manipulação crítica de configuração.
- Protege histórico de backup contra alteração indevida.
- Melhora postura de segurança operacional.

----

15. Reforço das Regras de Storage
* Implementamos controles de role e validação de arquivo em `storage.rules` para uploads mais seguros.
🔹 Definimos limites de tamanho por pasta e tipos de conteúdo permitidos.
🔹 Mantivemos acesso diferenciado para `caderno_virtual`, `boletins_medicao` e `documentos_financeiros`.
🔹 Restringimos `backups` para leitura administrativa e escrita bloqueada.
✔️ Benefícios:
- Reduz risco de upload malicioso ou acidental.
- Controla custos e volume de armazenamento.
- Melhora aderência a boas práticas de segurança em arquivos.

----

16. Criação do Serviço Central de Segurança
* Criamos `securityService.ts` para unificar autenticação, autorização por role e validações de payload.
🔹 Implementamos cache temporário de role para reduzir leituras repetidas.
🔹 Adicionamos métodos `assertAuthenticated`, `assertRole` e `assertOwnerOrRole`.
🔹 Introduzimos utilitários de validação (`validateEmail`, `validateRequiredString`, `validatePositiveNumber`, `validateRole`).
✔️ Benefícios:
- Centraliza regras críticas em um ponto único.
- Padroniza mensagens e comportamento de erro.
- Reduz divergência de segurança entre serviços.

----

17. Introdução de Escopo de Dados por Usuário
* Evoluímos o `securityService` com `DataScope` e `getDataScope` para orientar filtros por proprietário.
🔹 Definimos distinção clara entre usuário privilegiado e usuário comum.
🔹 Permiti mos bypass de escopo para admin/gestor conforme decisão funcional.
🔹 Facilita aplicação consistente de owner filtering em consultas.
✔️ Benefícios:
- Acelera implementação de isolamento por conta.
- Mantém modelo de permissão alinhado ao negócio.
- Reduz probabilidade de consulta sem escopo.

----

18. Limpeza de Cache de Segurança no Fluxo de Autenticação
* Atualizamos `AuthContext.tsx` para limpar cache de role em mudanças de sessão.
🔹 Aplicamos limpeza no observeAuthState, login e logout.
🔹 Evitamos uso de role antiga após troca de conta.
🔹 Reduzimos inconsistências entre sessão atual e permissões em memória.
✔️ Benefícios:
- Eleva confiabilidade da autorização em tempo real.
- Reduz erros intermitentes de permissão.
- Melhora previsibilidade para usuários multi-sessão.

----

19. Proteção da Rota de Cadastro
* Ajustamos `AppRoutes.tsx` para permitir acesso à rota de registro apenas para admin.
🔹 Envolvemos a tela de cadastro com `ProtectedRoutes` e `allowedRoles` restrito.
🔹 Eliminamos abertura de cadastro por usuários sem privilégio.
🔹 Alinhamos frontend com política de criação de contas.
✔️ Benefícios:
- Evita autoelevação de privilégios via interface.
- Fortalece governança de provisionamento de usuários.
- Reduz vetor de criação indevida de contas.

----

20. Padronização de Papel no Cadastro Firebase
* Atualizamos `authService.firebase.ts` para forçar `role: colaborador` em registros diretos.
🔹 Removemos aceitação de role arbitrária no payload de registro.
🔹 Garantimos perfil inicial seguro no fluxo padrão.
🔹 Mantivemos criação de roles elevadas apenas por fluxo administrativo.
✔️ Benefícios:
- Evita privilégios indevidos no primeiro acesso.
- Simplifica auditoria de entrada de usuários.
- Reforça princípio de menor privilégio.

----

21. Padronização de Papel no Cadastro Local
* Atualizamos `authService.local.ts` para aplicar `role: colaborador` em novos usuários locais.
🔹 Alinhamos comportamento local ao modo Firebase.
🔹 Evitamos divergência funcional entre ambientes.
🔹 Mantivemos coerência do modelo RBAC no fallback.
✔️ Benefícios:
- Reduz diferenças entre homologação e produção.
- Melhora confiança nos testes de fluxo local.
- Evita permissões elevadas fora da trilha administrativa.

----

22. Fortalecimento de Tipagem de Role no Domínio de Usuário
* Ajustamos `src/types/user.ts` para tornar `role` obrigatório no tipo `User`.
🔹 Eliminamos ambiguidade de usuários sem papel definido.
🔹 Melhoramos segurança em tempo de compilação.
🔹 Garantimos contratos mais rígidos entre contexto e serviços.
✔️ Benefícios:
- Reduz bugs de autorização por campo opcional.
- Aumenta robustez de validações de acesso.
- Facilita manutenção do RBAC no código.

----

23. Endurecimento do Gerenciamento de Usuários
* Evoluímos `userManagementService.ts` com verificações de role e validação de dados.
🔹 Protegemos operações de listagem, criação, atualização e remoção com `assertRole(["admin"])`.
🔹 Validamos nome, e-mail e role antes de persistir.
🔹 Reduzimos risco de entrada de dados inválidos ou perigosos.
✔️ Benefícios:
- Eleva qualidade dos registros de usuário.
- Impede operações administrativas por perfis não autorizados.
- Melhora governança de identidade e acesso.

----

24. Proteção de Backup Manual via Cloud Function
* Atualizamos `functions/src/index.ts` para validar role admin na callable `runBackupNow`.
🔹 Consultamos perfil do solicitante antes de executar backup.
🔹 Retornamos erro de permissão quando papel não é admin.
🔹 Fortalecemos camada backend além do controle de frontend.
✔️ Benefícios:
- Impede execução indevida de rotina crítica.
- Protege recursos e dados de backup.
- Aumenta conformidade com princípio de privilégio mínimo.

----

25. Migração do Backup do Cliente para Callable Segura
* Ajustamos `backupService.ts` para disparar backup via `httpsCallable` com verificação de role.
🔹 Removemos lógica pesada de backup no cliente.
🔹 Aplicamos validação `assertRole(["admin"])` em operações sensíveis.
🔹 Mantivemos listagem e download sob controle administrativo.
✔️ Benefícios:
- Reduz exposição de lógica crítica no frontend.
- Melhora confiabilidade operacional do backup.
- Mantém trilha de segurança mais clara.

----

26. Isolamento de Cache Local no Módulo Financeiro
* Implementamos escopo por usuário no localStorage de `financeiroService.ts`.
🔹 Alteramos chave local para padrão sufixado por UID.
🔹 Evitamos compartilhamento de transações entre sessões diferentes no mesmo navegador.
🔹 Mantivemos fallback local funcional em ambiente sem Firebase.
✔️ Benefícios:
- Diminui vazamento de dados entre contas locais.
- Melhora consistência do modo offline.
- Reforça privacidade em uso compartilhado de dispositivo.

----

27. Endurecimento de Operações no Financeiro
* Aplicamos validações e guardas de permissão em `financeiroService.ts`.
🔹 Protegemos criação, listagem, atualização, remoção e estatísticas com `assertRole`.
🔹 Validamos campos críticos (`colaborador`, `descrição`, `valor`) antes de salvar.
🔹 Mantivemos comportamento de fallback sem abrir brechas de autorização.
✔️ Benefícios:
- Reduz risco de dados inconsistentes.
- Bloqueia operações financeiras por usuários não autorizados.
- Aumenta confiabilidade do fluxo financeiro.

----

28. Isolamento e Segurança em Documentos Financeiros
* Evoluímos `documentosFinanceirosService.ts` com ownerUid, validações e localStorage por usuário.
🔹 Aplicamos guards de role nas operações de notas e comprovantes.
🔹 Gravamos `ownerUid` em criações para suportar escopo.
🔹 Isolamos cache local com chave por UID.
✔️ Benefícios:
- Reforça privacidade de arquivos e metadados financeiros.
- Padroniza rastreabilidade de autoria.
- Reduz conflito de dados entre contas no fallback local.

----

29. Isolamento e Segurança em Documentações
* Atualizamos `documentacoesService.ts` com validações, guards de role e ownerUid nas criações.
🔹 Isolamos armazenamento local por usuário.
🔹 Aplicamos validações de nome e número de documento antes de persistir.
🔹 Incluímos `ownerUid` em documentos e treinamentos novos.
✔️ Benefícios:
- Melhora governança de documentos de validade.
- Reduz risco de mistura de dados entre contas.
- Fortalece consistência para alertas e relatórios.

----

30. Endurecimento do Módulo de Colaboradores
* Evoluímos `colaboradorService.ts` com autorização por role, validações e escopo local por UID.
🔹 Aplicamos `assertRole` em CRUD.
🔹 Validamos nome e CPF em criação.
🔹 Gravamos `ownerUid` em novos registros e isolamos localStorage por usuário.
✔️ Benefícios:
- Aumenta qualidade cadastral.
- Diminui risco de edição indevida.
- Evita compartilhamento local entre sessões diferentes.

----

31. Isolamento de Boletins por Dono no Serviço
* Ajustamos `boletimMedicaoService.ts` para usar `getDataScope` e reforçar ownership.
🔹 Gravamos `ownerUid` e `criadoPor` com UID real na criação.
🔹 Validamos acesso no `getById` para impedir leitura indevida por não privilegiado.
🔹 Encadeamos verificações em atualização e remoção com validação de existência/acesso.
✔️ Benefícios:
- Reduz exposição cruzada de boletins.
- Eleva precisão de autoria e rastreabilidade.
- Mantém comportamento gerencial para perfis autorizados.

----

32. Isolamento de Lançamentos no Caderno Virtual
* Evoluímos `cadernoVirtualService.ts` com filtro por ownerUid, checks de propriedade e escopo local por usuário.
🔹 Aplicamos `getDataScope` em listagem, criação e manutenção.
🔹 Gravamos `ownerUid` na criação e filtramos consultas para usuários não privilegiados.
🔹 Validamos dono antes de update, updateStatus, delete e remoção de anexo.
✔️ Benefícios:
- Impede acesso cruzado entre contas em lançamentos diários.
- Preserva visão ampla para papéis de gestão.
- Aumenta segurança em operações de alteração.

----

33. Escopo de Dono em Prêmios de Produtividade
* Atualizamos `premioProdutividadeService.ts` para aplicar owner scope em listagens, histórico, estatísticas e exportações.
🔹 Introduzimos `ownerUid` no payload de criação.
🔹 Aplicamos filtros condicionais por privilégio em consultas e fallback de índice.
🔹 Mantivemos relatórios funcionais com filtragem em memória quando necessário.
✔️ Benefícios:
- Melhora isolamento de dados de premiações.
- Preserva desempenho com estratégias de fallback.
- Aumenta confiabilidade de indicadores por conta.

----

34. Escopo de Dono em Relatórios Consolidados
* Evoluímos `relatoriosService.ts` com `DataScope` propagado para consultas de prêmios, boletins e recebimentos.
🔹 Inserimos constraints dinâmicos com `ownerUid` para usuários não privilegiados.
🔹 Mantivemos fluxo de consolidação e exportação sem alterar UX principal.
🔹 Garantimos coerência entre dados reportados e permissões de acesso.
✔️ Benefícios:
- Evita que relatórios mostrem dados de outras contas.
- Fortalece confiança de métricas operacionais.
- Alinha camada analítica ao modelo de autorização.

----

35. Fortalecimento do Serviço de Notificações
* Reforçamos `notificacaoService.ts` com guardas de autenticação, owner e role em operações críticas.
🔹 Aplicamos `assertAuthenticated`, `assertOwnerOrRole` e `assertRole` conforme o caso.
🔹 Protegemos ações de lote, estatísticas, configurações e notificações específicas.
🔹 Preservamos envio de e-mail assíncrono com contexto de usuário autenticado.
✔️ Benefícios:
- Eleva privacidade e controle de notificações.
- Evita manipulação de dados de terceiros.
- Melhora consistência de autorização em todo o módulo.

----

36. Criação de Testes Unitários do Serviço de Segurança
* Criamos `securityService.test.ts` para validar utilitários de entrada e regras de saneamento.
🔹 Testamos validação de string obrigatória, e-mail, role e número positivo.
🔹 Confirmamos mensagens esperadas para cenários inválidos.
🔹 Estabelecemos base de regressão para novas validações.
✔️ Benefícios:
- Reduz risco de regressão em validações centrais.
- Aumenta confiança na camada de proteção de payload.
- Facilita evolução segura do serviço.

----

37. Estabilização dos Testes com Novos Requisitos de Segurança
* Ajustamos os testes de serviços para refletir dependências de autenticação e autorização introduzidas.
🔹 Atualizamos mocks de `firebaseconfig` com `auth.currentUser` em `financeiroService.test.ts`, `documentosFinanceirosService.test.ts` e `notificacaoService.test.ts`.
🔹 Mockamos `securityService` nesses testes para isolar cenários unitários sem depender de perfil real no Firestore.
🔹 Corrigimos assertivas do financeiro para a nova chave de localStorage escopada por usuário.
✔️ Benefícios:
- Diminui falsos negativos na suíte após hardening de segurança.
- Mantém testes aderentes ao contrato atual dos serviços.
- Melhora velocidade de diagnóstico em futuras mudanças.
