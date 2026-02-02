import { useQuery } from '@tanstack/react-query';

interface HelpScreen {
  id: string;
  route: string;
  title: string;
  htmlContent: string;
  updatedAt: string;
  updatedBy: string | null;
  tags: string[] | null;
  relatedFlowIds: string[] | null;
}

interface HelpFlowStep {
  step: number;
  route: string;
  title: string;
  instruction: string;
  highlightSelector?: string;
}

interface HelpFlow {
  id: string;
  title: string;
  description: string | null;
  stepsJson: HelpFlowStep[];
  updatedAt: string;
  updatedBy: string | null;
}

interface HelpFlowSummary {
  id: string;
  title: string;
  description: string | null;
  updatedAt: string;
}

export function useHelpScreen(route: string) {
  return useQuery<HelpScreen | null>({
    queryKey: ['help-screen', route],
    queryFn: async () => {
      const encodedRoute = encodeURIComponent(route);
      const res = await fetch(`/api/help/screens/${encodedRoute}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Failed to fetch help content');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false
  });
}

export function useHelpFlows() {
  return useQuery<HelpFlowSummary[]>({
    queryKey: ['help-flows'],
    queryFn: async () => {
      const res = await fetch('/api/help/flows');
      if (!res.ok) throw new Error('Failed to fetch help flows');
      return res.json();
    },
    staleTime: 5 * 60 * 1000
  });
}

export function useHelpFlow(id: string | null) {
  return useQuery<HelpFlow | null>({
    queryKey: ['help-flow', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetch(`/api/help/flows/${id}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Failed to fetch help flow');
      return res.json();
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000
  });
}

export type { HelpScreen, HelpFlow, HelpFlowStep, HelpFlowSummary };
