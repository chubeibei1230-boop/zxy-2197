export type ReadingStatus = 'not_started' | 'reading' | 'completed' | 'paused' | 'reviewing' | 'reviewed'

export type ArchiveStatus = 'all' | 'archived' | 'not_archived'

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
  isArchived: boolean
  archivedAt: string | null
  completedAt: string | null
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

export interface ArchiveFilterOptions {
  topic: string
  author: string
  status: ReadingStatus | ''
  archiveStatus: ArchiveStatus
  searchKeyword: string
}

export interface ArchiveSummary {
  finalProgress: number
  completionTime: string | null
  highlightsCount: number
  hasReviewNotes: boolean
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

export type ViewMode = 'list' | 'weekly' | 'archive'
