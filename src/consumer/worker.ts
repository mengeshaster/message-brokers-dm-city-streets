import { connectMongo, closeMongo } from '../db/db-init';
import { connectRabbit, closeRabbit } from '../mq/rabbit';
import { assertTopology } from '../mq/topology';
import { config } from '../shared/config';
import { log } from '../shared/logger';
import { upsertStreet } from '../db/repositories/Street.repo';

function normalizeName(n: string) {
  return n?.normalize('NFKC')?.trim()?.toLowerCase() || '';
}

(async () => {
  await connectMongo();
  const { ch } = await connectRabbit();
  await assertTopology(ch);
  await ch.prefetch(config.prefetch);

  ch.consume(config.queue, async (msg: any) => {
    if (!msg) return;

    try {
      const payload = JSON.parse(msg.content.toString());

      if (!payload.cityCode || !payload.streetCode || !payload.streetName) {
        throw new Error('Invalid payload');
      }

      const now = new Date();
      const doc = {
        cityCode: payload.cityCode,
        cityName: payload.cityName,
        streetCode: payload.streetCode,
        streetName: payload.streetName,
        streetNameNormalized: normalizeName(payload.streetName),
        region: payload.region,
        district: payload.district,
        additionalMeta: payload.additionalMeta ?? {},
        updatedAt: now,
        createdAt: now
      };

      await upsertStreet(doc);
      ch.ack(msg);
    } catch (err: any) {
      const deaths = (msg.properties.headers?.['x-death'] ?? []) as any[];
      const attempts = deaths?.[0]?.count ?? 0;
      const MAX_RETRIES = 5;

      log.error(`Processing failed (attempt ${attempts + 1}):`, err?.message);

      if (attempts >= MAX_RETRIES) {
        // Send to DLQ after max retries
        ch.publish(config.exchange, config.dlq, msg.content, {
          contentType: 'application/json',
          persistent: true,
          headers: {
            originalHeaders: msg.properties.headers,
            error: err?.message,
            failedAt: new Date().toISOString()
          }
        });

        ch.ack(msg);
        log.error('Moved to DLQ after max retries:', err?.message);
      } else if (attempts < 2) {
        // First retry: send to 1m retry queue
        ch.publish(config.exchange, config.retry1m, msg.content, {
          contentType: 'application/json',
          persistent: true,
          headers: {
            ...msg.properties.headers,
            'x-retry-count': attempts + 1
          }
        });

        ch.ack(msg);
        log.warn('Sent to 1m retry queue');
      } else {
        // Subsequent retries: send to 5m retry queue
        ch.publish(config.exchange, config.retry5m, msg.content, {
          contentType: 'application/json',
          persistent: true,
          headers: {
            ...msg.properties.headers,
            'x-retry-count': attempts + 1
          }
        });

        ch.ack(msg);
        log.warn('Sent to 5m retry queue');
      }
    }
  });

  const shutdown = async () => {
    log.info('Shutting down...');
    await closeRabbit().catch(() => { });
    await closeMongo().catch(() => { });
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})();
