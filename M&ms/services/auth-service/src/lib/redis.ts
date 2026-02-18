import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;

// getRedisClient: Redis singleton connector.
// 1) Lazily creates a Redis client on first call (singleton).
// 2) Uses REDIS_URL or falls back to 'redis://redis:6379'.
// 3) Attaches an 'error' listener to log Redis connection/runtime errors.
// 4) Connects once and returns the connected client for reuse.
export async function getRedisClient(): Promise<RedisClientType> {
    if (!redisClient) {
        redisClient = createClient({
            url: process.env.REDIS_URL || 'redis://redis:6379',
        });

        redisClient.on('error', (err) => console.error('Redis error:', err));
        await redisClient.connect();
    }
    return redisClient;
}

// publishEvent: Pub/Sub publisher helper.
// 1) Ensures a connected Redis client exists.
// 2) Serializes the payload to JSON string.
// 3) Publishes the message to the given channel.
// 4) Resolves when Redis acknowledges the publish.
export async function publishEvent(channel: string, data: object): Promise<void> {
    const client = await getRedisClient();
    await client.publish(channel, JSON.stringify(data));
}

// subscribeToChannel: Pub/Sub subscriber helper.
// 1) Creates a dedicated subscriber connection via client.duplicate().
// 2) Connects the subscriber (separate connection is required for subscribe mode).
// 3) Subscribes to the channel and invokes callback for each message.
// 4) Keeps the subscriber connection open to continue receiving messages.
export async function subscribeToChannel(
    channel: string,
    callback: (message: string) => void
): Promise<void> {
    const subscriber = (await getRedisClient()).duplicate();
    await subscriber.connect();
    await subscriber.subscribe(channel, callback);
}

export default { getRedisClient, publishEvent, subscribeToChannel };