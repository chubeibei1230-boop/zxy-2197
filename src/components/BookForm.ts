import type { Book, ReadingStatus } from '../types/book'
import { addBook, updateBook } from '../services/storage'
import { el } from '../utils/ui'

export interface BookFormOptions {
  book?: Book
  onSuccess: () => void
  onCancel: () => void
}

export function showBookForm(options: BookFormOptions): void {
  const { book, onSuccess, onCancel } = options
  const isEdit = !!book

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
    { value: 'completed', label: '已完成' }
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

  const highlightsGroup = createTextareaGroup('重点摘录', 'highlights', book?.highlights || '', 4)
  const reviewGroup = createTextareaGroup('复盘备注', 'reviewNotes', book?.reviewNotes || '', 4)

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
  form.appendChild(highlightsGroup)
  form.appendChild(reviewGroup)
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
      isFavorite: formData.get('isFavorite') === 'on'
    }

    if (isEdit && book) {
      updateBook(book.id, bookData)
    } else {
      addBook(bookData)
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
