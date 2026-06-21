import type { Book } from '../types/book'
import { getBooks } from './storage'

export function exportToJSON(): void {
  const books = getBooks()
  const data = {
    exportedAt: new Date().toISOString(),
    count: books.length,
    books
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  downloadBlob(blob, `reading-plan-${formatDate(new Date())}.json`)
}

export function exportToCSV(): void {
  const books = getBooks()
  const headers = [
    '书名', '作者', '主题', '总章节数', '已读章节',
    '计划完成日期', '阅读状态', '重点摘录', '复盘备注',
    '是否收藏', '创建时间', '更新时间'
  ]
  
  const statusMap: Record<string, string> = {
    not_started: '未开始',
    reading: '阅读中',
    completed: '已完成',
    paused: '已暂停',
    reviewing: '复盘中'
  }

  const rows = books.map(book => [
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
    book.createdAt,
    book.updatedAt
  ])

  const csvContent = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n')

  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, `reading-plan-${formatDate(new Date())}.csv`)
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
        resolve(books)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file)
  })
}
