import 'dotenv/config';

export const config = {
  mongoUri: process.env.MONGO_URI!,
  rabbitUri: process.env.RABBITMQ_URI!,
  exchange: process.env.EXCHANGE_NAME!,
  queue: process.env.QUEUE_NAME!,
  routeKey: process.env.ROUTE_KEY!,
  dlq: process.env.DLQ_NAME!,
  retry1m: process.env.RETRY_1M_NAME!,
  retry5m: process.env.RETRY_5M_NAME!,
  prefetch: Number(process.env.PREFETCH!),
  streetsApiUrl: process.env.STREET_API_URL!,
  streetsApiResource: process.env.STREET_API_RESOURCE!,
};
