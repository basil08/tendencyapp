import NextAuth from "next-auth"
import "next-auth/jwt"

import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
// import Resend from "next-auth/providers/resend"
// import Nodemailer from "next-auth/providers/nodemailer"
import type { NextAuthConfig } from "next-auth"

import { PrismaAdapter } from "@auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"
import { Pool } from "@neondatabase/serverless"
import { PrismaNeon } from "@prisma/adapter-neon"

const pool = new Pool({
  connectionString: process.env.AUTH_POSTGRES_PRISMA_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const adapter = new PrismaNeon(pool);
const prisma = new PrismaClient({adapter});


const config = {
  theme: { logo: "/logo.png" },
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub,
    Google,
    // Resend,
    // Nodemailer({
    //   server: {
    //     host: process.env.EMAIL_SERVER_HOST,
    //     port: process.env.EMAIL_SERVER_PORT,
    //     auth: {
    //       user: process.env.EMAIL_SERVER_USER,
    //       pass: process.env.EMAIL_SERVER_PASSWORD,
    //     },
    //   },
    //   from: process.env.EMAIL_FROM,
    // }),
  ],
  basePath: "/auth",
  callbacks: {
    authorized({ request, auth }) {
      const { pathname } = request.nextUrl
      if (pathname === "/middleware-example") return !!auth
      return true
    },
    jwt({ token, trigger, session, account }) {
      if (trigger === "update") token.name = session.user.name
      if (account?.provider === "keycloak") {
        return { ...token, accessToken: account.access_token }
      }
      return token
    },
    async session({ session, token }) {
      if (token?.accessToken) {
        session.accessToken = token.accessToken
      }
      return session
    },
  },
  experimental: {
    enableWebAuthn: true,
  },
  debug: process.env.NODE_ENV !== "production" ? true : false,
} satisfies NextAuthConfig

export const { handlers, auth, signIn, signOut } = NextAuth(config)

declare module "next-auth" {
  interface Session {
    accessToken?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
  }
}
