const { z } = require('zod');

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10)
});

const resetRequestSchema = z.object({
  email: z.string().email()
});

const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(6).max(128)
});

module.exports = {
  signupSchema,
  loginSchema,
  refreshSchema,
  resetRequestSchema,
  resetPasswordSchema
};
