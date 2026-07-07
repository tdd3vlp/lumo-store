import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// VK ID returns a `device_id` on the OAuth callback that its token endpoint
// then requires. Auth.js does not forward it, so we copy it into a request
// header that the provider's customFetch reads during the token exchange.
// (Renamed from `middleware` to `proxy` — the Next.js 16 convention; behavior
// is identical.)
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/api/auth/callback/vk") {
    const deviceId = request.nextUrl.searchParams.get("device_id");
    if (deviceId) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-vk-device-id", deviceId);
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/auth/callback/vk"],
};
