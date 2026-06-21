import type { Book } from '../types/book'

const STORAGE_KEY = 'reading_plan_books'

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export function getBooks(): Book[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveBooks(books: Book[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books))
}

export function addBook(book: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>): Book {
  const books = getBooks()
  const now = new Date().toISOString()
  const newBook: Book = {
    ...book,
    id: generateId(),
    createdAt: now,
    updatedAt: now
  }
  books.push(newBook)
  saveBooks(books)
  return newBook
}

export function updateBook(id: string, updates: Partial<Book>): Book | null {
  const books = getBooks()
  const index = books.findIndex(b => b.id === id)
  if (index === -1) return null
  
  books[index] = {
    ...books[index],
    ...updates,
    id: books[index].id,
    createdAt: books[index].createdAt,
    updatedAt: new Date().toISOString()
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
      return { ...book, status, updatedAt: now }
    }
    return book
  })
  saveBooks(updated)
}

export function getAllTopics(): string[] {
  const books = getBooks()
  const topics = new Set(books.map(b => b.topic).filter(t => t))
  return Array.from(topics).sort()
}
