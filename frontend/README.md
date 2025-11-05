# Frontend - RacketApp

Aplicação React para gerenciamento de partidas de tênis com placar em tempo real.

## 🚀 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev                    # Inicia servidor de desenvolvimento
npm run build                  # Build para produção
npm run preview               # Preview do build

# Testes
npm test                      # Executa todos os testes unitários
npm run test:ui               # Interface visual dos testes
npm run test:coverage         # Executa testes com relatório de cobertura
npm run test:coverage:report  # Abre relatório de cobertura no navegador

# Testes por domínio
npm run test:scoring          # Testes da lógica de pontuação
npm run test:ui               # Testes dos componentes React
npm run test:integration      # Testes de integração

# Testes E2E
npm run test:e2e              # Testes end-to-end com Playwright
npm run test:e2e:ui           # Interface visual dos testes E2E

# Qualidade de código
npm run lint                  # Executa ESLint
```

## 📊 Cobertura de Testes

O projeto mantém uma cobertura mínima de **80%** em todas as métricas:

- **Linhas (lines)**: 80%
- **Funções (functions)**: 80%
- **Branches**: 80% (focado em lógica condicional crítica)
- **Statements**: 80%

### Thresholds Específicos

- **TennisScoring.ts**: 90% (lógica crítica de pontuação)
- **TennisConfigFactory.ts**: 85% (configurações de formatos)
- **Componentes React**: 75% (UI/UX)

### Como Verificar Cobertura

```bash
# Executar testes com cobertura
npm run test:coverage

# Ver relatório detalhado
npm run test:coverage:report
```

## 🏗️ Estrutura de Testes

```
src/tests/
├── mocks.ts              # Mocks centralizados para APIs
├── fixtures.ts           # Dados de teste consistentes
├── integration/          # Testes entre componentes
│   └── integration.test.tsx
├── scoring/              # Testes da lógica de negócio
│   ├── TennisScoring.test.ts
│   ├── TennisConfigFactory.test.ts
│   └── matrizUtils.test.ts
├── ui/                   # Testes de componentes React
│   ├── Dashboard.test.tsx
│   └── ScoreboardV2.test.tsx
└── e2e/                  # Testes end-to-end
    ├── dashboard.spec.ts
    └── cross-browser.spec.ts
```

## 🧪 Estratégia de Testes

### 1. Testes Unitários (scoring/)

- Lógica pura de pontuação
- Regras de negócio
- Utilitários e helpers
- Configurações

### 2. Testes de Componentes (ui/)

- Renderização correta
- Interações do usuário
- Acessibilidade
- Responsividade

### 3. Testes de Integração (integration/)

- Fluxos completos entre componentes
- Estados assíncronos
- Tratamento de erros
- Sincronização com backend

### 4. Testes E2E (e2e/)

- Cenários reais do usuário
- Compatibilidade cross-browser
- Regressões conhecidas
- Performance

## 🎯 Cenários de Teste Críticos

### Regras de Tênis

- Pontuação básica (0, 15, 30, 40)
- Deuce e vantagem
- Tie-breaks
- Diferentes formatos (BEST_OF_3, NO_AD, FAST4, etc.)

### Funcionalidades

- Criação de partidas
- Pontuação em tempo real
- Undo/correção
- Sincronização com backend
- Exibição de resultados

### Qualidade

- Acessibilidade (ARIA, navegação por teclado)
- Responsividade (mobile, tablet, desktop)
- Tratamento de erros
- Performance

## 🔧 Configuração de Desenvolvimento

### Pré-requisitos

- Node.js 18+
- npm ou yarn

### Instalação

```bash
npm install
```

### Configuração do Backend

Certifique-se de que o backend está rodando na porta 3000 (ou ajuste `API_URL` em `src/config/api.ts`).

## 📈 Relatórios de Cobertura

Os relatórios são gerados em `coverage/`:

- `coverage/index.html` - Relatório visual interativo
- `coverage/lcov-report/index.html` - Formato LCOV
- `coverage/coverage-final.json` - Dados JSON

## 🚨 CI/CD

Os testes são executados automaticamente em:

- Push para branches principais
- Pull requests
- Releases

Thresholds de cobertura devem ser atendidos para aprovação.

## 🐛 Debugging de Testes

### Testes Falhando

```bash
# Executar teste específico
npm test -- MyComponent.test.tsx

# Debug mode
npm test -- --inspect-brk MyComponent.test.tsx

# Verbose output
npm test -- --reporter=verbose
```

### Cobertura Baixa

```bash
# Ver linhas não cobertas
npm run test:coverage
# Abra coverage/index.html para ver detalhes
```

## 📚 Documentação Adicional

- [Vitest Docs](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Docs](https://playwright.dev/)
