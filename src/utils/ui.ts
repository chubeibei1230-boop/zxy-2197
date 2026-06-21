import type { ReadingStatus } from '../types/book'

export const STATUS_LABELS: Record<ReadingStatus, string> = {
  not_started: '未开始',
  reading: '阅读中',
  completed: '已完成',
  paused: '已暂停',
  reviewing: '复盘中'
}

export const STATUS_COLORS: Record<ReadingStatus, string> = {
  not_started: '#9ca3af',
  reading: '#3b82f6',
  completed: '#22c55e',
  paused: '#f59e0b',
  reviewing: '#8b5cf6'
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

export function getDaysUntil(dateStr: string): number {
  if (!dateStr) return Infinity
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function el(tag: string, className?: string, text?: string): HTMLElement {
  const element = document.createElement(tag)
  if (className) element.className = className
  if (text !== undefined) element.textContent = text
  return element
}
