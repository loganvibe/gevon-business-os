import { createContext, useContext } from "react";

export type NavigationGroup = { moduleId: string; moduleName: string; items: Array<{ to: string; label: string; icon?: string; children?: any[] }> };
export const NavigationCtx = createContext<NavigationGroup[] | null>(null);
export function useNavigationGroups(): NavigationGroup[] | null {
  return useContext(NavigationCtx);
}
