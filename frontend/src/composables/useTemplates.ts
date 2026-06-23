import { ref, reactive } from 'vue'

interface TemplateItem {
  icon: string
  text: string
  fill: string
}

const TPL_STORAGE_KEY = 'eros_templates'

function loadTemplates(): TemplateItem[] {
  try {
    const raw = localStorage.getItem(TPL_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveTemplates(items: TemplateItem[]) {
  localStorage.setItem(TPL_STORAGE_KEY, JSON.stringify(items))
}

const defaultTemplates: TemplateItem[] = [
  { icon: '', text: '上架新品', fill: '上架一款新的，主打市场，需要几种框型，参考风格' },
  { icon: '', text: '写小红书', fill: '为新品写一篇小红书种草笔记，面向女性用户，突出换框如换衣，语气轻松种草' },
  { icon: '', text: '销售分析', fill: '分析最近一周的销售数据，对比TOP3畅款，找出滞销原因并给出建议' },
  { icon: '', text: '配色方案', fill: '为春季新品设计配色方案，参考今年流行色趋势，考虑冷暖皮适配' },
  { icon: '', text: '定价策略', fill: '为新品制定定价策略，参考竞品定价，考虑成本因素和会员折扣' },
  { icon: '', text: '竞品分析', fill: '分析竞品在框型/定价/营销上的表现，找出我们的差异化切入' },
]

export function useTemplates() {
  const templates = ref<TemplateItem[]>(loadTemplates().length > 0 ? loadTemplates() : [...defaultTemplates])
  const showTemplateDialog = ref(false)
  const editingTemplate = reactive<TemplateItem>({ icon: '', text: '', fill: '' })
  const editingIndex = ref(-1)

  function applyTemplate(tpl: TemplateItem) {
    const ta = document.querySelector('.calling-input textarea') as HTMLTextAreaElement
    if (ta) {
      ta.value = tpl.fill
      ta.dispatchEvent(new Event('input', { bubbles: true }))
      ta.focus()
    }
  }

  function openAddTemplate() {
    editingTemplate.icon = ''
    editingTemplate.text = ''
    editingTemplate.fill = ''
    editingIndex.value = -1
    showTemplateDialog.value = true
  }

  function editTemplate(index: number) {
    const tpl = templates.value[index]
    editingTemplate.icon = tpl.icon
    editingTemplate.text = tpl.text
    editingTemplate.fill = tpl.fill
    editingIndex.value = index
    showTemplateDialog.value = true
  }

  function removeTemplate(index: number) {
    templates.value.splice(index, 1)
    saveTemplates(templates.value)
  }

  function saveTemplate() {
    if (!editingTemplate.text.trim() || !editingTemplate.fill.trim()) return
    if (editingIndex.value >= 0) {
      templates.value[editingIndex.value] = { ...editingTemplate }
    } else {
      templates.value.push({ ...editingTemplate })
    }
    saveTemplates(templates.value)
    showTemplateDialog.value = false
  }

  function resetTemplates() {
    templates.value = [...defaultTemplates]
    saveTemplates(templates.value)
  }

  return {
    templates,
    showTemplateDialog,
    editingTemplate,
    editingIndex,
    applyTemplate,
    openAddTemplate,
    editTemplate,
    removeTemplate,
    saveTemplate,
    resetTemplates,
  }
}
