interface ResendContactResult {
  id?: string;
  error?: string;
}

export async function addToResendAudience(
  apiKey: string,
  audienceId: string,
  email: string,
): Promise<ResendContactResult> {
  try {
    const res = await fetch(
      `https://api.resend.com/audiences/${audienceId}/contacts`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, unsubscribed: false }),
      },
    );
    if (!res.ok) {
      return { error: `Resend ${res.status}` };
    }
    const data = (await res.json()) as { id?: string };
    return { id: data.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'unknown' };
  }
}

export async function getResendContact(
  apiKey: string,
  audienceId: string,
  email: string,
): Promise<{ exists: boolean; id?: string }> {
  try {
    const res = await fetch(
      `https://api.resend.com/audiences/${audienceId}/contacts/${encodeURIComponent(email)}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` },
      },
    );
    if (res.status === 404) return { exists: false };
    if (!res.ok) return { exists: false };
    const data = (await res.json()) as { data?: { id?: string } | null; id?: string };
    const id = data?.data?.id ?? data?.id;
    return { exists: Boolean(id), id };
  } catch {
    return { exists: false };
  }
}
