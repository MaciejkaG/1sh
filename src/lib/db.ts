import { nanoid } from "nanoid";
import { createClient } from "redis";

const client = createClient({
  url: process.env.REDIS_URL ?? "redis://localhost:6379",
});

client.on("error", (err) => console.log("Redis Client Error", err));

await client.connect();

export async function createLink(link: string) {
  const id = nanoid(6);
  await client.set(`link:${id}`, link);
  return id;
}

export async function getURL(linkId: string) {
  const url = await client.get(`link:${linkId}`);
  return url;
}