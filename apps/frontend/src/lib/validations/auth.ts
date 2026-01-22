import { z } from 'zod';

// Password validation regex
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

export const loginSchema = z.object({
  email: z
    .string()
    .transform(val => val.trim())
    .refine(val => val.length > 0, 'Email is required')
    .refine(val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), 'Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

export const registerSchema = z.object({
  first_name: z
    .string()
    .transform(val => val.trim())
    .refine(val => val.length > 0, 'First name is required')
    .refine(val => val.length >= 2, 'First name must be at least 2 characters')
    .refine(val => val.length <= 50, 'First name must be less than 50 characters'),
  last_name: z
    .string()
    .transform(val => val.trim())
    .refine(val => val.length > 0, 'Last name is required')
    .refine(val => val.length >= 2, 'Last name must be at least 2 characters')
    .refine(val => val.length <= 50, 'Last name must be less than 50 characters'),
  email: z
    .string()
    .transform(val => val.trim())
    .refine(val => val.length > 0, 'Email is required')
    .refine(val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), 'Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      passwordRegex,
      'Password must include uppercase, lowercase, number, and special character'
    ),
  role: z.enum(['guest', 'organizer'], {
    required_error: 'Please select an account type',
  }),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .transform(val => val.trim())
    .refine(val => val.length > 0, 'Email is required')
    .refine(val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), 'Please enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      passwordRegex,
      'Password must include uppercase, lowercase, number, and special character'
    ),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Organization validation schemas
export const createOrganizationSchema = z.object({
  name: z
    .string()
    .transform(val => val.trim())
    .refine(val => val.length > 0, 'Organization name is required')
    .refine(val => val.length >= 3, 'Organization name must be at least 3 characters')
    .refine(val => val.length <= 100, 'Organization name must be less than 100 characters'),
  description: z
    .string()
    .transform(val => val.trim())
    .refine(val => val.length <= 500, 'Description must be less than 500 characters')
    .optional(),
});

export const inviteUserSchema = z.object({
  email: z
    .string()
    .transform(val => val.trim())
    .refine(val => val.length > 0, 'Email is required')
    .refine(val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), 'Please enter a valid email address'),
  role: z.enum(['guest', 'team_member'], {
    required_error: 'Please select a role',
  }),
});

// Event validation schemas
export const createEventSchema = z.object({
  title: z
    .string()
    .transform(val => val.trim())
    .refine(val => val.length > 0, 'Event title is required')
    .refine(val => val.length >= 3, 'Event title must be at least 3 characters')
    .refine(val => val.length <= 150, 'Event title must be less than 150 characters'),
  description: z
    .string()
    .transform(val => val.trim())
    .refine(val => val.length <= 1000, 'Description must be less than 1000 characters')
    .optional(),
  date: z
    .string()
    .transform(val => val.trim())
    .refine(val => val.length > 0, 'Event date is required')
    .refine((date) => {
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate >= today;
    }, 'Event date cannot be in the past'),
  time: z
    .string()
    .transform(val => val.trim())
    .refine(val => val.length > 0, 'Event time is required')
    .refine(val => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(val), 'Invalid time format'),
  location: z
    .string()
    .transform(val => val.trim())
    .refine(val => val.length > 0, 'Event location is required')
    .refine(val => val.length >= 3, 'Event location must be at least 3 characters')
    .refine(val => val.length <= 200, 'Event location must be less than 200 characters'),
  is_public: z.boolean().default(false),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type CreateOrganizationFormData = z.infer<typeof createOrganizationSchema>;
export type InviteUserFormData = z.infer<typeof inviteUserSchema>;
export type CreateEventFormData = z.infer<typeof createEventSchema>;
