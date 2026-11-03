import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // better-sqlite3 é um módulo nativo: fica fora do bundle do servidor.
  serverExternalPackages: ['better-sqlite3'],
  poweredByHeader: false,
  // O `next dev` geraria um AGENTS.md com instruções para agentes de IA; ver D-29.
  agentRules: false,
}

export default nextConfig
