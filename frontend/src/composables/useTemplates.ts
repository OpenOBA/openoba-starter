import { ref, reactive } from 'vue'

interface TemplateItem { icon: string; text: string; fill: string }

const TPL_STORAGE_KEY = 'eros_templates'

function loadTemplates(): TemplateItem[] {
  try {
    const raw = localStorage.getItem(TPL_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveTemplates(items: TemplateItem[]) {
  localStorage.setItem(TPL_STORAGE_KEY, JSON.stringify(items))
}

const defaultTemplates: TemplateItem[] = [
  { icon: '', text: '涓婃灦鏂板搧', fill: '涓婃灦涓€娆炬柊鐨勶紝涓绘墦甯傚満锛岄渶瑕佸嚑绉嶆鍨嬶紝鍙傝€冮鏍? },
  { icon: '', text: '鍐欏皬绾功', fill: '涓烘柊鍝佸啓涓€绡囧皬绾功绉嶈崏绗旇锛岄潰鍚戝コ鎬х敤鎴凤紝绐佸嚭鎹㈡濡傛崲琛ｏ紝璇皵杞绘澗绉嶈崏' },
  { icon: '', text: '閿€鍞垎鏋?, fill: '鍒嗘瀽鏈€杩戜竴鍛ㄧ殑閿€鍞暟鎹紝瀵规瘮TOP3鐣呴攢娆撅紝鎵惧嚭婊為攢鍘熷洜骞剁粰鍑哄缓璁? },
  { icon: '', text: '閰嶈壊鏂规', fill: '涓烘槬瀛ｆ柊鍝佽璁￠厤鑹叉柟妗堬紝鍙傝€冧粖骞存祦琛岃壊瓒嬪娍锛岃€冭檻鍐锋殩鐨€傞厤' },
  { icon: '', text: '瀹氫环绛栫暐', fill: '涓烘柊鍝佸埗瀹氬畾浠风瓥鐣ワ紝鍙傝€冪珵鍝佸畾浠凤紝鑰冭檻鎴愭湰鍥犵礌鍜屼細鍛樻姌鎵? },
  { icon: '', text: '绔炲搧鍒嗘瀽', fill: '鍒嗘瀽绔炲搧鍦ㄦ鍨?瀹氫环/钀ラ攢涓婄殑琛ㄧ幇锛屾壘鍑烘垜浠殑宸紓鍖栧垏鍏? },
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
    templates, showTemplateDialog, editingTemplate, editingIndex,
    applyTemplate, openAddTemplate, editTemplate, removeTemplate, saveTemplate, resetTemplates,
  }
}
