import { z } from 'zod'

const loginFormSchema = z.object({
  username: z.string().min(6),
  password: z.string().min(8)
})

const registerFormSchema = z
  .object({
    username: z.string().min(6),
    password: z.string().min(6),
    passwordRetype: z.string().min(6)
  })
  .refine((data) => data.password === data.passwordRetype, {
    message: 'Passwords are not matching',
    path: ['passwordRetype']
  })

const profileFormSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional()
})

const deleteAccountFormSchema = z
  .object({
    username: z.string().min(6),
    usernameCurrent: z.string().min(6).optional()
  })
  .passthrough()
  .refine((data) => data.username === data.usernameCurrent, {
    message: 'Username is not matching',
    path: ['username']
  })

const changePasswordFormSchema = z
  .object({
    password: z.string().min(8),
    passwordNew: z.string().min(8),
    passwordRetype: z.string().min(8)
  })
  .refine((data) => data.passwordNew !== data.password, {
    message: 'Both new and current passwords are same',
    path: ['passwordNew']
  })
  .refine((data) => data.passwordNew === data.passwordRetype, {
    message: 'Passwords are not matching',
    path: ['passwordRetype']
  })

const feedbackFormSchema = z
  .object({
    systemSlug: z.string().min(1),
    phone: z
      .string()
      .min(7, 'Минимум 7 символов')
      .max(20)
      .regex(/^\+?[\d\s\-()]+$/, 'Некорректный номер телефона'),
    feedbackType: z.enum(['bug', 'review', 'suggestion', 'other']),
    rating: z.number().min(1).max(5).optional().nullable(),
    comment: z.string().min(10, 'Минимум 10 символов')
  })
  .refine(
    (data) =>
      data.feedbackType !== 'review' ||
      (data.rating != null && data.rating >= 1),
    {
      message: 'Оценка обязательна для отзывов',
      path: ['rating']
    }
  )

type FeedbackFormSchema = z.infer<typeof feedbackFormSchema>

export {
  changePasswordFormSchema,
  deleteAccountFormSchema,
  feedbackFormSchema,
  loginFormSchema,
  profileFormSchema,
  registerFormSchema
}

export type { FeedbackFormSchema }
