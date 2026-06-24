import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Vk from "next-auth/providers/vk";
import Yandex from "next-auth/providers/yandex";
import { linkAuthIdentity } from "@/lib/auth/customers";
import { updateCustomerProfile } from "@/lib/account/profile";

function isProviderEmailVerified(provider: string, profileEmailVerified: unknown) {
  if (provider === "google") return profileEmailVerified === true;

  // Yandex and VK providers used by Auth.js return an email only through
  // explicit OAuth email scopes, but do not expose a separate verification flag.
  return provider === "yandex" || provider === "vk";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google, Yandex, Vk],
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
