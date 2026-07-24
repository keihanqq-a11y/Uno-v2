import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email().max(255),
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores"),
  displayName: z.string().min(2).max(32),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Za-z]/, "Password must include a letter")
    .regex(/[0-9]/, "Password must include a number"),
});

export const loginSchema = z.object({
  emailOrUsername: z.string().min(1).max(255),
  password: z.string().min(1).max(128),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Za-z]/, "Password must include a letter")
    .regex(/[0-9]/, "Password must include a number"),
});

export const profileUpdateSchema = z.object({
  displayName: z.string().min(2).max(32).optional(),
  bio: z.string().max(280).optional(),
});

export const createLobbySchema = z.object({
  maxPlayers: z.number().int().min(2).max(5),
  mode: z.enum(["PRIVATE", "PUBLIC"]),
  allowSpectators: z.boolean().default(true),
  stakeUsd: z.number().min(0).max(10000).optional(),
});

export const chatSchema = z.object({
  content: z.string().min(1).max(500),
});
