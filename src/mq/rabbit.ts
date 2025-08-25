// rabbit.ts
import amqp from 'amqplib';
import { config } from '../shared/config';
import { log } from '../shared/logger';

let conn: any;
let ch: any;

export async function connectRabbit() {
  if (conn && ch) return { conn, ch };

  conn = await amqp.connect(config.rabbitUri);
  ch = await conn.createChannel();

  log.info('RabbitMQ connected');
  return { conn, ch };
}

export async function closeRabbit() {
  if (ch) {
    await ch.close();
  }
  if (conn) await conn.close();
}
