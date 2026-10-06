import { NextRequest } from 'next/server';
import { apiError } from '@/lib/api-error';
import { isAdmin, can, canAny, type Capability } from '@/lib/roles';
import { getBearerToken, getStaffIdentityFromToken } from '@/lib/auth/staff';

export async function requireAdminRequest(req: NextRequest, requestId: string) {
  const token = getBearerToken(req);
  if (!token) {
    return apiError('unauthorized', 'Missing bearer token', requestId);
  }

  const identity = await getStaffIdentityFromToken(token);
  if (!identity || !identity.isActive || !isAdmin(identity.grants)) {
    return apiError('forbidden', 'Admin access required', requestId);
  }

  return identity;
}

/**
 * Run order (day-of scheduling, advancing, music) can be edited by admins,
 * DJ/audio staff, and judges, so any of them can reorder or skip competitors
 * live without waiting on an admin.
 */
export async function requireRunOrderEditorRequest(req: NextRequest, requestId: string) {
  const token = getBearerToken(req);
  if (!token) {
    return apiError('unauthorized', 'Missing bearer token', requestId);
  }

  const identity = await getStaffIdentityFromToken(token);
  if (!identity || !identity.isActive || !can(identity.grants, 'runorder.edit')) {
    return apiError('forbidden', 'Admin, DJ/audio, or judge staff access required', requestId);
  }

  return identity;
}

/**
 * Signed in, active, and holding at least one of `capabilities` (admin holds them all). Routes ask for the
 * capability that matches what they do (docs/ROLES.md), so a role added later gets exactly what it should.
 */
export async function requireCapabilityRequest(req: NextRequest, requestId: string, ...capabilities: Capability[]) {
  const token = getBearerToken(req);
  if (!token) {
    return apiError('unauthorized', 'Missing bearer token', requestId);
  }

  const identity = await getStaffIdentityFromToken(token);
  if (!identity || !identity.isActive || !canAny(identity.grants, capabilities)) {
    return apiError('forbidden', 'You do not have access to this', requestId);
  }

  return identity;
}
