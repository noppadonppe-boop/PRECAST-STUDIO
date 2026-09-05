import { doc, onSnapshot, Timestamp, type DocumentData, type Unsubscribe } from 'firebase/firestore';
import type { OrganizationMembership, ProjectMembership, ProjectRole } from '@precast/domain';
import { firestore } from '../firebase/client';

interface AccessSnapshot {
  organizationMembership: OrganizationMembership;
  projectMemberships: ProjectMembership[];
  revision: string;
}

function timestampToIso(value: unknown): string | undefined {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  return typeof value === 'string' ? value : undefined;
}

function projectMembership(data: DocumentData, orgId: string, projectId: string, uid: string): ProjectMembership {
  const effectiveFrom = timestampToIso(data.effectiveFrom) ?? new Date(0).toISOString();
  const expiresAt = timestampToIso(data.expiresAt);
  return {
    uid,
    orgId,
    projectId,
    roles: Array.isArray(data.roles) ? data.roles as ProjectRole[] : [],
    capabilities: Array.isArray(data.capabilities) ? data.capabilities.filter((item): item is string => typeof item === 'string') : [],
    status: data.status === 'active' ? 'active' : 'suspended',
    effectiveFrom,
    ...(expiresAt === undefined ? {} : { expiresAt }),
  };
}

export function watchUserAccess(orgId: string, uid: string, onValue: (snapshot: AccessSnapshot) => void, onError: (error: Error) => void): Unsubscribe {
  const projectUnsubscribes = new Map<string, Unsubscribe>();
  const memberships = new Map<string, ProjectMembership>();
  let organizationMembership: OrganizationMembership | undefined;

  function emit(revision: string) {
    if (organizationMembership === undefined) return;
    onValue({ organizationMembership, projectMemberships: [...memberships.values()], revision });
  }

  const unsubscribeOrganization = onSnapshot(doc(firestore, `organizations/${orgId}/members/${uid}`), (snapshot) => {
    if (!snapshot.exists()) {
      onError(new Error('Organization membership was not found.'));
      return;
    }
    const data = snapshot.data();
    organizationMembership = {
      uid,
      orgId,
      orgRoles: Array.isArray(data.orgRoles) && data.orgRoles.includes('orgAdmin') ? ['orgAdmin'] : [],
      status: data.status === 'active' ? 'active' : data.status === 'invited' ? 'invited' : 'suspended',
    };
    const projectIds = Array.isArray(data.projectIds) ? data.projectIds.filter((item): item is string => typeof item === 'string') : [];
    for (const [projectId, unsubscribe] of projectUnsubscribes) {
      if (!projectIds.includes(projectId)) {
        unsubscribe();
        projectUnsubscribes.delete(projectId);
        memberships.delete(projectId);
      }
    }
    for (const projectId of projectIds) {
      if (projectUnsubscribes.has(projectId)) continue;
      const unsubscribe = onSnapshot(doc(firestore, `organizations/${orgId}/projects/${projectId}/members/${uid}`), (projectSnapshot) => {
        const projectData = projectSnapshot.data();
        if (projectData !== undefined) memberships.set(projectId, projectMembership(projectData, orgId, projectId, uid));
        else memberships.delete(projectId);
        emit(`${timestampToIso(data.updatedAt) ?? snapshot.id}:${timestampToIso(projectData?.updatedAt) ?? projectSnapshot.id}`);
      }, onError);
      projectUnsubscribes.set(projectId, unsubscribe);
    }
    emit(timestampToIso(data.updatedAt) ?? snapshot.id);
  }, onError);

  return () => {
    unsubscribeOrganization();
    for (const unsubscribe of projectUnsubscribes.values()) unsubscribe();
  };
}
