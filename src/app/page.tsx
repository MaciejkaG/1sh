import { HomeClient } from "@/components/HomeClient";

export const dynamic = "force-dynamic";

export default function Home() {
  return <HomeClient sitekey={process.env.TURNSTILE_SITE_KEY!} />;
}
