import axios from "axios";

export async function verifyTurnstile(token: string) {
  const response = await axios.post(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    new URLSearchParams({
      secret: process.env.TURNSTILE_SECRET_KEY!,
      response: token,
    }).toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  const verifyResult = response.data?.success;

  return verifyResult;
}
