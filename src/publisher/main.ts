#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { StreetsService } from '../services/StreetsService';
import { connectRabbit, closeRabbit } from '../mq/rabbit';
import { assertTopology } from '../mq/topology';
import { config } from '../shared/config';
import { log } from '../shared/logger';
import { cities, city } from '../utils/cities-source/cities';

(async () => {
  const argv = await yargs(hideBin(process.argv))
    .command('$0 <city>', 'Publish streets for a specific city', y =>
      y.positional('city', {
        type: 'string',
        demandOption: true,
        describe: 'City name from the available cities list',
        choices: Object.keys(cities)
      })
    )
    .option('list-cities', {
      alias: 'l',
      type: 'boolean',
      describe: 'List all available cities'
    })
    .help().argv as any;

  // Handle list cities option
  if (argv.listCities) {
    log.info('Available cities:');
    Object.keys(cities).forEach(city => {
      console.log(`  - ${city}`);
    });
    return;
  }

  const cityName = argv.city as city;

  // Validate city exists
  if (!cities[cityName]) {
    log.error(`City "${cityName}" not found. Use --list-cities to see available options.`);
    process.exit(1);
  }

  log.info(`Starting street publishing for city: ${cityName}`);

  const { ch, conn } = await connectRabbit();
  await assertTopology(ch);

  try {
    // Query StreetsService for all streets of the specified city
    const result = await StreetsService.getStreetsInCity(cityName);
    log.info(`Fetched ${result.streets.length} streets for ${cityName}`);

    // Optional batching for performance
    const BATCH_SIZE = 500;
    let publishedCount = 0;

    for (let i = 0; i < result.streets.length; i += BATCH_SIZE) {
      const batch = result.streets.slice(i, i + BATCH_SIZE);

      for (const street of batch) {
        const message = {
          cityCode: street.cityCode,
          cityName: street.cityName,
          streetCode: street.streetCode,
          streetName: street.streetName,
          region: street.region,
          district: street.district,
          additionalMeta: street.additionalMeta,
          updatedAt: street.updatedAt,
          createdAt: street.createdAt,
          publishedAt: new Date().toISOString(),
        };

        ch.publish(
          config.exchange,
          config.routeKey,
          Buffer.from(JSON.stringify(message)),
          { contentType: 'application/json', persistent: true }
        );

        publishedCount++;
      }

      // Wait for confirmations and add small delay between batches
      await ch.waitForConfirms?.().catch(() => {
        log.error('Message confirmation failed');
      });

      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay

      log.info(`Published ${Math.min(i + BATCH_SIZE, result.streets.length)}/${result.streets.length} streets`);
    }

    log.info(`✅ Successfully published ${publishedCount} streets for ${cityName}`);

  } catch (error) {
    log.error(`❌ Failed to publish streets for ${cityName}:`, error);
    process.exit(1);
  } finally {
    await closeRabbit();
  }

  log.info('🎉 Publishing completed successfully');
})();
