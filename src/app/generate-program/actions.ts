"use server";

export async function mockGenerateProgram(payload: any) {
  const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
  if (!convexSiteUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_SITE_URL is not set");
  }

  const response = await fetch(`${convexSiteUrl}/vapi/generate-program`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to generate program: ${errorText}`);
  }

  return await response.json();
}
