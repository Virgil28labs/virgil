import { useMemo, useCallback } from 'react';
import { DynamicContextBuilder } from '../services/DynamicContextBuilder';
import { dashboardContextService } from '../services/DashboardContextService';
import type { DashboardContext } from '../services/DashboardContextService';
import type { User } from '../types/auth.types';

interface UseSystemPromptProps {
  user: User | null;
  customSystemPrompt: string;
  memoryContext: string;
  dashboardContext: DashboardContext | null;
  contextualSuggestions: string[];
}

interface UseSystemPromptReturn {
  createSystemPrompt: (userQuery?: string) => string;
  timeOfDay: string;
  locationContext: string | null;
}

export function useSystemPrompt({
  user,
  customSystemPrompt,
  memoryContext,
  dashboardContext,
  contextualSuggestions,
}: UseSystemPromptProps): UseSystemPromptReturn {
  // Memoized time of day calculation
  const timeOfDay = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }, []); // Empty deps since we want this to be stable during the session

  // Memoized location context from dashboard
  const locationContext = useMemo(() => {
    const ctx = dashboardContextService.getContext();
    if (ctx.location.city) {
      return `${ctx.location.city}${ctx.location.country ? `, ${ctx.location.country}` : ''}`;
    }
    return null;
  }, [dashboardContext]); // Re-compute when dashboard context changes

  // Memoized static parts of system prompt
  const staticPromptParts = useMemo(() => {
    const staticUserContext = user ? 
      `User: ${user.user_metadata?.name || 'User'}${locationContext ? ` • Location: ${locationContext}` : ''} • Time: ${timeOfDay}` :
      `Location: ${locationContext || 'Unknown'} • Time: ${timeOfDay}`;

    const basePrompt = customSystemPrompt || 'You are Virgil, a contextual AI assistant.';
    
    return { basePrompt, staticUserContext };
  }, [user, locationContext, timeOfDay, customSystemPrompt]);

  const createSystemPrompt = useCallback((userQuery?: string) => {
    let systemPrompt = `${staticPromptParts.basePrompt} ${staticPromptParts.staticUserContext}`;

    if (memoryContext) {
      systemPrompt += `\n\nMemory:${memoryContext}`;
    }

    if (userQuery && dashboardContext) {
      const enhancedPrompt = DynamicContextBuilder.buildEnhancedPrompt(
        systemPrompt,
        userQuery,
        dashboardContext,
        contextualSuggestions,
      );
      systemPrompt = enhancedPrompt.enhancedPrompt;
      dashboardContextService.logActivity(`Asked: "${userQuery.slice(0, 50)}..."`, 'virgil-chat');
    }

    const responseRules = '\n\nBe conversational, concise, and use available context naturally.';
    
    return systemPrompt + responseRules;
  }, [staticPromptParts, memoryContext, dashboardContext, contextualSuggestions]);

  return {
    createSystemPrompt,
    timeOfDay,
    locationContext,
  };
}