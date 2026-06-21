import type { Book, FilterOptions, ArchiveFilterOptions, ArchiveSummary, ReviewSummary, ReviewFilterOptions } from '../types/book'
import { calculateProgress } from './validation'

export function filterBooks(books: Book[], filters: FilterOptions): Book[] {
  return books.filter(book => {
    if (book.isArchived) {
      return false
    }

    if (filters.topic && book.topic !== filters.topic) {
      return false
    }

    if (filters.status && book.status !== filters.status) {
      return false
    }

    if (filters.plannedDateFrom && book.plannedDate < filters.plannedDateFrom) {
      return false
    }

    if (filters.plannedDateTo && book.plannedDate > filters.plannedDateTo) {
      return false
    }

    const progress = calculateProgress(book)
    if (filters.progressMin > 0 && progress < filters.progressMin) {
      return false
    }
    if (filters.progressMax < 100 && progress > filters.progressMax) {
      return false
    }

    if (filters.hasHighlights !== null) {
      const hasHighlights = book.highlights.trim().length > 0
      if (hasHighlights !== filters.hasHighlights) {
        return false
      }
    }

    return true
  })
}

export function filterArchivedBooks(books: Book[], filters: ArchiveFilterOptions): Book[] {
  return books.filter(book => {
    if (filters.archiveStatus === 'archived' && !book.isArchived) {
      return false
    }
    if (filters.archiveStatus === 'not_archived' && book.isArchived) {
      return false
    }

    if (filters.topic && book.topic !== filters.topic) {
      return false
    }

    if (filters.author && book.author !== filters.author) {
      return false
    }

    if (filters.status && book.status !== filters.status) {
      return false
    }

    if (filters.searchKeyword) {
      const keyword = filters.searchKeyword.toLowerCase()
      const inTitle = book.title.toLowerCase().includes(keyword)
      const inAuthor = book.author.toLowerCase().includes(keyword)
      const inTopic = book.topic.toLowerCase().includes(keyword)
      const inHighlights = book.highlights.toLowerCase().includes(keyword)
      const inReview = book.reviewNotes.toLowerCase().includes(keyword)
      const inConclusion = book.reviewConclusion?.toLowerCase().includes(keyword) ?? false
      const inInsights = book.reviewInsights?.toLowerCase().includes(keyword) ?? false
      const inSummary = book.oneLineSummary?.toLowerCase().includes(keyword) ?? false
      if (!inTitle && !inAuthor && !inTopic && !inHighlights && !inReview && !inConclusion && !inInsights && !inSummary) {
        return false
      }
    }

    return true
  })
}

export function getArchiveSummary(book: Book): ArchiveSummary {
  const progress = calculateProgress(book)
  const highlightsCount = book.highlights.trim()
    ? book.highlights.split('\n').filter(line => line.trim()).length
    : 0
  return {
    finalProgress: progress,
    completionTime: book.completedAt,
    highlightsCount,
    hasReviewNotes: book.reviewNotes.trim().length > 0
  }
}

export function getReviewSummary(book: Book): ReviewSummary {
  const highlightsCount = book.highlights.trim()
    ? book.highlights.split('\n').filter(line => line.trim()).length
    : 0
  
  const hasReviewConclusion = book.reviewConclusion?.trim().length > 0
  const hasReviewInsights = book.reviewInsights?.trim().length > 0
  const hasRecommendationRating = book.recommendationRating > 0
  const hasOneLineSummary = book.oneLineSummary?.trim().length > 0
  const hasReviewNotes = book.reviewNotes?.trim().length > 0
  
  const totalFields = 5
  let completedFields = 0
  if (highlightsCount > 0) completedFields++
  if (hasReviewNotes) completedFields++
  if (hasReviewConclusion) completedFields++
  if (hasReviewInsights) completedFields++
  if (hasRecommendationRating) completedFields++
  if (hasOneLineSummary) completedFields++
  
  const reviewCompleteness = Math.round((completedFields / totalFields) * 100)
  
  return {
    reviewCompleteness,
    highlightsCount,
    hasReviewConclusion,
    hasReviewInsights,
    hasRecommendationRating,
    hasOneLineSummary,
    reviewStatus: book.reviewStatus
  }
}

export function getReadingCycle(book: Book): string {
  if (!book.createdAt || !book.completedAt) return '未知'
  const start = new Date(book.createdAt)
  const end = new Date(book.completedAt)
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  if (days <= 0) return '1天内'
  if (days === 1) return '1天'
  if (days < 30) return `${days}天`
  const months = Math.round(days / 30)
  return months === 1 ? '1个月' : `${months}个月`
}

export function filterReviewBooks(books: Book[], filters: ReviewFilterOptions): Book[] {
  return books.filter(book => {
    if (book.status !== 'completed' && book.status !== 'reviewing' && book.status !== 'reviewed') {
      return false
    }

    if (filters.reviewStatus && book.reviewStatus !== filters.reviewStatus) {
      return false
    }

    if (filters.topic && book.topic !== filters.topic) {
      return false
    }

    if (filters.author && book.author !== filters.author) {
      return false
    }

    if (filters.searchKeyword) {
      const keyword = filters.searchKeyword.toLowerCase()
      const inTitle = book.title.toLowerCase().includes(keyword)
      const inAuthor = book.author.toLowerCase().includes(keyword)
      const inTopic = book.topic.toLowerCase().includes(keyword)
      const inHighlights = book.highlights.toLowerCase().includes(keyword)
      const inReviewNotes = book.reviewNotes.toLowerCase().includes(keyword)
      const inConclusion = (book.reviewConclusion || '').toLowerCase().includes(keyword)
      const inInsights = (book.reviewInsights || '').toLowerCase().includes(keyword)
      const inSummary = (book.oneLineSummary || '').toLowerCase().includes(keyword)
      if (!inTitle && !inAuthor && !inTopic && !inHighlights && !inReviewNotes && !inConclusion && !inInsights && !inSummary) {
        return false
      }
    }

    return true
  })
}

export function sortBooks(books: Book[], sortBy: string, sortOrder: 'asc' | 'desc'): Book[] {
  const sorted = [...books]
  
  switch (sortBy) {
    case 'title':
      sorted.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
      break
    case 'author':
      sorted.sort((a, b) => a.author.localeCompare(b.author, 'zh-CN'))
      break
    case 'topic':
      sorted.sort((a, b) => a.topic.localeCompare(b.topic, 'zh-CN'))
      break
    case 'progress':
      sorted.sort((a, b) => calculateProgress(a) - calculateProgress(b))
      break
    case 'plannedDate':
      sorted.sort((a, b) => {
        if (!a.plannedDate) return 1
        if (!b.plannedDate) return -1
        return a.plannedDate.localeCompare(b.plannedDate)
      })
      break
    case 'createdAt':
      sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      break
    case 'updatedAt':
      sorted.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
      break
    case 'archivedAt':
      sorted.sort((a, b) => {
        if (!a.archivedAt) return 1
        if (!b.archivedAt) return -1
        return a.archivedAt.localeCompare(b.archivedAt)
      })
      break
    case 'completedAt':
      sorted.sort((a, b) => {
        if (!a.completedAt) return 1
        if (!b.completedAt) return -1
        return a.completedAt.localeCompare(b.completedAt)
      })
      break
    case 'favorite':
      sorted.sort((a, b) => {
        if (a.isFavorite === b.isFavorite) return 0
        return a.isFavorite ? -1 : 1
      })
      break
    case 'reviewCompleteness':
      sorted.sort((a, b) => getReviewSummary(a).reviewCompleteness - getReviewSummary(b).reviewCompleteness)
      break
    case 'recommendationRating':
      sorted.sort((a, b) => (a.recommendationRating || 0) - (b.recommendationRating || 0))
      break
    default:
      sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  if (sortOrder === 'desc') {
    sorted.reverse()
  }

  return sorted
}
