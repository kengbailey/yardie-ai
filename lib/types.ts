import { z } from "zod";

// ============================================================================
// Existing: Email submission
// ============================================================================

export const emailSubmissionSchema = z.object({
  email: z.string().email(),
});

export type EmailSubmission = z.infer<typeof emailSubmissionSchema>;

export type ApiResponse = {
  status: "success" | "error";
  message?: string;
};

// ============================================================================
// Roles
// ============================================================================

/** Instance-scoped roles: user can use the instance, manager can manage it */
export const instanceRoleSchema = z.enum(["user", "manager"]);
export type InstanceRole = z.infer<typeof instanceRoleSchema>;

/** Global roles: sysadmin has access to everything */
export const globalRoleSchema = z.enum(["sysadmin"]);
export type GlobalRole = z.infer<typeof globalRoleSchema>;

// ============================================================================
// Instance
// ============================================================================

export const instanceStatusSchema = z.enum([
  "active",
  "inactive",
  "provisioning",
]);
export type InstanceStatus = z.infer<typeof instanceStatusSchema>;

export const instanceSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  subdomain: z.string().min(1).max(63),
  base_url: z.string().url(),
  status: instanceStatusSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Instance = z.infer<typeof instanceSchema>;

// ============================================================================
// Role assignment rows (database row shapes)
// ============================================================================

export const instanceRoleRowSchema = z.object({
  user_id: z.string(),
  instance_id: z.string(),
  role: instanceRoleSchema,
  created_at: z.string().datetime(),
});
export type InstanceRoleRow = z.infer<typeof instanceRoleRowSchema>;

export const globalRoleRowSchema = z.object({
  user_id: z.string(),
  role: globalRoleSchema,
  created_at: z.string().datetime(),
});
export type GlobalRoleRow = z.infer<typeof globalRoleRowSchema>;

// ============================================================================
// Permissions (computed at runtime)
// ============================================================================

export interface UserPermissions {
  /** Whether the user has the global sysadmin role */
  isSysadmin: boolean;
  /** Map of instanceId -> role for all instance-scoped roles */
  instanceRoles: Map<string, InstanceRole>;
}

// ============================================================================
// Provisioning tasks
// ============================================================================

export const provisioningTaskTypeSchema = z.enum([
  "create_openwebui_account",
  "create_litellm_key",
  "send_welcome_email",
]);
export type ProvisioningTaskType = z.infer<typeof provisioningTaskTypeSchema>;

export const provisioningTaskStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
  "failed",
]);
export type ProvisioningTaskStatus = z.infer<
  typeof provisioningTaskStatusSchema
>;

export const provisioningTaskSchema = z.object({
  id: z.number(),
  user_id: z.string(),
  instance_id: z.string(),
  task_type: provisioningTaskTypeSchema,
  status: provisioningTaskStatusSchema,
  attempts: z.number(),
  max_attempts: z.number(),
  last_error: z.string().nullable(),
  next_retry_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type ProvisioningTask = z.infer<typeof provisioningTaskSchema>;

// ============================================================================
// Input validation schemas for role assignment
// ============================================================================

export const assignInstanceRoleInputSchema = z.object({
  userId: z.string().min(1),
  instanceId: z.string().min(1),
  role: instanceRoleSchema,
});
export type AssignInstanceRoleInput = z.infer<
  typeof assignInstanceRoleInputSchema
>;

export const assignGlobalRoleInputSchema = z.object({
  userId: z.string().min(1),
  role: globalRoleSchema,
});
export type AssignGlobalRoleInput = z.infer<typeof assignGlobalRoleInputSchema>;

// ============================================================================
// Auth input schemas
// ============================================================================

export const signupInputSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
});
export type SignupInput = z.infer<typeof signupInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const resetPasswordInputSchema = z.object({
  email: z.string().email(),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;
