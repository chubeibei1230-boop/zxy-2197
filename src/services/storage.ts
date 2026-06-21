import type { Book } from '../types/book'

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
      completedAt: book.completedAt ?? null
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

export function addBook(book: Omit<Book, 'id' | 'createdAt' | 'updatedAt' | 'isArchived' | 'archivedAt' | 'completedAt'>): Book {
  const books = getBooks()
  const now = new Date().toISOString()
  const completedAt = (book.status === 'completed' || book.status === 'reviewed') ? now : null
  const newBook: Book = {
    ...book,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
    isArchived: false,
    archivedAt: null,
    completedAt
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
  
  books[index] = {
    ...books[index],
    ...updates,
    id: books[index].id,
    createdAt: books[index].createdAt,
    updatedAt: now,
    completedAt
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
