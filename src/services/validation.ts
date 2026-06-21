import type { Book, ValidationIssue, WeeklyPlanItem } from '../types/book'
import { getBooks } from './storage'

const RECENT_PLAN_THRESHOLD = 5
const TOO_MANY_PLAN_THRESHOLD = 10

export function validateBook(book: Book, allBooks: Book[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const today = new Date().toISOString().split('T')[0]

  if (book.plannedDate && book.plannedDate < today && book.status !== 'completed') {
    issues.push({
      type: 'overdue',
      severity: 'warning',
      message: `《${book.title}》计划完成日期已过但未完成`,
      bookIds: [book.id]
    })
  }

  if (book.readChapters > book.totalChapters) {
    issues.push({
      type: 'chapters_exceed',
      severity: 'error',
      message: `《${book.title}》已读章节数(${book.readChapters})超过总章节数(${book.totalChapters})`,
      bookIds: [book.id]
    })
  }

  const duplicates = allBooks.filter(
    b => b.title === book.title && b.id !== book.id
  )
  if (duplicates.length > 0) {
    issues.push({
      type: 'duplicate',
      severity: 'warning',
      message: `《${book.title}》存在重复的书名`,
      bookIds: [book.id, ...duplicates.map(d => d.id)]
    })
  }

  if (book.status === 'completed' && !book.highlights.trim()) {
    issues.push({
      type: 'empty_highlights_reviewed',
      severity: 'warning',
      message: `《${book.title}》已完成但重点摘录为空`,
      bookIds: [book.id]
    })
  }

  return issues
}

export function validateAllBooks(): ValidationIssue[] {
  const books = getBooks()
  const allIssues: ValidationIssue[] = []

  books.forEach(book => {
    const issues = validateBook(book, books)
    allIssues.push(...issues)
  })

  const recentPlans = books.filter(b => {
    if (!b.plannedDate) return false
    const planDate = new Date(b.plannedDate)
    const now = new Date()
    const diffDays = Math.ceil((planDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays >= 0 && diffDays <= RECENT_PLAN_THRESHOLD && b.status !== 'completed'
  })

  if (recentPlans.length > TOO_MANY_PLAN_THRESHOLD) {
    allIssues.push({
      type: 'too_many_plans',
      severity: 'warning',
      message: `近期(${RECENT_PLAN_THRESHOLD}天内)有${recentPlans.length}本未完成的计划，数量较多请注意安排`,
      bookIds: recentPlans.map(b => b.id)
    })
  }

  return allIssues
}

export function calculateProgress(book: Book): number {
  if (book.totalChapters === 0) return 0
  return Math.round((book.readChapters / book.totalChapters) * 100)
}

export function getWeeklyPlan(): WeeklyPlanItem[] {
  const books = getBooks()
  const items: WeeklyPlanItem[] = []

  books.forEach(book => {
    const isCompleted = book.status === 'completed'
    const needsReview = isCompleted && (!book.highlights.trim() || !book.reviewNotes.trim())
    
    if (isCompleted && !needsReview) return

    const remainingChapters = Math.max(0, book.totalChapters - book.readChapters)
    let priority = 0
    let reason = ''

    if (needsReview) {
      priority += 45
      const missingParts = []
      if (!book.highlights.trim()) missingParts.push('摘录')
      if (!book.reviewNotes.trim()) missingParts.push('复盘备注')
      reason = `需补${missingParts.join('和')}`
    } else if (book.status === 'reading') {
      priority += 50
      reason = '正在阅读中'
    } else if (book.status === 'not_started') {
      priority += 20
      reason = '尚未开始'
    } else if (book.status === 'paused') {
      priority += 10
      reason = '已暂停'
    } else if (book.status === 'reviewing') {
      priority += 40
      reason = '复盘中'
    }

    if (book.isFavorite) {
      priority += 30
      reason += ' · 重点书目'
    }

    if (book.plannedDate && !isCompleted) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const planDate = new Date(book.plannedDate)
      const diffDays = Math.ceil((planDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays < 0) {
        priority += 40
        reason += ' · 已逾期'
      } else if (diffDays <= 3) {
        priority += 30
        reason += ` · ${diffDays}天后到期`
      } else if (diffDays <= 7) {
        priority += 20
        reason += ` · ${diffDays}天后到期`
      }
    }

    items.push({
      book,
      priority,
      reason,
      remainingChapters: needsReview ? 0 : remainingChapters
    })
  })

  return items.sort((a, b) => b.priority - a.priority)
}

export function getTotalRemainingChapters(items: WeeklyPlanItem[]): number {
  return items.reduce((sum, item) => sum + item.remainingChapters, 0)
}
