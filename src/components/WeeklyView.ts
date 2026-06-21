import type { WeeklyPlanItem } from '../types/book'
import { getWeeklyPlan, getTotalRemainingChapters } from '../services/validation'
import { getNextPendingMilestone } from '../services/storage'
import { STATUS_LABELS, STATUS_COLORS, REVIEW_STATUS_LABELS, REVIEW_STATUS_COLORS, formatDate, getDaysUntil, el } from '../utils/ui'

export function createWeeklyView(): HTMLElement {
  const container = el('div', 'weekly-view')

  const header = el('div', 'weekly-header')
  const title = el('h2', 'weekly-title', '📅 本周阅读清单')
  const subtitle = el('p', 'weekly-subtitle', '按优先级排序，帮你规划本周阅读重点')
  header.appendChild(title)
  header.appendChild(subtitle)

  const items = getWeeklyPlan()
  const totalRemaining = getTotalRemainingChapters(items)

  const summary = el('div', 'weekly-summary')
  const countEl = el('div', 'summary-item', '')
  countEl.innerHTML = `<strong>${items.length}</strong><span>本书待处理</span>`
  const chaptersEl = el('div', 'summary-item', '')
  chaptersEl.innerHTML = `<strong>${totalRemaining}</strong><span>剩余章节</span>`
  summary.appendChild(countEl)
  summary.appendChild(chaptersEl)

  const list = el('div', 'weekly-list')

  if (items.length === 0) {
    const empty = el('div', 'empty-state', '🎉 所有书籍都已完成！')
    list.appendChild(empty)
  } else {
    items.forEach((item, index) => {
      const card = createWeeklyItemCard(item, index + 1)
      list.appendChild(card)
    })
  }

  container.appendChild(header)
  container.appendChild(summary)
  container.appendChild(list)

  return container
}

function createWeeklyItemCard(item: WeeklyPlanItem, rank: number): HTMLElement {
  const { book, priority, reason, remainingChapters } = item

  const card = el('div', `weekly-item priority-${Math.min(Math.ceil(priority / 20), 5)}`)

  const rankBadge = el('div', 'rank-badge', rank.toString())

  const content = el('div', 'weekly-item-content')

  const header = el('div', 'weekly-item-header')
  const title = el('h3', 'weekly-item-title', book.title)
  
  if (book.isFavorite) {
    const star = el('span', 'favorite-star', '★')
    title.appendChild(star)
  }

  const statusBadge = el('span', 'status-badge-sm', STATUS_LABELS[book.status])
  statusBadge.style.backgroundColor = STATUS_COLORS[book.status] + '20'
  statusBadge.style.color = STATUS_COLORS[book.status]
  
  let reviewStatusBadge: HTMLElement | null = null
  if (book.status === 'completed' || book.status === 'reviewing' || book.status === 'reviewed') {
    reviewStatusBadge = el('span', 'status-badge-sm', REVIEW_STATUS_LABELS[book.reviewStatus])
    reviewStatusBadge.style.backgroundColor = REVIEW_STATUS_COLORS[book.reviewStatus] + '20'
    reviewStatusBadge.style.color = REVIEW_STATUS_COLORS[book.reviewStatus]
  }
  
  header.appendChild(title)
  header.appendChild(statusBadge)
  if (reviewStatusBadge) header.appendChild(reviewStatusBadge)

  const meta = el('div', 'weekly-item-meta')
  const author = el('span', 'weekly-item-author', book.author || '未知作者')
  const topic = el('span', 'weekly-item-topic', book.topic || '未分类')
  meta.appendChild(author)
  meta.appendChild(topic)

  const reasonEl = el('div', 'weekly-item-reason', `💡 ${reason}`)

  const nextMilestone = getNextPendingMilestone(book)
  let milestoneEl: HTMLElement | null = null
  if (nextMilestone) {
    let milestoneText = `🎯 ${nextMilestone.title}`
    if (nextMilestone.expectedDate) {
      const days = getDaysUntil(nextMilestone.expectedDate)
      if (days < 0) milestoneText += ` (逾期${Math.abs(days)}天)`
      else if (days <= 3) milestoneText += ` (还剩${days}天)`
      else milestoneText += ` (${formatDate(nextMilestone.expectedDate)})`
    }
    if (nextMilestone.progressThreshold > 0) {
      milestoneText += ` · ${nextMilestone.progressThreshold}%`
    }
    milestoneEl = el('div', 'weekly-item-milestone', milestoneText)
  }

  const progress = el('div', 'weekly-item-progress')
  const progressText = el('span', 'weekly-progress-text', 
    `已读 ${book.readChapters}/${book.totalChapters} 章 · 剩余 ${remainingChapters} 章`)
  progress.appendChild(progressText)

  if (book.plannedDate) {
    const dateEl = el('span', 'weekly-item-date', `计划完成：${formatDate(book.plannedDate)}`)
    progress.appendChild(dateEl)
  }

  const progressBar = el('div', 'progress-bar-sm')
  const progressFill = el('div', 'progress-fill-sm')
  const percent = book.totalChapters > 0 ? Math.round((book.readChapters / book.totalChapters) * 100) : 0
  progressFill.style.width = `${percent}%`
  progressFill.style.backgroundColor = STATUS_COLORS[book.status]
  progressBar.appendChild(progressFill)

  content.appendChild(header)
  content.appendChild(meta)
  content.appendChild(reasonEl)
  if (milestoneEl) content.appendChild(milestoneEl)
  content.appendChild(progress)
  content.appendChild(progressBar)

  card.appendChild(rankBadge)
  card.appendChild(content)

  return card
}
