import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import dbConnect from "./db";
import User from "@/models/User";
import bcryptjs from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const { email, password } = credentials as {
          email: string;
          password: string;
        };

        if (!email || !password) {
          throw new Error("Email and password are required");
        }

        // Admin credentials check
        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
          // Find or create the user in DB to get a valid mongoose ObjectId
          await dbConnect();
          let user = await User.findOne({ email: process.env.ADMIN_EMAIL });
          if (!user) {
            // fallback if not seeded
            const hashedPassword = await bcryptjs.hash(process.env.ADMIN_PASSWORD!, 10);
            user = await User.create({
              name: "Admin User",
              email: process.env.ADMIN_EMAIL!,
              password: hashedPassword,
            });
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            image: user.image || null,
          };
        }

        throw new Error("Invalid email or password");
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
