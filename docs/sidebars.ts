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
      collapsed: true,
      items: [
        {
          type: 'doc',
          id: 'summary',
          label: '📘 Coming Soon - See Summary',
        },
      ],
    },
    {
      type: 'category',
      label: '🔄 Workflows',
      collapsed: true,
      items: [
        {
          type: 'doc',
          id: 'summary',
          label: '📘 Coming Soon - See Summary',
        },
      ],
    },
    {
      type: 'category',
      label: '🏗️ Infrastructure',
      collapsed: true,
      items: [
        {
          type: 'doc',
          id: 'summary',
          label: '📘 Coming Soon - See Summary',
        },
      ],
    },
    {
      type: 'category',
      label: '🔧 Foundation',
      collapsed: true,
      items: [
        {
          type: 'doc',
          id: 'summary',
          label: '📘 Coming Soon - See Summary',
        },
      ],
    },
    {
      type: 'category',
      label: '📖 Guides',
      collapsed: true,
      items: [
        {
          type: 'doc',
          id: 'summary',
          label: '📘 Coming Soon - See Summary',
        },
      ],
    },
    'summary',
  ],
};

export default sidebars;
