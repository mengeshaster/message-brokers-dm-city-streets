import { config } from '../shared/config';

export async function assertTopology(ch: any) {
  await ch.assertExchange(config.exchange, 'direct', { durable: true });

  // DLQ
  await ch.assertQueue(config.dlq, { durable: true });
  await ch.bindQueue(config.dlq, config.exchange, config.dlq);

  // Main work queue: dead-letters to DLQ
  await ch.assertQueue(config.queue, {
    durable: true,
    deadLetterExchange: config.exchange,
    deadLetterRoutingKey: config.dlq,
  });
  await ch.bindQueue(config.queue, config.exchange, config.routeKey);

  // Retry 1m: expires → DLX back to main
  await ch.assertQueue(config.retry1m, {
    durable: true,
    arguments: {
      'x-message-ttl': 60_000,
      'x-dead-letter-exchange': config.exchange,
      'x-dead-letter-routing-key': config.routeKey,
    },
  });
  await ch.bindQueue(config.retry1m, config.exchange, config.retry1m);

  // Retry 5m
  await ch.assertQueue(config.retry5m, {
    durable: true,
    arguments: {
      'x-message-ttl': 300_000,
      'x-dead-letter-exchange': config.exchange,
      'x-dead-letter-routing-key': config.routeKey,
    },
  });
  await ch.bindQueue(config.retry5m, config.exchange, config.retry5m);
}