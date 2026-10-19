# Auditoria — Gerenciador de Vida

## Escopo e evidências

Projeto real inspecionado no ambiente Lovable. Não foi possível consultar a configuração, logs ou deployment externo da Vercel, nem confirmar a branch/commit do GitHub em produção. Não houve merge, publicação ou alteração dos dados do usuário: os testes de navegador usaram um contexto isolado com dados criados pela própria interface.

Arquivos examinados: package.json, bun.lock, vite.config.ts, tsconfig.json, vitest.config.ts, eslint.config.js, configurações Prettier, AGENTS.md, src/router.tsx, src/start.ts, src/server.ts, src/routeTree.gen.ts, src/routes/__root.tsx, index.tsx, financas.tsx, rotina.tsx, treinos.tsx, ajustes.tsx, assistente.tsx, api/chat.ts; src/components/AppShell.tsx e componentes de formulário, botão, navegação, diálogo e suporte relacionados; src/lib/store.ts, ai.server.ts, ai-actions.ts, home-metrics.ts, tratamento de erros e testes. O inventário de arquivos também foi conferido. Não se afirma revisão manual linha a linha de todos os componentes de interface não utilizados.

## Problemas comprovados e correções

### Alta: importação aceitava registros inválidos
O backup só exigia transactions como array. Um arquivo com tasks: [null] ou financeGoals inválido substituía os dados e poderia causar exceções ao renderizar as telas. Adicionada validação dos registros de todos os módulos antes da substituição, com limite de 10 MB. Backups antigos sem os arrays opcionais continuam compatíveis. Valores acumulados acima da meta são preservados. Nenhum valor inicial ou contribuição é inferido.

### Alta: persistência podia falhar após mudar o estado em memória
setState alterava o estado antes de localStorage.setItem. Uma falha de quota/permissão poderia interromper a ação e deixar a memória divergente dos dados gravados. Agora a gravação acontece antes de publicar o estado; falhas têm aviso e não reportam sucesso. Dados locais ilegíveis são preservados, e novas gravações/exportações ficam bloqueadas até uma restauração válida.

### Alta: /metas retornava 404
O arquivo metas.tsx mencionado no pedido não existia nesta cópia do projeto. A árvore estava coerente com os arquivos presentes: não era um caso comprovado de geração desatualizada. Criada a rota /metas reutilizando a tela financeira existente, com criação, edição, exclusão e registro de valores guardados. O menu foi ligado à rota. O watcher oficial do TanStack gerou a árvore automaticamente; ela inclui /metas e /api/chat, sem edição manual.

### Média: pagamentos de dívidas acima do saldo
O valor pago era limitado no saldo da dívida, mas a despesa lançada usava o valor integral informado, criando divergência. Pagamentos acima do saldo restante são rejeitados com aviso.

### Média: data de tarefas e entradas propostas pela IA
Concluir uma tarefa na Home trocava sua data por hoje. Agora a data é preservada, como na Rotina. Datas impossíveis e horários como 29:90 eram aceitos na validação de ações da IA; agora são rejeitados, assim como séries/repetições fracionárias.

### Média: entrada do chat sem validação suficiente
JSON null poderia gerar erro ao acessar messages; histórico e registros malformados não eram validados antes do SDK. Adicionada validação oficial validateUIMessages, máximo de 40 mensagens, 8.000 caracteres por parte de texto, 128 KiB de corpo contado durante a leitura e bloqueio de origem cruzada. Resposta para modelo indisponível (404) agora é compreensível. Provider, endpoint, prompts e confirmação no aparelho foram preservados.

### Baixa: erros de lint e textos de contingência
Corrigidos 509 erros de formatação identificados pelo lint, sem desativar regras. Permanecem seis avisos de Fast Refresh nos componentes de interface do template, sem impacto impeditivo de compilação. Mensagens de página inexistente/erro foram traduzidas para português. Metadados de cada página foram completados.

## Entrega visual já solicitada
Home e navegação foram renovadas antes da auditoria: barra flutuante com IA à direita, resumo mensal, gráfico derivado de dados reais, assistente, score diário, hábitos marcáveis, vencimentos e metas preservadas. Ajustes ficam disponíveis no topo da Home, e Treinos continua no menu. A caixa de mensagem foi reposicionada para não sobrepor a nova barra.

## Arquivos modificados
- AppShell.tsx, styles.css, index.tsx: entrega visual e interações da Home.
- financas.tsx, metas.tsx: reutilização das metas, edição e correção de pagamento de dívida.
- store.ts, data-validation.ts: validação e persistência atômica de backups.
- home-metrics.ts: score diário e alternância imutável de hábitos.
- ai.server.ts, ai-actions.ts: validação comprovadamente necessária e mensagem de indisponibilidade.
- assistente.tsx: posição da caixa de mensagem e metadados; sem reconstrução do chat.
- __root.tsx, rotina.tsx, treinos.tsx, ajustes.tsx: metadados, contingência em português e/ou formatação.
- Componentes ui/badge, button, form, navigation-menu, sidebar, toggle: somente correções de formatação apontadas pelo lint.
- Testes ai-server, ai-actions, store, home-metrics, app-routing: regressões e regras de preservação.
- routeTree.gen.ts: atualização automática do TanStack.
- AGENTS.md, roadmap.md: convenções e acompanhamento das entregas.

## Testes executados
- bun install --frozen-lockfile --ignore-scripts: 640 instalações verificadas, nenhuma alteração necessária no lockfile.
- bun run lint: zero erros, seis avisos de Fast Refresh.
- bunx vitest run: 13 testes passaram em cinco arquivos.
- Compilação e verificação TypeScript automáticas do ambiente: último resultado build OK. Não foram executados manualmente npm run build nem tsc --noEmit, conforme as restrições deste ambiente; isso não equivale a verificar o build externo da Vercel.
- Playwright no celular 411×665 e desktop 1280×1800: sem exceções de página nos fluxos testados e sem rolagem horizontal nas páginas conferidas.
- Hábitos: criar, marcar, recarregar, conferir e desmarcar pela Home.
- Metas: acesso pelo menu, criar com R$ 100 iniciais, adicionar R$ 50, conferir R$ 150, editar e recarregar.
- Finanças: criar e consultar lançamento de R$ 45, conta de R$ 100 e dívida de R$ 300.
- Rotina: criar, editar, concluir e excluir tarefa.
- Treinos: criar plano com exercício, registrar treino e consultar histórico.
- Backup: exportar dados reais de teste, rejeitar arquivo com registro inválido sem alteração dos dados, restaurar o exportado e comparar o JSON gravado.
- IA: abrir chat, enviar mensagem e conferir aviso de chave ausente sem quebrar a página. Teste unitário comprova que uma proposta não grava dados até apply ser chamado; após apply, a despesa de R$ 45 é persistida. Confirmação com resposta real do Gemini não foi verificada.

## Limitações e verificações externas pendentes
- GEMINI_API_KEY não está disponível neste ambiente. Não houve inferência real do Gemini nesta auditoria. Na Vercel, verificar a variável no ambiente e branch do deployment que recebe /api/chat, e fazer novo deployment após a alteração.
- O padrão solicitado é gemini-2.0-flash; GEMINI_MODEL, quando definido, tem precedência. Disponibilidade do modelo na conta Google não foi confirmada. Nenhum modelo alternativo foi sondado/substituído.
- Limites de corpo/histórico e origem não equivalem a autenticação ou rate limiting distribuído. Em publicação pública, limitar tráfego/quota na infraestrutura/provedor continua necessário; não foi inventada autenticação.
- Não existem initialAmount ou contributions na estrutura atual. currentAmount é o saldo acumulado canônico. Existe registro de novos valores guardados, mas não histórico individual de contribuições. Não foi introduzida migração especulativa nem fabricado histórico.
- Não foi encontrado módulo dedicado de lembretes/notificações do sistema; os avisos visuais usam as contas pendentes. Não se afirma que push notifications foram testadas.
- Resultados de segurança disponíveis não têm achados, mas estão desatualizados e não incluem auditoria profunda recente. Executar nova análise na aba Segurança. Não se declara o projeto seguro com base nesses resultados.
- Dados continuam somente neste navegador/aparelho; não há autenticação de usuários, banco remoto ou sincronização entre dispositivos.

Os testes demonstram preservação dos dados dos módulos e restauração válida no ambiente de teste; não demonstram o estado dos dados particulares de um aparelho do usuário, nem a configuração do deployment externo.