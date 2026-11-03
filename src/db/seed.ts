/**
 * `npm run seed`: recria a massa de dados fictícia no banco de RETALHO_DB_PATH (RNF-03).
 */
import { databasePath } from './client'
import { seedDatabase } from './seed-data'

const summary = seedDatabase()
console.log(
  `Seed do Retalho em ${databasePath()}: ${summary.products} produtos, ` +
    `${summary.customers} clientes, ${summary.orders} pedidos e ${summary.invoices} notas.`,
)
