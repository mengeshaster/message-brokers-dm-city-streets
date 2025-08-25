# City Streets Data Management System

A Node.js/TypeScript project for managing city streets data using MongoDB and RabbitMQ message broker. The system fetches street data from external APIs, publishes it to RabbitMQ queues, and processes it through a consumer worker for database storage.

## Architecture Overview

The system consists of two main components:

### Publisher (CLI)
- Searches from a predefined list of existing cities (2500+ Israeli cities)
- Validates city input against available cities in the system
- Fetches street data from external API (data.gov.il) for the matched city
- Publishes street messages to RabbitMQ exchange for the found city only
- Supports batch processing for large datasets (500 streets per batch)
- Provides city selection validation and listing capabilities

### Consumer Worker
- Consumes messages from RabbitMQ queue
- Processes and normalizes street data
- Stores data in MongoDB with upsert operations
- Implements retry mechanisms for failed messages

![Publisher Queue Consumer Components](src/assets/components%20Publisher-Queue-Consumer.png)

## Project Structure

```
src/
├── consumer/
│   └── worker.ts           # Message consumer and processor
├── publisher/
│   └── main.ts            # CLI publisher application
├── db/
│   ├── db-init.ts         # MongoDB connection
│   ├── models/
│   │   └── Street.ts      # Street data model
│   └── repositories/
│       └── Street.repo.ts # Database operations
├── mq/
│   ├── rabbit.ts          # RabbitMQ connection
│   └── topology.ts        # Queue/exchange configuration
├── services/
│   └── StreetsService.ts  # External API integration
├── shared/
│   ├── config.ts          # Configuration management
│   └── logger.ts          # Logging utilities
└── utils/
    └── cities-source/
        └── cities.ts      # Available cities list (2500+ cities)
```

## Prerequisites

- Node.js (v16 or higher)
- Docker and Docker Compose
- TypeScript

## Quick Start

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/mengeshaster/message-brokers-dm-city-streets.git
cd message-brokers-dm-city-streets
npm install
```

### 2. Environment Setup

If missing, then create a `.env` file in the root directory:

```env
MONGO_URI=mongodb://localhost:27017/city-streets
RABBITMQ_URI=amqp://guest:guest@localhost:5672
EXCHANGE_NAME=streets.x
QUEUE_NAME=streets.insert.q
ROUTE_KEY=streets.insert
DLQ_NAME=streets.insert.dlq
RETRY_1M_NAME=streets.insert.retry.1m
RETRY_5M_NAME=streets.insert.retry.5m
PREFETCH=10
STREET_API_URL=https://data.gov.il/api/3/action/datastore_search
STREET_API_RESOURCE=1b14e41c-85b3-4c21-bdce-9fe48185ffca
```

### 3. Start External Services

The project includes a `docker-compose.yml` file that defines the required external services (RabbitMQ and MongoDB).

To start the services using Docker Compose:

```bash
docker-compose up -d
```

This will start:

- **RabbitMQ**: Message broker with management UI
  - AMQP port: 5672
  - Management UI: <http://localhost:15672> (guest/guest)
- **MongoDB**: Database for storing street data
  - Port: 27017
  - Data persisted in Docker volume

To stop the services:

```bash
docker-compose down
```

To view service logs:

```bash
docker-compose logs rabbitmq
docker-compose logs mongo
```

### 4. Build the Project

```bash
npm run build
```

## Usage

### Development Mode (Auto-reload)

Start the consumer in development mode:
```bash
npm run dev:consumer
```

In another terminal, run the publisher:
```bash
npm run dev:publisher "Ashdod"
```

### Production Mode

Start the consumer:
```bash
npm run consumer
```

In another terminal, publish streets for a city:
```bash
npm run publisher "Ashdod"
```

### Available Commands

```bash
# List all available cities (2500+ Israeli cities)
npm run publisher --list-cities

# Publish streets for a specific city (must match exact city name)
npm run publisher "Jerusalem"
npm run publisher "Tel Aviv"
npm run publisher "Haifa"
npm run publisher "Ashdod"

# Development mode with auto-reload
npm run dev:consumer
npm run dev:publisher "CityName"
```

## System Flow

![Publisher Queue Consumer Sequence](src/assets/Sequence%20Publisher-Queue-Consumer.png)

### Publisher Process

1. **City Validation**: Publisher validates the provided city name against the predefined list of 2500+ Israeli cities
2. **City Search**: System searches for an exact match in the `cities` object from `cities.ts`
3. **Error Handling**: If city is not found, publisher exits with an error message
4. **Data Fetching**: For valid cities, `StreetsService.getStreetsInCity` fetches street data from data.gov.il API
5. **Batch Processing**: Streets are processed in batches of 500 for optimal performance
6. **Message Publishing**: Each street is published to `config.exchange` with `config.routeKey`
7. **Confirmation**: Publisher waits for RabbitMQ confirmations before proceeding

### Consumer Process

1. **Message Consumption**: `worker.ts` consumes messages from `config.queue`
2. **Data Validation**: Validates required fields (cityCode, streetCode, streetName)
3. **Data Normalization**: Normalizes street names and other data
4. **Database Upsert**: Uses `upsertStreet` to insert or update street records
5. **Error Handling**: Failed messages are sent to retry queues or DLQ

## City Selection Process

The publisher uses a predefined list of cities stored in `src/utils/cities-source/cities.ts`:

```typescript
export const cities = {
  [`Ashdod`]: `אשדוד               `,
  [`Jerusalem`]: `ירושלים            `,
  [`Tel Aviv`]: `תל אביב             `,
  // ... 2500+ more cities
};
```

### How City Matching Works:

1. **Input Validation**: The CLI accepts a city name as a positional argument
2. **City Lookup**: System searches for the exact city name in the `cities` object
3. **Hebrew Name Mapping**: Each English city name maps to its Hebrew equivalent for API calls
4. **API Query**: The Hebrew city name is used to filter streets from the government API
5. **Result Processing**: Only streets from the matched city are fetched and published

### Example City Validation:

```bash
# ✅ Valid - exact match
npm run publisher "Ashdod"

# ❌ Invalid - case sensitive
npm run publisher "ashdod"

# ❌ Invalid - not in predefined list
npm run publisher "NonExistentCity"

# 📋 List available options
npm run publisher --list-cities
```

## Message Structure

```typescript
{
  cityCode: string,
  cityName: string,
  streetCode: string,
  streetName: string,
  region: string,
  district: string,
  additionalMeta: object,
  updatedAt: string,
  createdAt: string,
  publishedAt: string
}
```

## Queue Management

### Monitoring Queues

Access RabbitMQ Management UI at http://localhost:15672 (guest/guest)

### Queue Operations

```bash
# List all queues
docker exec rabbitmq rabbitmqctl list_queues

# Purge main queue
docker exec rabbitmq rabbitmqctl purge_queue streets.insert.q

# Purge retry queues
docker exec rabbitmq rabbitmqctl purge_queue streets.insert.retry.1m
docker exec rabbitmq rabbitmqctl purge_queue streets.insert.retry.5m

# Purge dead letter queue
docker exec rabbitmq rabbitmqctl purge_queue streets.insert.dlq
```

## Configuration

Configuration is managed through `config.ts` which reads from environment variables:

- **MongoDB**: Connection URI and database settings
- **RabbitMQ**: Connection, exchange, queue, and routing configurations
- **External API**: Street data source URL and resource ID
- **Processing**: Batch sizes, retry intervals, prefetch limits

## Error Handling & Retry Logic

![Publisher Queue Consumer State Diagram](src/assets/State%20Publisher-Queue-Consumer.png)

The system implements a sophisticated retry mechanism:

1. **Initial Processing**: Messages are consumed from the main queue
2. **Failure Handling**: Failed messages are sent to TTL retry queues
3. **Retry Queues**: 
   - `streets.insert.retry.1m` - 1 minute TTL
   - `streets.insert.retry.5m` - 5 minute TTL
4. **Dead Letter Queue**: Messages that exceed retry limits are sent to DLQ
5. **Manual Reprocessing**: DLQ messages can be manually replayed

## Deployment

### Docker Production Setup

1. **Environment Configuration**: Update `.env` with production values
2. **Build Application**: `npm run build`
3. **Container Deployment**: Use provided `docker-compose.yml`
4. **Service Scaling**: Scale consumer instances based on load

### Alternative Docker Commands

```bash
# Start external services (using Docker)
docker run -d --name mongodb -p 27017:27017 mongo:latest
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

### Production Considerations

- **Resource Limits**: Configure appropriate memory and CPU limits
- **Queue Monitoring**: Set up alerts for queue depth and processing rates
- **Database Indexing**: Ensure proper indexes on cityCode and streetCode
- **Logging**: Configure centralized logging for monitoring and debugging

## Monitoring & Observability

- **RabbitMQ Management**: http://localhost:15672
- **Application Logs**: Structured logging via `logger.ts`
- **Queue Metrics**: Monitor queue depths, message rates, and processing times
- **Database Monitoring**: Track upsert operations and query performance

## Troubleshooting

### Common Issues

1. **City Not Found**: 
   ```bash
   # Error: City "InvalidCity" not found
   # Solution: Use --list-cities to see available options
   npm run publisher --list-cities
   ```

2. **Connection Failures**: Verify Docker services are running
   ```bash
   docker-compose ps
   ```

3. **Queue Buildup**: Check consumer processing rate and scale if needed
4. **API Rate Limits**: Monitor external API response times and errors
5. **Database Performance**: Check MongoDB indexes and query performance

### Debug Commands

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs rabbitmq
docker-compose logs mongo

# Test connectivity
npm run dev:consumer  # Should connect to both services

# Validate city input
npm run publisher --list-cities | grep "CityName"
```

## Available Cities Sample

The system includes 2500+ Israeli cities. Some popular examples:

- Ashdod
- Jerusalem
- Tel Aviv
- Haifa
- Beersheba
- Netanya
- Petah Tikva
- Rishon LeZion

Use `npm run publisher --list-cities` to see the complete list.
