import type { Book } from '../types/book'
import { calculateProgress } from '../services/validation'
import { getNextPendingMilestone } from '../services/storage'
import { STATUS_LABELS, STATUS_COLORS, formatDate, getDaysUntil, el } from '../utils/ui'

export interface BookCardOptions {
  book: Book
  selected: boolean
  onSelect: (id: string) => void
  onEdit: (book: Book) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onToggleFavorite: (id: string) => void
  onArchive?: (id: string) => void
  onUnarchive?: (id: string) => void
  isArchiveView?: boolean
}

export function createBookCard(options: BookCardOptions): HTMLElement {
  const { book, selected, onSelect, onEdit, onDelete, onDuplicate, onToggleFavorite, onArchive, onUnarchive, isArchiveView = false } = options

  const card = el('div', `book-card ${selected ? 'selected' : ''} ${book.isFavorite ? 'favorite' : ''} ${book.isArchived ? 'archived' : ''}`)
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

  const statusRow = el('div', 'status-row')
  const statusBadge = el('span', 'status-badge', STATUS_LABELS[book.status])
  statusBadge.style.backgroundColor = STATUS_COLORS[book.status] + '20'
  statusBadge.style.color = STATUS_COLORS[book.status]
  statusRow.appendChild(statusBadge)

  if (book.isArchived) {
    const archivedBadge = el('span', 'status-badge archived-badge', '📦 已归档')
    statusRow.appendChild(archivedBadge)
  }
  statusBadge.style.marginBottom = '0'
  statusBadge.style.marginRight = '8px'

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
    
    if (!isArchiveView && book.status !== 'completed' && book.status !== 'reviewed') {
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

  if (book.completedAt) {
    const completedEl = el('span', 'completed-date', `完成：${formatDate(book.completedAt)}`)
    info.appendChild(completedEl)
  }

  if (book.archivedAt) {
    const archivedEl = el('span', 'archived-date', `归档：${formatDate(book.archivedAt)}`)
    info.appendChild(archivedEl)
  }

  if (book.highlights.trim()) {
    const highlightsSection = el('div', 'book-highlights')
    const highlightsLabel = el('span', 'highlights-label', '📝 有摘录')
    highlightsSection.appendChild(highlightsLabel)
    info.appendChild(highlightsSection)
  }

  if (book.reviewNotes.trim()) {
    const reviewSection = el('div', 'book-review')
    const reviewLabel = el('span', 'review-label', '💭 有复盘')
    reviewSection.appendChild(reviewLabel)
    info.appendChild(reviewSection)
  }

  const nextMilestone = getNextPendingMilestone(book)
  if (nextMilestone && !isArchiveView) {
    const milestoneSection = el('div', 'book-milestone-hint')
    let milestoneText = `🎯 ${nextMilestone.title}`
    if (nextMilestone.expectedDate) {
      const daysUntilMilestone = getDaysUntil(nextMilestone.expectedDate)
      if (daysUntilMilestone < 0) {
        milestoneSection.classList.add('milestone-overdue')
        milestoneText += ` (逾期${Math.abs(daysUntilMilestone)}天)`
      } else if (daysUntilMilestone <= 3) {
        milestoneSection.classList.add('milestone-urgent')
        milestoneText += ` (还剩${daysUntilMilestone}天)`
      } else {
        milestoneSection.classList.add('milestone-upcoming')
        milestoneText += ` (${formatDate(nextMilestone.expectedDate)})`
      }
    }
    if (nextMilestone.progressThreshold > 0) {
      milestoneText += ` · ${nextMilestone.progressThreshold}%`
    }
    const milestoneLabel = el('span', 'milestone-hint-text', milestoneText)
    milestoneSection.appendChild(milestoneLabel)
    info.appendChild(milestoneSection)
  }

  const actions = el('div', 'book-actions')
  
  if (isArchiveView) {
    const editBtn = el('button', 'btn btn-sm btn-outline', '查看详情')
    editBtn.addEventListener('click', () => onEdit(book))
    
    const unarchiveBtn = el('button', 'btn btn-sm btn-primary', '↩ 恢复')
    unarchiveBtn.title = '恢复到正常计划中'
    unarchiveBtn.addEventListener('click', () => {
      if (confirm(`确定要将《${book.title}》恢复到正常计划吗？`)) {
        if (onUnarchive) onUnarchive(book.id)
      }
    })

    const deleteBtn = el('button', 'btn btn-sm btn-danger', '删除')
    deleteBtn.addEventListener('click', () => {
      if (confirm(`确定要删除《${book.title}》吗？归档内容也会被清除。`)) {
        onDelete(book.id)
      }
    })

    actions.appendChild(editBtn)
    actions.appendChild(unarchiveBtn)
    actions.appendChild(deleteBtn)
  } else {
    const editBtn = el('button', 'btn btn-sm btn-outline', '编辑')
    editBtn.addEventListener('click', () => onEdit(book))
    
    const duplicateBtn = el('button', 'btn btn-sm btn-outline', '复制')
    duplicateBtn.addEventListener('click', () => onDuplicate(book.id))

    const canArchive = book.status === 'completed' || book.status === 'reviewed'
    const archiveBtn = el('button', `btn btn-sm ${canArchive ? 'btn-info' : 'btn-disabled'}`, '📦 归档')
    if (canArchive) {
      archiveBtn.title = '将已完成的书籍移入归档中心'
      archiveBtn.addEventListener('click', () => {
        if (confirm(`确定要将《${book.title}》归档吗？归档后将不再出现在主计划和本周清单中。`)) {
          if (onArchive) onArchive(book.id)
        }
      })
    } else {
      archiveBtn.title = '只有"已完成"或"已复盘"的书籍才能归档'
    }
    
    const deleteBtn = el('button', 'btn btn-sm btn-danger', '删除')
    deleteBtn.addEventListener('click', () => {
      if (confirm(`确定要删除《${book.title}》吗？`)) {
        onDelete(book.id)
      }
    })

    actions.appendChild(editBtn)
    actions.appendChild(duplicateBtn)
    if (canArchive) actions.appendChild(archiveBtn)
    actions.appendChild(deleteBtn)
  }

  card.appendChild(header)
  card.appendChild(meta)
  card.appendChild(statusRow)
  card.appendChild(progressSection)
  card.appendChild(info)
  card.appendChild(actions)

  return card
}
