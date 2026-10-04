/** Shape shared by the Firebase-backed email template store and editor. */
export type EmailTemplateSeed = {
  id: string
  name: string
  subject: string
  body: string
  imageUrl?: string
  imageAlt?: string
}

/** The welcome email /api/signup sends to new users, when an admin has added it. */
export const SIGNUP_WELCOME_TEMPLATE_ID = "signup-welcome"
