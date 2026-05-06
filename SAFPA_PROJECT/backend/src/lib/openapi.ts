import type { ListedEndpoint } from './routeCatalog';

type OpenApiOperation = {
  summary: string;
  tags: string[];
  responses: {
    '200': {
      description: string;
    };
  };
};

type OpenApiDocument = {
  openapi: '3.0.3';
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  tags: Array<{
    name: string;
    description: string;
  }>;
  paths: Record<string, Record<string, OpenApiOperation>>;
};

type ModuleTag = {
  name: string;
  description: string;
};

const MODULE_TAGS: Array<{ prefix: string; tag: ModuleTag }> = [
  {
    prefix: '/api/health',
    tag: {
      name: 'System',
      description: 'Health and runtime endpoints for the backend service.',
    },
  },
  {
    prefix: '/api/auth',
    tag: {
      name: 'Authentication',
      description: 'Login and session resolution endpoints.',
    },
  },
  {
    prefix: '/api/parlours',
    tag: {
      name: 'Parlour Management',
      description: 'Parlour setup, branding, status, and website-related endpoints.',
    },
  },
  {
    prefix: '/api/branches',
    tag: {
      name: 'Branch Management',
      description: 'Branch creation, updates, and branch status operations.',
    },
  },
  {
    prefix: '/api/users',
    tag: {
      name: 'User Administration',
      description: 'User account management and role-based operations.',
    },
  },
  {
    prefix: '/api/products',
    tag: {
      name: 'Product Catalog',
      description: 'Product and offering management for parlours.',
    },
  },
  {
    prefix: '/api/leads',
    tag: {
      name: 'Lead Management',
      description: 'Lead capture, qualification, and conversion workflows.',
    },
  },
  {
    prefix: '/api/members',
    tag: {
      name: 'Member Management',
      description: 'Member records, imports, and membership-related operations.',
    },
  },
  {
    prefix: '/api/policies',
    tag: {
      name: 'Policy Administration',
      description: 'Policy creation, updates, imports, and payment posting operations.',
    },
  },
  {
    prefix: '/api/payments',
    tag: {
      name: 'Collections & Payments',
      description: 'Payment capture, reconciliation imports, and billing event operations.',
    },
  },
  {
    prefix: '/api/templates',
    tag: {
      name: 'Template Management',
      description: 'Communication template creation and maintenance.',
    },
  },
  {
    prefix: '/api/communications',
    tag: {
      name: 'Communications',
      description: 'Outbound communications and reminder automation endpoints.',
    },
  },
  {
    prefix: '/api/documents',
    tag: {
      name: 'Document Management',
      description: 'Document upload, download, and storage lifecycle operations.',
    },
  },
  {
    prefix: '/api/funeral-cases',
    tag: {
      name: 'Funeral Operations',
      description: 'Funeral case workflow, tasks, staffing, vehicles, and milestones.',
    },
  },
  {
    prefix: '/api/reports',
    tag: {
      name: 'Reporting & Analytics',
      description: 'Operational dashboards, exports, and analytical reporting endpoints.',
    },
  },
  {
    prefix: '/api/audit',
    tag: {
      name: 'Audit & Compliance',
      description: 'Audit trail visibility and compliance-oriented records.',
    },
  },
  {
    prefix: '/api/resources',
    tag: {
      name: 'Resource Library',
      description: 'Shared SAFPA resources and managed content assets.',
    },
  },
  {
    prefix: '/api/subscriptions',
    tag: {
      name: 'Subscription Administration',
      description: 'Subscription listing, creation, updates, and lifecycle management.',
    },
  },
  {
    prefix: '/api/routes',
    tag: {
      name: 'Developer Tools',
      description: 'Development-only route discovery and API inspection endpoints.',
    },
  },
];

function toOpenApiPath(pathname: string): string {
  return pathname.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

function toTag(pathname: string): ModuleTag {
  const matchingTag = MODULE_TAGS.find(({ prefix }) => pathname.startsWith(prefix));
  if (matchingTag) {
    return matchingTag.tag;
  }

  return {
    name: 'General',
    description: 'Endpoints that do not yet have a business module mapping.',
  };
}

function toSummary(method: string, pathname: string): string {
  return `${method} ${pathname}`;
}

export function createOpenApiDocument(endpoints: ListedEndpoint[], serverUrl: string): OpenApiDocument {
  const paths: OpenApiDocument['paths'] = {};
  const tags = new Map<string, string>();

  for (const endpoint of endpoints) {
    if (endpoint.path.startsWith('/api/docs')) {
      continue;
    }

    const openApiPath = toOpenApiPath(endpoint.path);
    const tag = toTag(endpoint.path);

    tags.set(tag.name, tag.description);
    paths[openApiPath] = paths[openApiPath] || {};

    const normalizedMethod = endpoint.method.toLowerCase();
    paths[openApiPath][normalizedMethod] = {
      summary: toSummary(endpoint.method, endpoint.path),
      tags: [tag.name],
      responses: {
        '200': {
          description: 'Successful response',
        },
      },
    };
  }

  return {
    openapi: '3.0.3',
    info: {
      title: 'SAFPA Backend API',
      version: '1.0.0',
      description: 'Generated API reference for the SAFPA backend running on localhost.',
    },
    servers: [
      {
        url: serverUrl,
        description: 'Local development server',
      },
    ],
    tags: Array.from(tags.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, description]) => ({ name, description })),
    paths,
  };
}