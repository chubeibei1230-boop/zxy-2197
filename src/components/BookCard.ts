import type { Book } from '../types/book'
import { calculateProgress } from '../services/validation'
import { STATUS_LABELS, STATUS_COLORS, formatDate, getDaysUntil, el } from '../utils/ui'

export interface BookCardOptions {
  book: Book
  selected: boolean
  onSelect: (id: string) => void
  onEdit: (book: Book) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onToggleFavorite: (id: string) => void
}

export function createBookCard(options: BookCardOptions): HTMLElement {
  const { book, selected, onSelect, onEdit, onDelete, onDuplicate, onToggleFavorite } = options

  const card = el('div', `book-card ${selected ? 'selected' : ''} ${book.isFavorite ? 'favorite' : ''}`)
  card.dataset.id = book.id

  const header = el('div', 'book-card-header')
  
  const checkbox = el('input', 'book-select') as HTMLInputElement
  checkbox.type = 'checkbox'
  checkbox.checked = selected
  checkbox.addEventListener('change', () => onSelect(book.id))

  const title = el('h3', 'book-title', book.title)
  
  const favoriteBtn = el('button', `btn btn-icon favorite-btn ${book.isFavorite ? 'active' : ''}`, book.isFavorite ? '★' : '☆')
  favoriteBtn.title = book.isFavorite ? '取消收藏' : '收藏'
  favoriteBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    onToggleFavorite(book.id)
  })

  header.appendChild(checkbox)
  header.appendChild(title)
  header.appendChild(favoriteBtn)

  const meta = el('div', 'book-meta')
  const author = el('span', 'book-author', `作者：${book.author || '未知'}`)
  const topic = el('span', 'book-topic', book.topic || '未分类')
  meta.appendChild(author)
  meta.appendChild(topic)

  const statusBadge = el('span', 'status-badge', STATUS_LABELS[book.status])
  statusBadge.style.backgroundColor = STATUS_COLORS[book.status] + '20'
  statusBadge.style.color = STATUS_COLORS[book.status]

  const progress = calculateProgress(book)
  const progressSection = el('div', 'progress-section')
  const progressInfo = el('div', 'progress-info')
  const progressText = el('span', 'progress-text', `进度：${book.readChapters}/${book.totalChapters} 章`)
  const progressPercent = el('span', 'progress-percent', `${progress}%`)
  progressInfo.appendChild(progressText)
  progressInfo.appendChild(progressPercent)

  const progressBar = el('div', 'progress-bar')
  const progressFill = el('div', 'progress-fill')
  progressFill.style.width = `${progress}%`
  progressFill.style.backgroundColor = STATUS_COLORS[book.status]
  progressBar.appendChild(progressFill)

  progressSection.appendChild(progressInfo)
  progressSection.appendChild(progressBar)

  const info = el('div', 'book-info')
  
  if (book.plannedDate) {
    const daysUntil = getDaysUntil(book.plannedDate)
    let dateClass = 'planned-date'
    let dateText = `计划：${formatDate(book.plannedDate)}`
    
    if (book.status !== 'completed') {
      if (daysUntil < 0) {
        dateClass += ' overdue'
        dateText += ` (逾期${Math.abs(daysUntil)}天)`
      } else if (daysUntil <= 3) {
        dateClass += ' urgent'
        dateText += ` (还剩${daysUntil}天)`
      }
    }
    
    const dateEl = el('span', dateClass, dateText)
    info.appendChild(dateEl)
  }

  const actions = el('div', 'book-actions')
  const editBtn = el('button', 'btn btn-sm btn-outline', '编辑')
  editBtn.addEventListener('click', () => onEdit(book))
  
  const duplicateBtn = el('button', 'btn btn-sm btn-outline', '复制')
  duplicateBtn.addEventListener('click', () => onDuplicate(book.id))
  
  const deleteBtn = el('button', 'btn btn-sm btn-danger', '删除')
  deleteBtn.addEventListener('click', () => {
    if (confirm(`确定要删除《${book.title}》吗？`)) {
      onDelete(book.id)
    }
  })

  actions.appendChild(editBtn)
  actions.appendChild(duplicateBtn)
  actions.appendChild(deleteBtn)

  if (book.highlights.trim()) {
    const highlightsSection = el('div', 'book-highlights')
    const highlightsLabel = el('span', 'highlights-label', '📝 有摘录')
    highlightsSection.appendChild(highlightsLabel)
    info.appendChild(highlightsSection)
  }

  card.appendChild(header)
  card.appendChild(meta)
  card.appendChild(statusBadge)
  card.appendChild(progressSection)
  card.appendChild(info)
  card.appendChild(actions)

  return card
}
