import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & {
      customerId?: string;
      provider?: string;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    customerId?: string;
    provider?: string;
  }
}
