import { nanoid } from "nanoid";
import { createClient } from "redis";

let client: ReturnType<typeof createClient> | null = null;

async function getClient() {
  if (!client) {
    client = createClient({
      url: process.env.REDIS_URL ?? "redis://localhost:6379",
    });

    client.on("error", (err: unknown) =>
      console.log("Redis Client Error", err),
    );

    await client.connect();
  }
  return client
}

export async function createLink(link: string) {
  const client = await getClient();
  const id = nanoid(6);
  await client.set(`link:${id}`, link);
  return id;
}

export async function getURL(linkId: string) {
  const client = await getClient();
  const url = await client.get(`link:${linkId}`);
  return url;
}
