import type { Book, FilterOptions } from '../types/book'
import { calculateProgress } from './validation'

export function filterBooks(books: Book[], filters: FilterOptions): Book[] {
  return books.filter(book => {
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
    case 'favorite':
      sorted.sort((a, b) => {
        if (a.isFavorite === b.isFavorite) return 0
        return a.isFavorite ? -1 : 1
      })
      break
    default:
      sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  if (sortOrder === 'desc') {
    sorted.reverse()
  }

  return sorted
}
