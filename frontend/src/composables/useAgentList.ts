import { ref } from 'vue'
import { getAgents } from '@/api/system'
import type { AgentItem } from '@/api/system'
import type { AgentEntry } from '@/components/AgentSidebar.vue'

const AGENT_STORAGE_KEY = 'eros_agents'

const defaultAgents: AgentEntry[] = [
  { id: 'main-agent', agentCode: 'main-agent', agentName: 'OpenOBA Main', displayName: 'MainAgent', icon: '', description: '鎬荤 路 L4', agentType: 'main', securityClearance: 'L4', status: 'active' },
]

function loadAgentsFromLocalStorage(): AgentEntry[] {
  try {
    const raw = localStorage.getItem(AGENT_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return [...defaultAgents]
}

function saveAgents(agents: AgentEntry[]) {
  localStorage.setItem(AGENT_STORAGE_KEY, JSON.stringify(agents))
}

export function useAgentList() {
  const agentList = ref<AgentEntry[]>(loadAgentsFromLocalStorage())

  async function loadAgentList() {
    try {
      const agents = await getAgents()
      if (agents && agents.length > 0) {
        agentList.value = agents.map((a: AgentItem) => ({
          id: (a.agentCode || a.agentId) as string,
          agentCode: a.agentCode as string,
          agentName: a.agentName as string,
          displayName: a.agentName as string,
          icon: '',
          description: `${a.agentType} 路 ${a.securityClearance}`,
          agentType: a.agentType as string,
          securityClearance: a.securityClearance as string,
          status: (a.status === 'active' ? 'active' : 'inactive') as 'active' | 'inactive',
        }))
      }
    } catch {
      agentList.value = loadAgentsFromLocalStorage()
    }
  }

  function onAgentsUpdate(agents: AgentEntry[]) {
    agentList.value = agents
    saveAgents(agents)
  }

  return { agentList, loadAgentList, onAgentsUpdate }
}
