import 'dotenv/config'
import { buildApp } from './app.js'

const app = buildApp()

async function start() {
  try {
    await app.listen({
      host: app.config.HOST,
      port: app.config.PORT,
    })
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}

await start()
