export type ReadingStatus = 'not_started' | 'reading' | 'completed' | 'paused' | 'reviewing' | 'reviewed'

export interface Book {
  id: string
  title: string
  author: string
  topic: string
  totalChapters: number
  readChapters: number
  plannedDate: string
  status: ReadingStatus
  highlights: string
  reviewNotes: string
  isFavorite: boolean
  createdAt: string
  updatedAt: string
}

export interface FilterOptions {
  topic: string
  status: ReadingStatus | ''
  plannedDateFrom: string
  plannedDateTo: string
  progressMin: number
  progressMax: number
  hasHighlights: boolean | null
}

export interface ValidationIssue {
  type: 'overdue' | 'chapters_exceed' | 'duplicate' | 'empty_highlights_reviewed' | 'too_many_plans'
  severity: 'warning' | 'error'
  message: string
  bookIds: string[]
}

export interface WeeklyPlanItem {
  book: Book
  priority: number
  reason: string
  remainingChapters: number
}

export type ViewMode = 'list' | 'weekly'
