import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    'getting-started',
    'core-concepts',
    'architecture',
    {
      type: 'category',
      label: '💬 Conversational AI',
      items: [
        'conversational/response-system',
        'conversational/intent-classification',
        'conversational/confidence-scoring',
        'conversational/progress-tracking',
        'conversational/conversation-utilities',
      ],
    },
    {
      type: 'category',
      label: '🧠 Context & Memory',
      items: [
        'context-memory/context-management',
        'context-memory/memory-systems',
        'context-memory/embeddings',
      ],
    },
    {
      type: 'category',
      label: '🔄 Workflows',
      items: [
        'workflows/workflow-graphs',
        'workflows/checkpointing',
      ],
    },
    {
      type: 'category',
      label: '🏗️ Infrastructure',
      items: [
        'infrastructure/token-management',
        'infrastructure/llm-providers',
        'infrastructure/configuration',
        'infrastructure/observability',
      ],
    },
    {
      type: 'category',
      label: '🔧 Foundation',
      items: [
        'foundation/types',
        'foundation/validation',
        'foundation/utilities',
        'foundation/tools',
        'foundation/api',
      ],
    },
    {
      type: 'category',
      label: '🤖 Agent System',
      items: [
        'agents/overview',
        'agents/planner',
        'agents/executor',
        'agents/analyzer',
        'agents/summarizer',
        'agents/orchestrator',
        'agents/graphql-api',
        'agents/integration',
        'agents/testing',
      ],
    },
    {
      type: 'category',
      label: '📖 Guides',
      items: [
        'guides/environment-setup',
        'guides/testing',
        'guides/configuration',
        'guides/development',
      ],
    },
    'summary',
  ],
};

export default sidebars;
