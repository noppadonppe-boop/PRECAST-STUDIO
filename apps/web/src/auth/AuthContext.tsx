import { createContext, useContext, type PropsWithChildren } from 'react';
import type { OrganizationMembership, ProjectMembership } from '@precast/domain';
import { currentUser, organizationMembership, projectMemberships } from '../fixtures/workspace';

interface AuthState {
  user: typeof currentUser;
  organizationMembership: OrganizationMembership;
  projectMemberships: ProjectMembership[];
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  return <AuthContext.Provider value={{ user: currentUser, organizationMembership, projectMemberships }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (value === null) throw new Error('useAuth must be used within AuthProvider.');
  return value;
}

