import type { Book, Milestone } from '../types/book'

const STORAGE_KEY = 'reading_plan_books'

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export function getBooks(): Book[] {
  try {
    const data = sessionStorage.getItem(STORAGE_KEY)
    const books: Book[] = data ? JSON.parse(data) : []
    return books.map(book => ({
      ...book,
      isArchived: book.isArchived ?? false,
      archivedAt: book.archivedAt ?? null,
      completedAt: book.completedAt ?? null,
      milestones: (book.milestones ?? []).map((m: Milestone) => ({
        ...m,
        status: m.status ?? 'pending',
        completedAt: m.completedAt ?? null,
        notes: m.notes ?? '',
        progressThreshold: m.progressThreshold ?? 0,
        autoCompleted: m.autoCompleted ?? false
      }))
    }))
  } catch {
    return []
  }
}

export function getActiveBooks(): Book[] {
  return getBooks().filter(book => !book.isArchived)
}

export function getArchivedBooks(): Book[] {
  return getBooks().filter(book => book.isArchived)
}

export function saveBooks(books: Book[]): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(books))
}

export function addBook(
  book: Omit<Book, 'id' | 'createdAt' | 'updatedAt' | 'isArchived' | 'archivedAt' | 'completedAt' | 'milestones'>,
  milestones?: Milestone[]
): Book {
  const books = getBooks()
  const now = new Date().toISOString()
  const completedAt = (book.status === 'completed' || book.status === 'reviewed') ? now : null
  let finalMilestones: Milestone[] = (milestones || []).map(m => ({
    ...m,
    createdAt: m.createdAt || now,
    updatedAt: now
  }))
  const newBook: Book = {
    ...book,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
    isArchived: false,
    archivedAt: null,
    completedAt,
    milestones: finalMilestones
  }
  books.push(newBook)
  saveBooks(books)
  return newBook
}

export function updateBook(id: string, updates: Partial<Book>): Book | null {
  const books = getBooks()
  const index = books.findIndex(b => b.id === id)
  if (index === -1) return null

  const original = books[index]
  const now = new Date().toISOString()
  let completedAt = original.completedAt
  if (!completedAt && (updates.status === 'completed' || updates.status === 'reviewed')) {
    completedAt = now
  }
  if (updates.status && updates.status !== 'completed' && updates.status !== 'reviewed') {
    completedAt = null
  }

  let milestones: Milestone[] = updates.milestones !== undefined
    ? [...updates.milestones]
    : [...(original.milestones || [])]

  const statusChanged = updates.status !== undefined && updates.status !== original.status
  const progressChanged = updates.readChapters !== undefined || updates.totalChapters !== undefined

  if (progressChanged) {
    const newRead = updates.readChapters !== undefined ? updates.readChapters : original.readChapters
    const newTotal = updates.totalChapters !== undefined ? updates.totalChapters : original.totalChapters
    const progress = newTotal > 0 ? Math.round((newRead / newTotal) * 100) : 0

    milestones = milestones.map(m => {
      if (m.progressThreshold <= 0) return { ...m, updatedAt: now }

      if (m.status === 'pending' && progress >= m.progressThreshold) {
        return {
          ...m,
          status: 'completed' as const,
          completedAt: now,
          autoCompleted: true,
          updatedAt: now
        }
      }
      if (m.status === 'completed' && m.autoCompleted && progress < m.progressThreshold) {
        return {
          ...m,
          status: 'pending' as const,
          completedAt: null,
          autoCompleted: false,
          updatedAt: now
        }
      }
      return { ...m, updatedAt: now }
    })
  } else if (!updates.milestones) {
    milestones = milestones.map(m => ({ ...m, updatedAt: now }))
  }
  
  books[index] = {
    ...books[index],
    ...updates,
    id: books[index].id,
    createdAt: books[index].createdAt,
    updatedAt: now,
    completedAt,
    milestones
  }
  saveBooks(books)
  return books[index]
}

export function deleteBook(id: string): boolean {
  const books = getBooks()
  const filtered = books.filter(b => b.id !== id)
  if (filtered.length === books.length) return false
  saveBooks(filtered)
  return true
}

export function getBookById(id: string): Book | undefined {
  const books = getBooks()
  return books.find(b => b.id === id)
}

export function duplicateBook(id: string): Book | null {
  const book = getBookById(id)
  if (!book) return null
  
  const newBook = addBook({
    title: book.title + ' (副本)',
    author: book.author,
    topic: book.topic,
    totalChapters: book.totalChapters,
    readChapters: 0,
    plannedDate: book.plannedDate,
    status: 'not_started',
    highlights: '',
    reviewNotes: '',
    isFavorite: false
  })
  return newBook
}

export function batchUpdateStatus(ids: string[], status: Book['status']): void {
  const books = getBooks()
  const now = new Date().toISOString()
  const updated = books.map(book => {
    if (ids.includes(book.id)) {
      let completedAt = book.completedAt
      if (!completedAt && (status === 'completed' || status === 'reviewed')) {
        completedAt = now
      }
      if (status !== 'completed' && status !== 'reviewed') {
        completedAt = null
      }
      return { ...book, status, updatedAt: now, completedAt }
    }
    return book
  })
  saveBooks(updated)
}

export function archiveBook(id: string): Book | null {
  const book = getBookById(id)
  if (!book) return null
  if (book.status !== 'completed' && book.status !== 'reviewed') {
    return null
  }
  const now = new Date().toISOString()
  return updateBook(id, {
    isArchived: true,
    archivedAt: now,
    completedAt: book.completedAt || now
  })
}

export function batchArchiveBooks(ids: string[]): number {
  let count = 0
  ids.forEach(id => {
    if (archiveBook(id)) count++
  })
  return count
}

export function unarchiveBook(id: string): Book | null {
  const book = getBookById(id)
  if (!book || !book.isArchived) return null
  return updateBook(id, {
    isArchived: false,
    archivedAt: null
  })
}

export function batchUnarchiveBooks(ids: string[]): number {
  let count = 0
  ids.forEach(id => {
    if (unarchiveBook(id)) count++
  })
  return count
}

export function getAllTopics(): string[] {
  const books = getBooks()
  const topics = new Set(books.map(b => b.topic).filter(t => t))
  return Array.from(topics).sort()
}

export function getAllAuthors(): string[] {
  const books = getBooks()
  const authors = new Set(books.map(b => b.author).filter(t => t))
  return Array.from(authors).sort()
}

export function addMilestone(bookId: string, milestone: Omit<Milestone, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'completedAt'>): Book | null {
  const books = getBooks()
  const index = books.findIndex(b => b.id === bookId)
  if (index === -1) return null
  const now = new Date().toISOString()
  const newMilestone: Milestone = {
    ...milestone,
    id: generateId(),
    status: 'pending',
    completedAt: null,
    createdAt: now,
    updatedAt: now
  }
  const milestones = [...(books[index].milestones || []), newMilestone]
  books[index] = { ...books[index], milestones, updatedAt: now }
  saveBooks(books)
  return books[index]
}

export function updateMilestone(bookId: string, milestoneId: string, updates: Partial<Milestone>): Book | null {
  const books = getBooks()
  const index = books.findIndex(b => b.id === bookId)
  if (index === -1) return null
  const now = new Date().toISOString()
  const milestones = (books[index].milestones || []).map(m => {
    if (m.id === milestoneId) {
      const updated = { ...m, ...updates, updatedAt: now }
      if (updates.status === 'completed' && !m.completedAt) {
        updated.completedAt = now
      }
      if (updates.status === 'pending' || updates.status === 'skipped') {
        updated.completedAt = null
      }
      return updated
    }
    return m
  })
  books[index] = { ...books[index], milestones, updatedAt: now }
  saveBooks(books)
  return books[index]
}

export function deleteMilestone(bookId: string, milestoneId: string): Book | null {
  const books = getBooks()
  const index = books.findIndex(b => b.id === bookId)
  if (index === -1) return null
  const now = new Date().toISOString()
  const milestones = (books[index].milestones || []).filter(m => m.id !== milestoneId)
  books[index] = { ...books[index], milestones, updatedAt: now }
  saveBooks(books)
  return books[index]
}

export function batchCompleteMilestones(milestoneIds: string[]): number {
  const books = getBooks()
  const now = new Date().toISOString()
  let count = 0
  books.forEach((book, i) => {
    let changed = false
    const milestones = (book.milestones || []).map(m => {
      if (milestoneIds.includes(m.id) && m.status === 'pending') {
        count++
        changed = true
        return { ...m, status: 'completed' as const, completedAt: now, updatedAt: now }
      }
      return m
    })
    if (changed) {
      books[i] = { ...book, milestones, updatedAt: now }
    }
  })
  saveBooks(books)
  return count
}

export function getAllMilestones(): { book: Book; milestone: Milestone }[] {
  const books = getBooks()
  const result: { book: Book; milestone: Milestone }[] = []
  books.forEach(book => {
    (book.milestones || []).forEach(milestone => {
      result.push({ book, milestone })
    })
  })
  return result
}

export function getNextPendingMilestone(book: Book): Milestone | null {
  const now = new Date().toISOString().split('T')[0]
  const pending = (book.milestones || [])
    .filter(m => m.status === 'pending')
    .sort((a, b) => {
      if (a.expectedDate && b.expectedDate) return a.expectedDate.localeCompare(b.expectedDate)
      if (a.expectedDate) return -1
      if (b.expectedDate) return 1
      return a.progressThreshold - b.progressThreshold
    })
  if (pending.length === 0) return null
  return pending[0]
}

export function getMilestonesByCategory(category: 'upcoming' | 'overdue' | 'completed' | 'skipped'): { book: Book; milestone: Milestone }[] {
  const all = getAllMilestones()
  const today = new Date().toISOString().split('T')[0]
  return all.filter(({ milestone }) => {
    switch (category) {
      case 'upcoming':
        return milestone.status === 'pending' && milestone.expectedDate && milestone.expectedDate >= today
      case 'overdue':
        return milestone.status === 'pending' && milestone.expectedDate && milestone.expectedDate < today
      case 'completed':
        return milestone.status === 'completed'
      case 'skipped':
        return milestone.status === 'skipped'
      default:
        return false
    }
  })
}

export function getArchivedTopics(): string[] {
  const books = getArchivedBooks()
  const topics = new Set(books.map(b => b.topic).filter(t => t))
  return Array.from(topics).sort()
}

export function getArchivedAuthors(): string[] {
  const books = getArchivedBooks()
  const authors = new Set(books.map(b => b.author).filter(t => t))
  return Array.from(authors).sort()
}
