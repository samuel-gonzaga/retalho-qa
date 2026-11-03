import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // better-sqlite3 é um módulo nativo: fica fora do bundle do servidor.
  serverExternalPackages: ['better-sqlite3'],
  poweredByHeader: false,
}

export default nextConfig
