import NextAuth, { customFetch } from "next-auth";
import Google from "next-auth/providers/google";
import Yandex from "next-auth/providers/yandex";
import type { OAuthConfig } from "next-auth/providers";
import { headers } from "next/headers";
import { linkAuthIdentity } from "@/lib/auth/customers";
import { updateCustomerProfile } from "@/lib/account/profile";

interface VkIdProfile {
  user_id?: string | number;
  id?: string | number;
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar?: string;
  photo_200?: string;
  locale?: string;
}

// VK ID (OAuth 2.1) — https://id.vk.com.
// Non-standard vs. plain OAuth:
//  - authorize endpoint is /authorize, token endpoint is /oauth2/auth
//  - PKCE is mandatory; we use PKCE-only because VK corrupts the Auth.js JWE
//    `state` value (it strips the dots the encrypted token needs)
//  - the token exchange requires the `device_id` VK returns on the callback,
//    which the middleware bridges to us via the `x-vk-device-id` header
//  - user_info is a POST with client_id + access_token in the body
function VkId(): OAuthConfig<VkIdProfile> {
  return {
    id: "vk",
    name: "VK ID",
    type: "oauth",
    clientId: process.env.AUTH_VK_ID!,
    clientSecret: process.env.AUTH_VK_SECRET!,
    client: { token_endpoint_auth_method: "client_secret_post" },
    authorization: {
      url: "https://id.vk.com/authorize",
      params: { scope: "email vkid.personal_info" },
    },
    token: {
      url: "https://id.vk.com/oauth2/auth",
      // VK returns a non-OIDC id_token (uses "iis" instead of "iss", no "aud")
      // that oauth4webapi would try to validate and reject. Drop it — we read
      // the profile from the user_info endpoint instead.
      async conform(response: Response) {
        const data = await response.json();
        delete data.id_token;
        return new Response(JSON.stringify(data), {
          status: response.status,
          statusText: response.statusText,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
    userinfo: {
      url: "https://id.vk.com/oauth2/user_info",
      async request({
        tokens,
      }: {
        tokens: { access_token?: string; email?: string };
      }) {
        const res = await fetch("https://id.vk.com/oauth2/user_info", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.AUTH_VK_ID!,
            access_token: tokens.access_token ?? "",
          }),
        });
        const data = await res.json();
        const user = data.user ?? data;
        // Fall back to the token response email if user_info omits it.
        if (!user.email && typeof tokens.email === "string") {
          user.email = tokens.email;
        }
        return user;
      },
    },
    profile(profile) {
      return {
        id: String(profile.user_id ?? profile.id),
        name:
          [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
          null,
        email: profile.email ?? null,
        image: profile.avatar ?? profile.photo_200 ?? null,
      };
    },
    checks: ["pkce"],
    async [customFetch](...args: Parameters<typeof fetch>) {
      const [input, init] = args;
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;

      // Inject VK's device_id (required by the token endpoint) into the
      // grant request body. The middleware forwards it as a request header.
      if (
        url.startsWith("https://id.vk.com/oauth2/auth") &&
        init?.body instanceof URLSearchParams &&
        !init.body.has("device_id")
      ) {
        const deviceId = (await headers()).get("x-vk-device-id");
        if (deviceId) init.body.set("device_id", deviceId);
      }

      return fetch(...args);
    },
  };
}

function isProviderEmailVerified(
  provider: string,
  profileEmailVerified: unknown,
) {
  if (provider === "google") return profileEmailVerified === true;

  // Yandex and VK providers return an email only through explicit OAuth email
  // scopes and do not expose a separate verification flag.
  return provider === "yandex" || provider === "vk";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [Google, Yandex, VkId()],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/profile",
    error: "/profile",
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (!account || !profile?.email) return false;

      return isProviderEmailVerified(account.provider, profile.email_verified);
    },
    async jwt({ token, account, profile, user }) {
      if (!account || !profile) return token;

      const email = profile.email ?? user.email ?? token.email;
      if (!email) return token;
      const emailVerified = isProviderEmailVerified(
        account.provider,
        profile.email_verified,
      );

      const customerId = await linkAuthIdentity({
        provider: account.provider,
        providerSubject: account.providerAccountId,
        email,
        emailVerified,
      });

      token.customerId = customerId;
      token.provider = account.provider;

      if (profile.name || user.name) {
        await updateCustomerProfile(customerId, {
          displayName: profile.name ?? user.name,
          locale: profile.locale ?? "ru",
        });
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.customerId =
          typeof token.customerId === "string" ? token.customerId : undefined;
        session.user.provider =
          typeof token.provider === "string" ? token.provider : undefined;
      }

      return session;
    },
  },
});
