import type { Book, ReadingStatus, Milestone, ReviewStatus } from '../types/book'
import { addBook, updateBook } from '../services/storage'
import { showMilestoneForm } from './MilestoneForm'
import { formatDate, getDaysUntil, REVIEW_STATUS_LABELS, el } from '../utils/ui'

export interface BookFormOptions {
  book?: Book
  onSuccess: () => void
  onCancel: () => void
}

export function showBookForm(options: BookFormOptions): void {
  const { book, onSuccess, onCancel } = options
  const isEdit = !!book

  let milestonesDraft: Milestone[] = [...(book?.milestones || [])]
  const TMP_BOOK_ID = '__tmp_new_book__'

  const overlay = el('div', 'modal-overlay')
  const modal = el('div', 'modal')
  const header = el('div', 'modal-header')
  const title = el('h2', 'modal-title', isEdit ? '编辑书籍' : '新增书籍')
  const closeBtn = el('button', 'btn btn-icon', '×')
  closeBtn.addEventListener('click', closeModal)

  header.appendChild(title)
  header.appendChild(closeBtn)

  const form = el('form', 'book-form') as HTMLFormElement
  form.addEventListener('submit', handleSubmit)

  const titleGroup = createFormGroup('书名', 'text', 'title', book?.title || '', true)
  const authorGroup = createFormGroup('作者', 'text', 'author', book?.author || '')
  const topicGroup = createFormGroup('主题', 'text', 'topic', book?.topic || '')
  
  const chaptersRow = el('div', 'form-row')
  const totalGroup = createFormGroup('总章节数', 'number', 'totalChapters', book?.totalChapters.toString() || '0', true)
  const readGroup = createFormGroup('已读章节', 'number', 'readChapters', book?.readChapters.toString() || '0', true)
  chaptersRow.appendChild(totalGroup)
  chaptersRow.appendChild(readGroup)

  const dateGroup = createFormGroup('计划完成日期', 'date', 'plannedDate', book?.plannedDate || '')
  
  const statusGroup = el('div', 'form-group')
  const statusLabel = el('label', 'form-label', '阅读状态')
  const statusSelect = el('select', 'form-input') as HTMLSelectElement
  statusSelect.name = 'status'
  const statusOptions: { value: ReadingStatus; label: string }[] = [
    { value: 'not_started', label: '未开始' },
    { value: 'reading', label: '阅读中' },
    { value: 'paused', label: '已暂停' },
    { value: 'reviewing', label: '复盘中' },
    { value: 'completed', label: '已完成' },
    { value: 'reviewed', label: '已复盘' }
  ]
  statusOptions.forEach(opt => {
    const option = document.createElement('option')
    option.value = opt.value
    option.textContent = opt.label
    if (book?.status === opt.value) option.selected = true
    statusSelect.appendChild(option)
  })
  statusGroup.appendChild(statusLabel)
  statusGroup.appendChild(statusSelect)

  const favoriteGroup = el('div', 'form-group form-checkbox-group')
  const favoriteCheckbox = el('input', 'form-checkbox') as HTMLInputElement
  favoriteCheckbox.type = 'checkbox'
  favoriteCheckbox.id = 'favorite-checkbox'
  favoriteCheckbox.name = 'isFavorite'
  favoriteCheckbox.checked = book?.isFavorite || false
  const favoriteLabel = el('label', 'form-checkbox-label', '收藏为重点书目') as HTMLLabelElement
  favoriteLabel.htmlFor = 'favorite-checkbox'
  favoriteGroup.appendChild(favoriteCheckbox)
  favoriteGroup.appendChild(favoriteLabel)

  const milestoneSection = el('div', 'form-group milestone-form-section')
  const milestoneHeader = el('div', 'milestone-form-header')
  const milestoneTitle = el('label', 'form-label', '🎯 阅读里程碑')
  const milestoneCount = el('span', 'milestone-form-count',
    milestonesDraft.length > 0 ? `${milestonesDraft.length} 个里程碑` : '暂无里程碑')
  milestoneHeader.appendChild(milestoneTitle)
  milestoneHeader.appendChild(milestoneCount)

  const milestoneList = el('div', 'milestone-form-list')
  renderMilestoneList()

  const addMilestoneBtn = el('button', 'btn btn-outline btn-sm milestone-add-btn', '+ 添加里程碑') as HTMLButtonElement
  addMilestoneBtn.type = 'button'
  addMilestoneBtn.addEventListener('click', () => {
    const isTemporary = !isEdit
    showMilestoneForm({
      bookId: book?.id || TMP_BOOK_ID,
      isTemporary,
      onTemporarySave: (m) => {
        const idx = milestonesDraft.findIndex(x => x.id === m.id)
        if (idx >= 0) milestonesDraft[idx] = m
        else milestonesDraft.push(m)
      },
      onTemporaryDelete: (mid) => {
        milestonesDraft = milestonesDraft.filter(x => x.id !== mid)
      },
      onSuccess: () => renderMilestoneList(),
      onCancel: () => {}
    })
  })

  milestoneSection.appendChild(milestoneHeader)
  milestoneSection.appendChild(milestoneList)
  milestoneSection.appendChild(addMilestoneBtn)

  const highlightsGroup = createTextareaGroup('重点摘录', 'highlights', book?.highlights || '', 4)
  const reviewGroup = createTextareaGroup('复盘备注', 'reviewNotes', book?.reviewNotes || '', 4)

  const reviewSection = el('div', 'form-group milestone-form-section')
  const reviewHeader = el('div', 'milestone-form-header')
  const reviewTitle = el('label', 'form-label', '💭 复盘内容')
  reviewHeader.appendChild(reviewTitle)
  reviewSection.appendChild(reviewHeader)

  const reviewStatusGroup = el('div', 'form-group')
  const reviewStatusLabel = el('label', 'form-label', '复盘状态')
  const reviewStatusSelect = el('select', 'form-input') as HTMLSelectElement
  reviewStatusSelect.name = 'reviewStatus'
  const reviewStatusOptions: { value: ReviewStatus; label: string }[] = [
    { value: 'pending', label: REVIEW_STATUS_LABELS.pending },
    { value: 'reviewing', label: REVIEW_STATUS_LABELS.reviewing },
    { value: 'reviewed', label: REVIEW_STATUS_LABELS.reviewed }
  ]
  reviewStatusOptions.forEach(opt => {
    const option = document.createElement('option')
    option.value = opt.value
    option.textContent = opt.label
    if (book?.reviewStatus === opt.value) option.selected = true
    reviewStatusSelect.appendChild(option)
  })
  reviewStatusGroup.appendChild(reviewStatusLabel)
  reviewStatusGroup.appendChild(reviewStatusSelect)

  const ratingGroup = el('div', 'form-group')
  const ratingLabel = el('label', 'form-label', '推荐指数（1-5星）')
  const ratingStars = el('div', 'rating-stars')
  for (let i = 1; i <= 5; i++) {
    const star = el('button', `rating-star ${i <= (book?.recommendationRating || 0) ? 'active' : ''}`, '★') as HTMLButtonElement
    star.type = 'button'
    star.dataset.rating = i.toString()
    star.addEventListener('click', () => {
      document.querySelectorAll('.rating-star').forEach((s, idx) => {
        s.classList.toggle('active', idx < i)
      })
    })
    ratingStars.appendChild(star)
  }
  ratingGroup.appendChild(ratingLabel)
  ratingGroup.appendChild(ratingStars)

  const conclusionGroup = createTextareaGroup('复盘结论', 'reviewConclusion', book?.reviewConclusion || '', 3)
  const insightsGroup = createTextareaGroup('阅读收获', 'reviewInsights', book?.reviewInsights || '', 3)
  const summaryGroup = createFormGroup('一句话总结', 'text', 'oneLineSummary', book?.oneLineSummary || '')
  const summaryHint = el('span', 'form-hint', '用一句话概括这本书的价值，最多100字')
  summaryGroup.appendChild(summaryHint)

  reviewSection.appendChild(reviewStatusGroup)
  reviewSection.appendChild(ratingGroup)
  reviewSection.appendChild(conclusionGroup)
  reviewSection.appendChild(insightsGroup)
  reviewSection.appendChild(summaryGroup)

  const footer = el('div', 'modal-footer')
  const cancelBtn = el('button', 'btn btn-secondary', '取消') as HTMLButtonElement
  cancelBtn.type = 'button'
  cancelBtn.addEventListener('click', closeModal)
  const submitBtn = el('button', 'btn btn-primary', isEdit ? '保存修改' : '添加') as HTMLButtonElement
  submitBtn.type = 'submit'
  footer.appendChild(cancelBtn)
  footer.appendChild(submitBtn)

  form.appendChild(titleGroup)
  form.appendChild(authorGroup)
  form.appendChild(topicGroup)
  form.appendChild(chaptersRow)
  form.appendChild(dateGroup)
  form.appendChild(statusGroup)
  form.appendChild(favoriteGroup)
  form.appendChild(milestoneSection)
  form.appendChild(highlightsGroup)
  form.appendChild(reviewGroup)
  form.appendChild(reviewSection)
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
    
    const title = (formData.get('title') as string).trim()
    if (!title) {
      alert('请填写书名')
      return
    }

    const totalChapters = parseInt(formData.get('totalChapters') as string) || 0
    const readChapters = parseInt(formData.get('readChapters') as string) || 0

    if (totalChapters <= 0) {
      alert('总章节数必须大于0')
      return
    }

    const progress = totalChapters > 0 ? Math.round((readChapters / totalChapters) * 100) : 0
    const now = new Date().toISOString()
    const finalMilestones = milestonesDraft.map(m => {
      let status = m.status
      let completedAt = m.completedAt
      if (status === 'pending' && m.progressThreshold > 0 && progress >= m.progressThreshold) {
        status = 'completed'
        completedAt = now
      }
      return {
        ...m,
        id: m.id.startsWith('tmp_') ? generateBookFormId() : m.id,
        status,
        completedAt,
        createdAt: m.createdAt || now,
        updatedAt: now
      }
    })

    const rating = document.querySelectorAll('.rating-star.active').length
    const bookData = {
      title,
      author: (formData.get('author') as string).trim(),
      topic: (formData.get('topic') as string).trim(),
      totalChapters,
      readChapters,
      plannedDate: formData.get('plannedDate') as string,
      status: formData.get('status') as ReadingStatus,
      highlights: formData.get('highlights') as string,
      reviewNotes: formData.get('reviewNotes') as string,
      reviewConclusion: formData.get('reviewConclusion') as string,
      reviewInsights: formData.get('reviewInsights') as string,
      recommendationRating: rating,
      oneLineSummary: (formData.get('oneLineSummary') as string).trim(),
      reviewStatus: formData.get('reviewStatus') as ReviewStatus,
      isFavorite: formData.get('isFavorite') === 'on'
    }

    if (isEdit && book) {
      updateBook(book.id, { ...bookData, milestones: finalMilestones })
    } else {
      addBook(bookData, finalMilestones)
    }

    closeModal()
    onSuccess()
  }

  function renderMilestoneList(): void {
    milestoneList.innerHTML = ''
    milestoneCount.textContent = milestonesDraft.length > 0
      ? `${milestonesDraft.length} 个里程碑`
      : '暂无里程碑'

    if (milestonesDraft.length === 0) {
      const emptyHint = el('div', 'milestone-form-empty', '暂无里程碑，点击下方按钮添加')
      milestoneList.appendChild(emptyHint)
      return
    }

    milestonesDraft.forEach(m => {
      const isTemporary = !isEdit
      const item = createMilestoneFormItem(
        book?.id || TMP_BOOK_ID,
        m,
        () => renderMilestoneList(),
        isTemporary,
        (updated) => {
          const idx = milestonesDraft.findIndex(x => x.id === updated.id)
          if (idx >= 0) milestonesDraft[idx] = updated
          else milestonesDraft.push(updated)
        },
        (mid) => {
          milestonesDraft = milestonesDraft.filter(x => x.id !== mid)
        }
      )
      milestoneList.appendChild(item)
    })
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

function createMilestoneFormItem(
  bookId: string,
  milestone: Milestone,
  onRefresh: () => void,
  isTemporary = false,
  onTemporarySave?: (milestone: Milestone) => void,
  onTemporaryDelete?: (milestoneId: string) => void
): HTMLElement {
  const item = el('div', `milestone-form-item milestone-status-${milestone.status}`)
  
  const info = el('div', 'milestone-form-item-info')
  const nameEl = el('span', 'milestone-form-item-name', milestone.title)
  const statusLabel = milestone.status === 'completed' ? '✅ 已完成'
    : milestone.status === 'skipped' ? '⏭ 已跳过'
    : '⏳ 待完成'
  const statusEl = el('span', `milestone-form-item-status status-${milestone.status}`, statusLabel)
  info.appendChild(nameEl)
  info.appendChild(statusEl)

  const meta = el('div', 'milestone-form-item-meta')
  if (milestone.expectedDate) {
    const days = getDaysUntil(milestone.expectedDate)
    let dateText = formatDate(milestone.expectedDate)
    if (milestone.status === 'pending') {
      if (days < 0) dateText += ` (逾期${Math.abs(days)}天)`
      else if (days <= 3) dateText += ` (还剩${days}天)`
    }
    meta.appendChild(el('span', 'milestone-form-item-date', dateText))
  }
  if (milestone.progressThreshold > 0) {
    meta.appendChild(el('span', 'milestone-form-item-threshold', `${milestone.progressThreshold}%`))
  }

  const actions = el('div', 'milestone-form-item-actions')
  const editBtn = el('button', 'btn btn-sm btn-outline', '编辑')
  editBtn.addEventListener('click', () => {
    showMilestoneForm({
      bookId,
      milestone,
      isTemporary,
      onTemporarySave,
      onTemporaryDelete,
      onSuccess: onRefresh,
      onCancel: () => {}
    })
  })
  actions.appendChild(editBtn)

  item.appendChild(info)
  item.appendChild(meta)
  item.appendChild(actions)
  return item
}

function generateBookFormId(): string {
  return 'b_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
