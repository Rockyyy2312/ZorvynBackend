import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/shared/utils/password'
import { env } from './env'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID || 'placeholder',
      clientSecret: env.GOOGLE_CLIENT_SECRET || 'placeholder',
    }),
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const { email, password } = credentials as { email: string; password: string }
        if (!email || !password) return null

        const user = await prisma.user.findFirst({
          where: { email, deletedAt: null },
        })

        if (!user || !user.passwordHash) return null

        const valid = await verifyPassword(password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          isAdmin: user.isAdmin,
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const email = user.email
        if (!email) return false

        const providerAccountId = account.providerAccountId

        let dbUser = await prisma.user.findFirst({
          where: {
            OR: [{ googleId: providerAccountId }, { email }],
            deletedAt: null,
          },
        })

        if (dbUser) {
          if (!dbUser.googleId) {
            dbUser = await prisma.user.update({
              where: { id: dbUser.id },
              data: { googleId: providerAccountId },
            })
          }
          user.id = dbUser.id
          user.plan = dbUser.plan
          user.isAdmin = dbUser.isAdmin
          return true
        } else {
          const newUser = await prisma.user.create({
            data: {
              email,
              name: user.name || 'Google User',
              googleId: providerAccountId,
              avatarUrl: user.image,
              emailVerified: true,
              plan: 'FREE',
            },
          })
          user.id = newUser.id
          user.plan = newUser.plan
          user.isAdmin = newUser.isAdmin
          return true
        }
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id as string
        token.plan = (user.plan as string) || 'FREE'
        token.isAdmin = !!user.isAdmin
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string
        session.user.plan = token.plan as string
        session.user.isAdmin = token.isAdmin as boolean
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
    verifyRequest: '/verify-email',
  },
  session: { strategy: 'jwt' },
  secret: env.AUTH_SECRET,
})
