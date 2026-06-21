import type { Book } from '../types/book'
import { getActiveBooks, getArchivedBooks, getBooks } from './storage'

export function exportToJSON(books?: Book[]): void {
  const exportBooks = books ?? getActiveBooks()
  const data = {
    exportedAt: new Date().toISOString(),
    scope: 'active',
    count: exportBooks.length,
    books: exportBooks
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  downloadBlob(blob, `reading-plan-${formatDate(new Date())}.json`)
}

export function exportArchivedToJSON(books?: Book[]): void {
  const exportBooks = books ?? getArchivedBooks()
  const data = {
    exportedAt: new Date().toISOString(),
    scope: 'archived',
    count: exportBooks.length,
    books: exportBooks
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  downloadBlob(blob, `reading-archive-${formatDate(new Date())}.json`)
}

export function exportAllToJSON(): void {
  const exportBooks = getBooks()
  const data = {
    exportedAt: new Date().toISOString(),
    scope: 'all',
    count: exportBooks.length,
    activeCount: exportBooks.filter(b => !b.isArchived).length,
    archivedCount: exportBooks.filter(b => b.isArchived).length,
    books: exportBooks
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  downloadBlob(blob, `reading-all-${formatDate(new Date())}.json`)
}

export function exportToCSV(books?: Book[]): void {
  const exportBooks = books ?? getActiveBooks()
  const headers = [
    '书名', '作者', '主题', '总章节数', '已读章节',
    '计划完成日期', '阅读状态', '重点摘录', '复盘备注',
    '是否收藏', '里程碑数', '里程碑概要', '创建时间', '更新时间'
  ]
  
  const statusMap: Record<string, string> = {
    not_started: '未开始',
    reading: '阅读中',
    completed: '已完成',
    paused: '已暂停',
    reviewing: '复盘中',
    reviewed: '已复盘'
  }

  const rows = exportBooks.map(book => {
    const milestones = book.milestones || []
    const milestoneSummary = milestones.map(m =>
      `${m.title}(${m.status === 'completed' ? '完成' : m.status === 'skipped' ? '跳过' : '待完成'}${m.expectedDate ? ',' + m.expectedDate : ''})`
    ).join('; ')
    return [
      book.title,
      book.author,
      book.topic,
      book.totalChapters.toString(),
      book.readChapters.toString(),
      book.plannedDate,
      statusMap[book.status] || book.status,
      escapeCSV(book.highlights),
      escapeCSV(book.reviewNotes),
      book.isFavorite ? '是' : '否',
      milestones.length.toString(),
      escapeCSV(milestoneSummary),
      book.createdAt,
      book.updatedAt
    ]
  })

  const csvContent = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n')

  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, `reading-plan-${formatDate(new Date())}.csv`)
}

export function exportArchivedToCSV(books?: Book[]): void {
  const exportBooks = books ?? getArchivedBooks()
  const headers = [
    '书名', '作者', '主题', '总章节数', '最终已读章节', '最终进度(%)',
    '计划完成日期', '阅读状态', '完成时间', '归档时间',
    '重点摘录(行数)', '重点摘录内容', '复盘备注',
    '是否收藏', '里程碑数', '里程碑概要', '创建时间', '更新时间'
  ]
  
  const statusMap: Record<string, string> = {
    not_started: '未开始',
    reading: '阅读中',
    completed: '已完成',
    paused: '已暂停',
    reviewing: '复盘中',
    reviewed: '已复盘'
  }

  const rows = exportBooks.map(book => {
    const progress = book.totalChapters > 0
      ? Math.round((book.readChapters / book.totalChapters) * 100)
      : 0
    const highlightsCount = book.highlights.trim()
      ? book.highlights.split('\n').filter(l => l.trim()).length
      : 0
    const milestones = book.milestones || []
    const milestoneSummary = milestones.map(m =>
      `${m.title}(${m.status === 'completed' ? '完成' : m.status === 'skipped' ? '跳过' : '待完成'}${m.expectedDate ? ',' + m.expectedDate : ''})`
    ).join('; ')
    return [
      book.title,
      book.author,
      book.topic,
      book.totalChapters.toString(),
      book.readChapters.toString(),
      progress.toString(),
      book.plannedDate,
      statusMap[book.status] || book.status,
      book.completedAt || '',
      book.archivedAt || '',
      highlightsCount.toString(),
      escapeCSV(book.highlights),
      escapeCSV(book.reviewNotes),
      book.isFavorite ? '是' : '否',
      milestones.length.toString(),
      escapeCSV(milestoneSummary),
      book.createdAt,
      book.updatedAt
    ]
  })

  const csvContent = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n')

  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, `reading-archive-${formatDate(new Date())}.csv`)
}

function escapeCSV(text: string): string {
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

export function importFromJSON(file: File): Promise<Book[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content)
        const books = data.books || data
        if (!Array.isArray(books)) {
          reject(new Error('文件格式不正确'))
          return
        }
        const validBooks: Book[] = books.map(book => ({
          ...book,
          isArchived: book.isArchived ?? false,
          archivedAt: book.archivedAt ?? null,
          completedAt: book.completedAt ?? null,
          milestones: (book.milestones ?? []).map((m: any) => ({
            ...m,
            status: m.status ?? 'pending',
            completedAt: m.completedAt ?? null,
            notes: m.notes ?? '',
            progressThreshold: m.progressThreshold ?? 0
          }))
        }))
        resolve(validBooks)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file)
  })
}
