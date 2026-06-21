import type { Milestone, MilestoneStatus } from '../types/book'
import { addMilestone, updateMilestone, deleteMilestone } from '../services/storage'
import { el } from '../utils/ui'

export interface MilestoneFormOptions {
  bookId: string
  milestone?: Milestone
  onSuccess: () => void
  onCancel: () => void
}

export function showMilestoneForm(options: MilestoneFormOptions): void {
  const { bookId, milestone, onSuccess, onCancel } = options
  const isEdit = !!milestone

  const overlay = el('div', 'modal-overlay')
  const modal = el('div', 'modal milestone-modal')
  const header = el('div', 'modal-header')
  const title = el('h2', 'modal-title', isEdit ? '编辑里程碑' : '新增里程碑')
  const closeBtn = el('button', 'btn btn-icon', '×')
  closeBtn.addEventListener('click', closeModal)
  header.appendChild(title)
  header.appendChild(closeBtn)

  const form = el('form', 'book-form') as HTMLFormElement
  form.addEventListener('submit', handleSubmit)

  const titleGroup = createFormGroup('里程碑名称', 'text', 'mTitle', milestone?.title || '', true)
  const descGroup = createTextareaGroup('目标说明', 'targetDescription', milestone?.targetDescription || '', 3)
  const dateGroup = createFormGroup('预计日期', 'date', 'expectedDate', milestone?.expectedDate || '')

  const thresholdGroup = el('div', 'form-group')
  const thresholdLabel = el('label', 'form-label', '进度阈值(%)')
  const thresholdHint = el('span', 'form-hint', '当阅读进度达到此百分比时自动标记完成，0表示不自动')
  const thresholdInput = el('input', 'form-input') as HTMLInputElement
  thresholdInput.type = 'number'
  thresholdInput.name = 'progressThreshold'
  thresholdInput.value = (milestone?.progressThreshold ?? 0).toString()
  thresholdInput.min = '0'
  thresholdInput.max = '100'
  thresholdGroup.appendChild(thresholdLabel)
  thresholdGroup.appendChild(thresholdHint)
  thresholdGroup.appendChild(thresholdInput)

  const statusGroup = el('div', 'form-group')
  const statusLabel = el('label', 'form-label', '状态')
  const statusSelect = el('select', 'form-input') as HTMLSelectElement
  statusSelect.name = 'mStatus'
  const statusOptions: { value: MilestoneStatus; label: string }[] = [
    { value: 'pending', label: '待完成' },
    { value: 'completed', label: '已完成' },
    { value: 'skipped', label: '已跳过' }
  ]
  statusOptions.forEach(opt => {
    const option = document.createElement('option')
    option.value = opt.value
    option.textContent = opt.label
    if (milestone?.status === opt.value) option.selected = true
    statusSelect.appendChild(option)
  })
  statusGroup.appendChild(statusLabel)
  statusGroup.appendChild(statusSelect)

  const notesGroup = createTextareaGroup('备注', 'mNotes', milestone?.notes || '', 2)

  const footer = el('div', 'modal-footer')
  const cancelBtn = el('button', 'btn btn-secondary', '取消') as HTMLButtonElement
  cancelBtn.type = 'button'
  cancelBtn.addEventListener('click', closeModal)
  const submitBtn = el('button', 'btn btn-primary', isEdit ? '保存修改' : '添加') as HTMLButtonElement
  submitBtn.type = 'submit'

  if (isEdit && milestone) {
    const deleteBtn = el('button', 'btn btn-danger', '删除') as HTMLButtonElement
    deleteBtn.type = 'button'
    deleteBtn.addEventListener('click', () => {
      if (confirm('确定要删除此里程碑吗？')) {
        deleteMilestone(bookId, milestone.id)
        closeModal()
        onSuccess()
      }
    })
    footer.appendChild(deleteBtn)
  }

  footer.appendChild(cancelBtn)
  footer.appendChild(submitBtn)

  form.appendChild(titleGroup)
  form.appendChild(descGroup)
  form.appendChild(dateGroup)
  form.appendChild(thresholdGroup)
  form.appendChild(statusGroup)
  form.appendChild(notesGroup)
  form.appendChild(footer)

  modal.appendChild(header)
  modal.appendChild(form)
  overlay.appendChild(modal)
  document.body.appendChild(overlay)

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal()
  })

  function closeModal(): void {
    overlay.remove()
    onCancel()
  }

  function handleSubmit(e: Event): void {
    e.preventDefault()
    const formData = new FormData(form)
    const mTitle = (formData.get('mTitle') as string).trim()
    if (!mTitle) {
      alert('请填写里程碑名称')
      return
    }
    const data = {
      title: mTitle,
      targetDescription: (formData.get('targetDescription') as string).trim(),
      expectedDate: formData.get('expectedDate') as string,
      progressThreshold: parseInt(formData.get('progressThreshold') as string) || 0,
      notes: (formData.get('mNotes') as string).trim(),
      status: formData.get('mStatus') as MilestoneStatus
    }

    if (isEdit && milestone) {
      updateMilestone(bookId, milestone.id, data)
    } else {
      addMilestone(bookId, data)
    }
    closeModal()
    onSuccess()
  }
}

function createFormGroup(label: string, type: string, name: string, value: string, required = false): HTMLElement {
  const group = el('div', 'form-group')
  const labelEl = el('label', 'form-label', label + (required ? ' *' : ''))
  const input = el('input', 'form-input') as HTMLInputElement
  input.type = type
  input.name = name
  input.value = value
  if (required) input.required = true
  group.appendChild(labelEl)
  group.appendChild(input)
  return group
}

function createTextareaGroup(label: string, name: string, value: string, rows: number): HTMLElement {
  const group = el('div', 'form-group')
  const labelEl = el('label', 'form-label', label)
  const textarea = el('textarea', 'form-input form-textarea') as HTMLTextAreaElement
  textarea.name = name
  textarea.value = value
  textarea.rows = rows
  group.appendChild(labelEl)
  group.appendChild(textarea)
  return group
}
