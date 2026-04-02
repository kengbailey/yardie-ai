import { z } from "zod";

export const emailSubmissionSchema = z.object({
  email: z.string().email(),
});

export type EmailSubmission = z.infer<typeof emailSubmissionSchema>;

export type ApiResponse = {
  status: "success" | "error";
  message?: string;
};
