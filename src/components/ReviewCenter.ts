import type { Book, ReviewFilterOptions, ReviewStatus } from '../types/book'
import {
  getBooks,
  getReviewableBooks,
  getReviewTopics,
  getReviewAuthors,
  getBooksByReviewStatus,
  updateBook,
  batchUpdateReviewStatus,
  archiveBook
} from '../services/storage'
import { filterReviewBooks, sortBooks, getReviewSummary, getReadingCycle } from '../services/filter'
import { calculateProgress } from '../services/validation'
import {
  STATUS_LABELS,
  STATUS_COLORS,
  REVIEW_STATUS_LABELS,
  REVIEW_STATUS_COLORS,
  formatDate,
  el
} from '../utils/ui'

export interface ReviewCenterOptions {
  onBookView: (book: Book) => void
  onBack: () => void
  onDataChange: () => void
}

export function createReviewCenter(options: ReviewCenterOptions): HTMLElement {
  const { onBack, onDataChange } = options

  const container = el('div', 'review-center')

  const state = {
    filters: {
      reviewStatus: '' as ReviewStatus | '',
      topic: '',
      author: '',
      searchKeyword: '',
      sortBy: 'updatedAt',
      sortOrder: 'desc' as 'asc' | 'desc'
    } as ReviewFilterOptions,
    selectedIds: new Set<string>()
  }

  function render(): void {
    container.innerHTML = ''

    const header = createHeader()
    const summary = createSummary()
    const statusTabs = createStatusTabs()
    const filterSection = createFilterSection()
    const toolbar = createToolbar()
    const bookList = createBookList()

    container.appendChild(header)
    container.appendChild(summary)
    container.appendChild(statusTabs)
    container.appendChild(filterSection)
    container.appendChild(toolbar)
    container.appendChild(bookList)
  }

  function createHeader(): HTMLElement {
    const header = el('div', 'review-header')
    
    const backBtn = el('button', 'btn btn-outline review-back-btn', '← 返回')
    backBtn.addEventListener('click', onBack)
    
    const titleGroup = el('div', 'review-title-group')
    const title = el('h2', 'review-title', '💭 阅读复盘中心')
    const subtitle = el('p', 'review-subtitle', '沉淀阅读收获，让每一本书都留下成长的印记')
    titleGroup.appendChild(title)
    titleGroup.appendChild(subtitle)

    const actions = el('div', 'review-header-actions')
    const statsBtn = el('button', 'btn btn-outline', '📊 复盘统计')
    actions.appendChild(statsBtn)

    header.appendChild(backBtn)
    header.appendChild(titleGroup)
    header.appendChild(actions)

    return header
  }

  function createSummary(): HTMLElement {
    const allReviewable = getReviewableBooks()
    const totalCount = allReviewable.length
    const pendingCount = getBooksByReviewStatus('pending').length
    const reviewingCount = getBooksByReviewStatus('reviewing').length
    const reviewedCount = getBooksByReviewStatus('reviewed').length
    
    const avgCompleteness = totalCount > 0
      ? Math.round(allReviewable.reduce((sum, b) => sum + getReviewSummary(b).reviewCompleteness, 0) / totalCount)
      : 0
    const avgRating = totalCount > 0
      ? (allReviewable.reduce((sum, b) => sum + (b.recommendationRating || 0), 0) / totalCount).toFixed(1)
      : '0.0'

    const section = el('div', 'review-summary-section')
    
    const cards = [
      { icon: '📚', label: '可复盘书籍', value: totalCount, unit: '本', color: '#3b82f6' },
      { icon: '⏳', label: '待复盘', value: pendingCount, unit: '本', color: '#f59e0b' },
      { icon: '✍️', label: '复盘中', value: reviewingCount, unit: '本', color: '#8b5cf6' },
      { icon: '✅', label: '已复盘', value: reviewedCount, unit: '本', color: '#059669' },
      { icon: '📊', label: '平均完整度', value: avgCompleteness, unit: '%', color: '#06b6d4' },
      { icon: '⭐', label: '平均推荐', value: avgRating, unit: '', color: '#f59e0b' }
    ]

    cards.forEach(card => {
      const cardEl = el('div', 'review-summary-card')
      const iconEl = el('div', 'summary-icon', card.icon)
      iconEl.style.background = `linear-gradient(135deg, ${card.color}20 0%, ${card.color}30 100%)`
      const contentEl = el('div', 'summary-content')
      const valueEl = el('div', 'summary-value', `${card.value}${card.unit}`)
      valueEl.style.color = card.color
      const labelEl = el('div', 'summary-label', card.label)
      contentEl.appendChild(valueEl)
      contentEl.appendChild(labelEl)
      cardEl.appendChild(iconEl)
      cardEl.appendChild(contentEl)
      section.appendChild(cardEl)
    })

    return section
  }

  function createStatusTabs(): HTMLElement {
    const tabs = el('div', 'review-status-tabs')
    
    const statuses: { value: ReviewStatus | ''; label: string; count: number; color: string }[] = [
      { value: '', label: '全部', count: getReviewableBooks().length, color: '#6b7280' },
      { value: 'pending', label: '待复盘', count: getBooksByReviewStatus('pending').length, color: REVIEW_STATUS_COLORS.pending },
      { value: 'reviewing', label: '复盘中', count: getBooksByReviewStatus('reviewing').length, color: REVIEW_STATUS_COLORS.reviewing },
      { value: 'reviewed', label: '已复盘', count: getBooksByReviewStatus('reviewed').length, color: REVIEW_STATUS_COLORS.reviewed }
    ]

    statuses.forEach(s => {
      const tab = el('button', `review-status-tab ${state.filters.reviewStatus === s.value ? 'active' : ''}`)
      tab.textContent = `${s.label} (${s.count})`
      tab.style.color = state.filters.reviewStatus === s.value ? s.color : ''
      tab.style.borderColor = state.filters.reviewStatus === s.value ? s.color : ''
      tab.style.background = state.filters.reviewStatus === s.value ? `${s.color}15` : ''
      tab.addEventListener('click', () => {
        state.filters.reviewStatus = s.value
        state.selectedIds.clear()
        render()
      })
      tabs.appendChild(tab)
    })

    return tabs
  }

  function createFilterSection(): HTMLElement {
    const section = el('section', 'review-filter-section')
    const panel = el('div', 'review-filter-panel')

    const topics = getReviewTopics()
    const authors = getReviewAuthors()

    const searchGroup = el('div', 'filter-group filter-search-group')
    const searchLabel = el('label', 'filter-label', '🔍 关键词搜索')
    const searchInput = el('input', 'filter-input filter-search-input') as HTMLInputElement
    searchInput.type = 'text'
    searchInput.placeholder = '搜索书名、作者、主题、复盘内容...'
    searchInput.value = state.filters.searchKeyword
    searchInput.addEventListener('input', () => {
      state.filters.searchKeyword = searchInput.value
      state.selectedIds.clear()
      updateList()
    })
    searchGroup.appendChild(searchLabel)
    searchGroup.appendChild(searchInput)

    const topicGroup = createSelectGroup('主题', 'topic', ['', ...topics], ['全部', ...topics], state.filters.topic)
    
    const authorGroup = createSelectGroup('作者', 'author', ['', ...authors], ['全部', ...authors], state.filters.author)

    const resetBtn = el('button', 'btn btn-outline btn-sm filter-reset-btn', '重置筛选')
    resetBtn.addEventListener('click', () => {
      state.filters = {
        reviewStatus: '',
        topic: '',
        author: '',
        searchKeyword: '',
        sortBy: 'updatedAt',
        sortOrder: 'desc'
      }
      state.selectedIds.clear()
      render()
    })

    panel.appendChild(searchGroup)
    panel.appendChild(topicGroup)
    panel.appendChild(authorGroup)
    panel.appendChild(resetBtn)

    section.appendChild(panel)
    return section
  }

  function createToolbar(): HTMLElement {
    const toolbar = el('div', 'list-toolbar review-toolbar')
    
    const leftGroup = el('div', 'toolbar-left')
    
    const selectAllCheckbox = el('input', 'select-all-checkbox') as HTMLInputElement
    selectAllCheckbox.type = 'checkbox'
    const visibleBooks = getFilteredAndSortedBooks()
    const allSelected = visibleBooks.length > 0 && visibleBooks.every(b => state.selectedIds.has(b.id))
    selectAllCheckbox.checked = allSelected
    selectAllCheckbox.addEventListener('change', () => {
      if (selectAllCheckbox.checked) {
        visibleBooks.forEach(b => state.selectedIds.add(b.id))
      } else {
        state.selectedIds.clear()
      }
      render()
    })
    
    const selectAllLabel = el('label', 'select-all-label', '全选') as HTMLLabelElement
    
    const selectedCount = el('span', 'selected-count', 
      state.selectedIds.size > 0 ? `已选 ${state.selectedIds.size} 本` : '')

    if (state.selectedIds.size > 0) {
      const batchStatusSelect = el('select', 'batch-status-select') as HTMLSelectElement
      const statusOptions: { value: ReviewStatus; label: string }[] = [
        { value: 'pending', label: '批量设为待复盘' },
        { value: 'reviewing', label: '批量设为复盘中' },
        { value: 'reviewed', label: '批量设为已复盘' }
      ]
      const defaultOption = document.createElement('option')
      defaultOption.value = ''
      defaultOption.textContent = '批量调整复盘状态...'
      defaultOption.disabled = true
      defaultOption.selected = true
      batchStatusSelect.appendChild(defaultOption)
      
      statusOptions.forEach(opt => {
        const option = document.createElement('option')
        option.value = opt.value
        option.textContent = opt.label
        batchStatusSelect.appendChild(option)
      })

      batchStatusSelect.addEventListener('change', () => {
        if (batchStatusSelect.value) {
          batchUpdateReviewStatus(Array.from(state.selectedIds), batchStatusSelect.value as ReviewStatus)
          state.selectedIds.clear()
          onDataChange()
          render()
        }
      })

      leftGroup.appendChild(selectAllCheckbox)
      leftGroup.appendChild(selectAllLabel)
      leftGroup.appendChild(selectedCount)
      leftGroup.appendChild(batchStatusSelect)
    } else {
      leftGroup.appendChild(selectAllCheckbox)
      leftGroup.appendChild(selectAllLabel)
      leftGroup.appendChild(selectedCount)
    }

    const rightGroup = el('div', 'toolbar-right')

    const sortGroup = el('div', 'sort-group')
    const sortLabel = el('span', 'sort-label', '排序：')
    const sortSelect = el('select', 'sort-select') as HTMLSelectElement
    const sortOptions: Array<{ value: 'updatedAt' | 'completedAt' | 'title' | 'reviewCompleteness' | 'recommendationRating', label: string }> = [
      { value: 'updatedAt', label: '更新时间' },
      { value: 'completedAt', label: '完成时间' },
      { value: 'title', label: '书名' },
      { value: 'reviewCompleteness', label: '复盘完整度' },
      { value: 'recommendationRating', label: '推荐指数' }
    ]
    sortOptions.forEach(opt => {
      const option = document.createElement('option')
      option.value = opt.value
      option.textContent = opt.label
      if (state.filters.sortBy === opt.value) option.selected = true
      sortSelect.appendChild(option)
    })
    sortSelect.addEventListener('change', () => {
      state.filters.sortBy = sortSelect.value as 'updatedAt' | 'completedAt' | 'title' | 'reviewCompleteness' | 'recommendationRating'
      updateList()
    })

    const sortOrderBtn = el('button', 'btn btn-icon', state.filters.sortOrder === 'desc' ? '↓' : '↑')
    sortOrderBtn.title = '切换排序方向'
    sortOrderBtn.addEventListener('click', () => {
      state.filters.sortOrder = state.filters.sortOrder === 'desc' ? 'asc' : 'desc'
      updateList()
    })

    sortGroup.appendChild(sortLabel)
    sortGroup.appendChild(sortSelect)
    sortGroup.appendChild(sortOrderBtn)
    rightGroup.appendChild(sortGroup)

    toolbar.appendChild(leftGroup)
    toolbar.appendChild(rightGroup)

    return toolbar
  }

  function createBookList(): HTMLElement {
    const section = el('section', 'book-list-section review-list-section')
    const books = getFilteredAndSortedBooks()

    if (books.length === 0) {
      const empty = el('div', 'empty-state')
      empty.innerHTML = `
        <div class="empty-icon">💭</div>
        <p>${state.filters.reviewStatus ? '没有找到匹配的复盘书籍' : '还没有可复盘的书籍'}</p>
        <p class="empty-hint">${state.filters.reviewStatus 
          ? '试试调整筛选条件或关键词' 
          : '将书籍标记为"已完成"后，就可以在这里开始复盘了'
        }</p>
      `
      section.appendChild(empty)
      return section
    }

    const grid = el('div', 'review-book-grid')
    books.forEach(book => {
      const card = createReviewCard(book)
      grid.appendChild(card)
    })

    section.appendChild(grid)

    const countInfo = el('div', 'list-footer')
    const allCount = getReviewableBooks().length
    countInfo.textContent = `当前显示 ${books.length} / 共 ${allCount} 本可复盘书籍`
    section.appendChild(countInfo)

    return section
  }

  function createReviewCard(book: Book): HTMLElement {
    const summary = getReviewSummary(book)
    const progress = calculateProgress(book)
    const readingCycle = getReadingCycle(book)

    const card = el('div', `review-book-card ${state.selectedIds.has(book.id) ? 'selected' : ''} ${book.isFavorite ? 'favorite' : ''}`)
    card.dataset.id = book.id

    const header = el('div', 'review-card-header')
    
    const checkbox = el('input', 'book-select') as HTMLInputElement
    checkbox.type = 'checkbox'
    checkbox.checked = state.selectedIds.has(book.id)
    checkbox.addEventListener('change', (e) => {
      e.stopPropagation()
      if (state.selectedIds.has(book.id)) {
        state.selectedIds.delete(book.id)
      } else {
        state.selectedIds.add(book.id)
      }
      render()
    })

    const titleGroup = el('div', 'review-card-title-group')
    const title = el('h3', 'review-card-title', book.title)
    const metaLine = el('div', 'review-card-meta-line')
    const author = el('span', 'review-card-author', `作者：${book.author || '未知'}`)
    const topic = el('span', 'review-card-topic', book.topic || '未分类')
    metaLine.appendChild(author)
    metaLine.appendChild(topic)
    titleGroup.appendChild(title)
    titleGroup.appendChild(metaLine)

    const favoriteBtn = el('button', `btn btn-icon favorite-btn ${book.isFavorite ? 'active' : ''}`, book.isFavorite ? '★' : '☆')
    favoriteBtn.title = book.isFavorite ? '取消收藏' : '收藏'
    favoriteBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      updateBook(book.id, { isFavorite: !book.isFavorite })
      onDataChange()
      render()
    })

    header.appendChild(checkbox)
    header.appendChild(titleGroup)
    header.appendChild(favoriteBtn)

    const statusRow = el('div', 'review-card-status-row')
    const reviewStatusBadge = el('span', 'status-badge', REVIEW_STATUS_LABELS[book.reviewStatus])
    reviewStatusBadge.style.backgroundColor = REVIEW_STATUS_COLORS[book.reviewStatus] + '20'
    reviewStatusBadge.style.color = REVIEW_STATUS_COLORS[book.reviewStatus]
    statusRow.appendChild(reviewStatusBadge)

    const readStatusBadge = el('span', 'status-badge', STATUS_LABELS[book.status])
    readStatusBadge.style.backgroundColor = STATUS_COLORS[book.status] + '20'
    readStatusBadge.style.color = STATUS_COLORS[book.status]
    statusRow.appendChild(readStatusBadge)

    if (book.isArchived) {
      const archivedBadge = el('span', 'status-badge archived-badge', '📦 已归档')
      statusRow.appendChild(archivedBadge)
    }

    const completenessSection = el('div', 'review-completeness-section')
    const completenessHeader = el('div', 'review-completeness-header')
    const completenessLabel = el('span', 'review-completeness-label', '📊 复盘完整度')
    const completenessValue = el('span', 'review-completeness-value', `${summary.reviewCompleteness}%`)
    completenessHeader.appendChild(completenessLabel)
    completenessHeader.appendChild(completenessValue)

    const completenessBar = el('div', 'progress-bar review-completeness-bar')
    const completenessFill = el('div', 'progress-fill')
    const completenessColor = summary.reviewCompleteness >= 80 ? '#059669' : 
                              summary.reviewCompleteness >= 50 ? '#f59e0b' : '#ef4444'
    completenessFill.style.width = `${summary.reviewCompleteness}%`
    completenessFill.style.backgroundColor = completenessColor
    completenessBar.appendChild(completenessFill)

    const completenessFields = el('div', 'review-completeness-fields')
    const fields = [
      { key: 'highlights', label: '摘录', done: summary.highlightsCount > 0 },
      { key: 'notes', label: '备注', done: book.reviewNotes?.trim().length > 0 },
      { key: 'conclusion', label: '结论', done: summary.hasReviewConclusion },
      { key: 'insights', label: '收获', done: summary.hasReviewInsights },
      { key: 'rating', label: '评分', done: summary.hasRecommendationRating },
      { key: 'summary', label: '总结', done: summary.hasOneLineSummary }
    ]
    fields.forEach(f => {
      const fieldBadge = el('span', `review-field-badge ${f.done ? 'done' : ''}`)
      fieldBadge.textContent = `${f.done ? '✓' : '○'} ${f.label}`
      completenessFields.appendChild(fieldBadge)
    })

    completenessSection.appendChild(completenessHeader)
    completenessSection.appendChild(completenessBar)
    completenessSection.appendChild(completenessFields)

    const infoGrid = el('div', 'review-info-grid')
    
    const infoItems = [
      { icon: '📈', label: '完成进度', value: `${progress}%` },
      { icon: '📖', label: '章节阅读', value: `${book.readChapters}/${book.totalChapters}章` },
      { icon: '⏱️', label: '阅读周期', value: readingCycle },
      { icon: '📝', label: '摘录数量', value: `${summary.highlightsCount}条` },
      { icon: '📅', label: '完成时间', value: book.completedAt ? formatDate(book.completedAt) : '未记录' },
      { icon: '⭐', label: '推荐指数', value: book.recommendationRating > 0 ? '★'.repeat(book.recommendationRating) : '未评分' }
    ]

    infoItems.forEach(item => {
      const infoItem = el('div', 'review-info-item')
      const infoIcon = el('span', 'review-info-icon', item.icon)
      const infoContent = el('div', 'review-info-content')
      const infoLabel = el('span', 'review-info-label', item.label)
      const infoValue = el('span', 'review-info-value', item.value)
      infoContent.appendChild(infoLabel)
      infoContent.appendChild(infoValue)
      infoItem.appendChild(infoIcon)
      infoItem.appendChild(infoContent)
      infoGrid.appendChild(infoItem)
    })

    let summarySection: HTMLElement | null = null
    if (book.oneLineSummary?.trim()) {
      summarySection = el('div', 'review-one-line-summary')
      const summaryLabel = el('span', 'review-summary-label', '💡 一句话总结')
      const summaryText = el('p', 'review-summary-text', book.oneLineSummary)
      summarySection.appendChild(summaryLabel)
      summarySection.appendChild(summaryText)
    }

    let timeInfo: HTMLElement | null = null
    if (book.reviewStartedAt) {
      timeInfo = el('div', 'review-time-info')
      const startTime = el('span', 'review-start-time', `开始复盘：${formatDate(book.reviewStartedAt)}`)
      timeInfo.appendChild(startTime)
      if (book.reviewCompletedAt) {
        const completeTime = el('span', 'review-complete-time', `完成复盘：${formatDate(book.reviewCompletedAt)}`)
        timeInfo.appendChild(completeTime)
      }
    }

    const actions = el('div', 'review-card-actions')
    
    const editBtn = el('button', 'btn btn-sm btn-primary', '✍️ 编辑复盘')
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      const modal = createReviewEditModal(book)
      document.body.appendChild(modal)
    })

    const viewBtn = el('button', 'btn btn-sm btn-outline', '查看详情')
    viewBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      const modal = createReviewDetailModal(book, summary)
      document.body.appendChild(modal)
    })

    if (book.reviewStatus === 'pending') {
      const startBtn = el('button', 'btn btn-sm btn-info', '▶ 开始复盘')
      startBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        updateBook(book.id, { reviewStatus: 'reviewing' })
        onDataChange()
        render()
      })
      actions.appendChild(startBtn)
    }

    if (book.reviewStatus === 'reviewing') {
      const finishBtn = el('button', 'btn btn-sm btn-success', '✅ 完成复盘')
      finishBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        if (confirm(`确定要将《${book.title}》标记为"已复盘"吗？`)) {
          updateBook(book.id, { reviewStatus: 'reviewed' })
          onDataChange()
          render()
        }
      })
      actions.appendChild(finishBtn)
    }

    if (!book.isArchived && (book.status === 'completed' || book.status === 'reviewed')) {
      const archiveBtn = el('button', 'btn btn-sm btn-outline', '📦 归档')
      archiveBtn.title = '将书籍移入归档中心'
      archiveBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        if (confirm(`确定要将《${book.title}》归档吗？归档后将不再出现在主计划和本周清单中。`)) {
          archiveBook(book.id)
          onDataChange()
          render()
        }
      })
      actions.appendChild(archiveBtn)
    }

    actions.appendChild(viewBtn)
    actions.appendChild(editBtn)

    card.appendChild(header)
    card.appendChild(statusRow)
    card.appendChild(completenessSection)
    card.appendChild(infoGrid)
    if (book.oneLineSummary?.trim()) card.appendChild(summarySection!)
    if (book.reviewStartedAt) card.appendChild(timeInfo!)
    card.appendChild(actions)

    card.addEventListener('click', () => {
      const modal = createReviewDetailModal(book, summary)
      document.body.appendChild(modal)
    })

    return card
  }

  function createReviewDetailModal(book: Book, summary: ReturnType<typeof getReviewSummary>): HTMLElement {
    const overlay = el('div', 'modal-overlay')
    const modal = el('div', 'modal review-detail-modal')
    
    const header = el('div', 'modal-header')
    const title = el('h2', 'modal-title', `💭 ${book.title}`)
    const closeBtn = el('button', 'btn btn-icon', '×')
    closeBtn.addEventListener('click', closeModal)
    header.appendChild(title)
    header.appendChild(closeBtn)

    const body = el('div', 'review-detail-body')

    const statusSection = el('div', 'detail-section')
    const statusTitle = el('h3', 'detail-section-title', '📋 状态概览')
    const statusGrid = el('div', 'detail-grid')
    const progress = calculateProgress(book)
    const readingCycle = getReadingCycle(book)
    
    const statusItems = [
      { label: '阅读状态', value: STATUS_LABELS[book.status], color: STATUS_COLORS[book.status] },
      { label: '复盘状态', value: REVIEW_STATUS_LABELS[book.reviewStatus], color: REVIEW_STATUS_COLORS[book.reviewStatus] },
      { label: '完成进度', value: `${progress}% (${book.readChapters}/${book.totalChapters}章)` },
      { label: '阅读周期', value: readingCycle },
      { label: '复盘完整度', value: `${summary.reviewCompleteness}%` },
      { label: '推荐指数', value: book.recommendationRating > 0 ? '★'.repeat(book.recommendationRating) : '未评分' }
    ]
    statusItems.forEach(item => {
      const row = el('div', 'detail-row')
      const labelEl = el('span', 'detail-label', item.label)
      const valueEl = el('span', 'detail-value', item.value)
      if (item.color) {
        valueEl.style.color = item.color
        valueEl.style.fontWeight = '600'
      }
      row.appendChild(labelEl)
      row.appendChild(valueEl)
      statusGrid.appendChild(row)
    })
    statusSection.appendChild(statusTitle)
    statusSection.appendChild(statusGrid)

    const dateSection = el('div', 'detail-section')
    const dateTitle = el('h3', 'detail-section-title', '📅 时间线')
    const dateGrid = el('div', 'detail-grid')
    const dateItems = [
      { label: '创建时间', value: formatDate(book.createdAt) },
      { label: '计划完成日', value: book.plannedDate ? formatDate(book.plannedDate) : '未设置' },
      { label: '阅读完成', value: book.completedAt ? formatDate(book.completedAt) : '未完成' },
      { label: '开始复盘', value: book.reviewStartedAt ? formatDate(book.reviewStartedAt) : '未开始' },
      { label: '复盘完成', value: book.reviewCompletedAt ? formatDate(book.reviewCompletedAt) : '未完成' },
      { label: '归档时间', value: book.archivedAt ? formatDate(book.archivedAt) : '未归档' }
    ]
    dateItems.forEach(item => {
      const row = el('div', 'detail-row')
      const labelEl = el('span', 'detail-label', item.label)
      const valueEl = el('span', 'detail-value', item.value)
      row.appendChild(labelEl)
      row.appendChild(valueEl)
      dateGrid.appendChild(row)
    })
    dateSection.appendChild(dateTitle)
    dateSection.appendChild(dateGrid)

    body.appendChild(statusSection)
    body.appendChild(dateSection)

    if (book.highlights.trim()) {
      const highlightsSection = el('div', 'detail-section')
      const highlightsTitle = el('h3', 'detail-section-title', `📝 重点摘录 (${summary.highlightsCount} 条)`)
      const highlightsContent = el('div', 'detail-content-block', book.highlights)
      highlightsSection.appendChild(highlightsTitle)
      highlightsSection.appendChild(highlightsContent)
      body.appendChild(highlightsSection)
    }

    if (book.reviewNotes.trim()) {
      const notesSection = el('div', 'detail-section')
      const notesTitle = el('h3', 'detail-section-title', '📋 复盘备注')
      const notesContent = el('div', 'detail-content-block', book.reviewNotes)
      notesSection.appendChild(notesTitle)
      notesSection.appendChild(notesContent)
      body.appendChild(notesSection)
    }

    if (book.reviewConclusion?.trim()) {
      const conclusionSection = el('div', 'detail-section')
      const conclusionTitle = el('h3', 'detail-section-title', '🎯 复盘结论')
      const conclusionContent = el('div', 'detail-content-block', book.reviewConclusion)
      conclusionSection.appendChild(conclusionTitle)
      conclusionSection.appendChild(conclusionContent)
      body.appendChild(conclusionSection)
    }

    if (book.reviewInsights?.trim()) {
      const insightsSection = el('div', 'detail-section')
      const insightsTitle = el('h3', 'detail-section-title', '💡 阅读收获')
      const insightsContent = el('div', 'detail-content-block', book.reviewInsights)
      insightsSection.appendChild(insightsTitle)
      insightsSection.appendChild(insightsContent)
      body.appendChild(insightsSection)
    }

    if (book.oneLineSummary?.trim()) {
      const summarySection = el('div', 'detail-section')
      const summaryTitle = el('h3', 'detail-section-title', '✨ 一句话总结')
      const summaryContent = el('div', 'detail-content-block', book.oneLineSummary)
      summarySection.appendChild(summaryTitle)
      summarySection.appendChild(summaryContent)
      body.appendChild(summarySection)
    }

    const footer = el('div', 'modal-footer review-detail-footer')
    const cancelBtn = el('button', 'btn btn-secondary', '关闭') as HTMLButtonElement
    cancelBtn.type = 'button'
    cancelBtn.addEventListener('click', closeModal)
    const editBtn = el('button', 'btn btn-primary', '✍️ 编辑复盘') as HTMLButtonElement
    editBtn.addEventListener('click', () => {
      closeModal()
      const editModal = createReviewEditModal(book)
      document.body.appendChild(editModal)
    })
    footer.appendChild(cancelBtn)
    footer.appendChild(editBtn)

    modal.appendChild(header)
    modal.appendChild(body)
    modal.appendChild(footer)
    overlay.appendChild(modal)

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal()
    })

    function closeModal(): void {
      overlay.remove()
    }

    return overlay
  }

  function createReviewEditModal(book: Book): HTMLElement {
    const overlay = el('div', 'modal-overlay')
    const modal = el('div', 'modal review-edit-modal')
    
    const header = el('div', 'modal-header')
    const title = el('h2', 'modal-title', `✍️ 编辑复盘 - ${book.title}`)
    const closeBtn = el('button', 'btn btn-icon', '×')
    closeBtn.addEventListener('click', closeModal)
    header.appendChild(title)
    header.appendChild(closeBtn)

    const form = el('form', 'review-edit-form')
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      handleSubmit()
    })

    const body = el('div', 'review-edit-body')

    const statusSection = el('div', 'detail-section')
    const statusTitle = el('h3', 'detail-section-title', '📋 复盘状态')
    const statusGroup = el('div', 'form-group')
    const statusLabel = el('label', 'form-label', '复盘状态')
    const statusSelect = el('select', 'form-input') as HTMLSelectElement
    const statusOptions: { value: ReviewStatus; label: string }[] = [
      { value: 'pending', label: '待复盘' },
      { value: 'reviewing', label: '复盘中' },
      { value: 'reviewed', label: '已复盘' }
    ]
    statusOptions.forEach(opt => {
      const option = document.createElement('option')
      option.value = opt.value
      option.textContent = opt.label
      if (opt.value === book.reviewStatus) option.selected = true
      statusSelect.appendChild(option)
    })
    statusGroup.appendChild(statusLabel)
    statusGroup.appendChild(statusSelect)
    statusSection.appendChild(statusTitle)
    statusSection.appendChild(statusGroup)

    const ratingSection = el('div', 'detail-section')
    const ratingTitle = el('h3', 'detail-section-title', '⭐ 推荐指数')
    const ratingGroup = el('div', 'form-group')
    const ratingLabel = el('label', 'form-label', '给这本书打个分（1-5星）')
    const ratingStars = el('div', 'rating-stars')
    for (let i = 1; i <= 5; i++) {
      const star = el('button', `rating-star ${i <= book.recommendationRating ? 'active' : ''}`, '★') as HTMLButtonElement
      star.type = 'button'
      star.dataset.rating = i.toString()
      star.addEventListener('click', () => {
        document.querySelectorAll('.rating-star').forEach((s, idx) => {
          s.classList.toggle('active', idx < i)
        })
      })
      ratingStars.appendChild(star)
    }
    ratingGroup.appendChild(ratingLabel)
    ratingGroup.appendChild(ratingStars)
    ratingSection.appendChild(ratingTitle)
    ratingSection.appendChild(ratingGroup)

    const contentSection = el('div', 'detail-section')
    const contentTitle = el('h3', 'detail-section-title', '📝 复盘内容')

    const highlightsGroup = el('div', 'form-group')
    const highlightsLabel = el('label', 'form-label', '重点摘录')
    const highlightsTextarea = el('textarea', 'form-input form-textarea') as HTMLTextAreaElement
    highlightsTextarea.value = book.highlights
    highlightsTextarea.placeholder = '记录书中的精彩段落、金句、重要观点...\n（每行一条，方便统计数量）'
    highlightsTextarea.rows = 4
    highlightsGroup.appendChild(highlightsLabel)
    highlightsGroup.appendChild(highlightsTextarea)

    const notesGroup = el('div', 'form-group')
    const notesLabel = el('label', 'form-label', '复盘备注')
    const notesTextarea = el('textarea', 'form-input form-textarea') as HTMLTextAreaElement
    notesTextarea.value = book.reviewNotes
    notesTextarea.placeholder = '阅读过程中的随想、疑问、临时记录...'
    notesTextarea.rows = 3
    notesGroup.appendChild(notesLabel)
    notesGroup.appendChild(notesTextarea)

    const conclusionGroup = el('div', 'form-group')
    const conclusionLabel = el('label', 'form-label', '复盘结论')
    const conclusionTextarea = el('textarea', 'form-input form-textarea') as HTMLTextAreaElement
    conclusionTextarea.value = book.reviewConclusion || ''
    conclusionTextarea.placeholder = '这本书的核心观点是什么？改变了你哪些认知？'
    conclusionTextarea.rows = 4
    conclusionGroup.appendChild(conclusionLabel)
    conclusionGroup.appendChild(conclusionTextarea)

    const insightsGroup = el('div', 'form-group')
    const insightsLabel = el('label', 'form-label', '阅读收获')
    const insightsTextarea = el('textarea', 'form-input form-textarea') as HTMLTextAreaElement
    insightsTextarea.value = book.reviewInsights || ''
    insightsTextarea.placeholder = '从这本书里你学到了什么？可以应用在哪些方面？'
    insightsTextarea.rows = 4
    insightsGroup.appendChild(insightsLabel)
    insightsGroup.appendChild(insightsTextarea)

    const summaryGroup = el('div', 'form-group')
    const summaryLabel = el('label', 'form-label', '一句话总结')
    const summaryInput = el('input', 'form-input') as HTMLInputElement
    summaryInput.type = 'text'
    summaryInput.value = book.oneLineSummary || ''
    summaryInput.placeholder = '用一句话概括这本书的价值，方便以后快速回忆'
    summaryInput.maxLength = 100
    summaryGroup.appendChild(summaryLabel)
    summaryGroup.appendChild(summaryInput)

    contentSection.appendChild(contentTitle)
    contentSection.appendChild(highlightsGroup)
    contentSection.appendChild(notesGroup)
    contentSection.appendChild(conclusionGroup)
    contentSection.appendChild(insightsGroup)
    contentSection.appendChild(summaryGroup)

    body.appendChild(statusSection)
    body.appendChild(ratingSection)
    body.appendChild(contentSection)

    const footer = el('div', 'modal-footer review-edit-footer')
    const cancelBtn = el('button', 'btn btn-secondary', '取消') as HTMLButtonElement
    cancelBtn.type = 'button'
    cancelBtn.addEventListener('click', closeModal)
    const saveBtn = el('button', 'btn btn-primary', '💾 保存复盘') as HTMLButtonElement
    saveBtn.type = 'submit'
    footer.appendChild(cancelBtn)
    footer.appendChild(saveBtn)

    form.appendChild(body)
    form.appendChild(footer)

    modal.appendChild(header)
    modal.appendChild(form)
    overlay.appendChild(modal)

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal()
    })

    function handleSubmit(): void {
      const rating = document.querySelectorAll('.rating-star.active').length
      
      updateBook(book.id, {
        reviewStatus: statusSelect.value as ReviewStatus,
        recommendationRating: rating,
        highlights: highlightsTextarea.value,
        reviewNotes: notesTextarea.value,
        reviewConclusion: conclusionTextarea.value,
        reviewInsights: insightsTextarea.value,
        oneLineSummary: summaryInput.value
      })
      
      onDataChange()
      closeModal()
      render()
    }

    function closeModal(): void {
      overlay.remove()
    }

    return overlay
  }

  function getFilteredAndSortedBooks(): Book[] {
    const sourceBooks = getBooks()
    const filtered = filterReviewBooks(sourceBooks, state.filters)
    return sortBooks(filtered, state.filters.sortBy, state.filters.sortOrder)
  }

  function updateList(): void {
    const listSection = container.querySelector('.review-list-section')
    const toolbar = container.querySelector('.review-toolbar')
    const summary = container.querySelector('.review-summary-section')
    const tabs = container.querySelector('.review-status-tabs')
    
    if (summary) {
      const newSummary = createSummary()
      summary.replaceWith(newSummary)
    }
    
    if (tabs) {
      const newTabs = createStatusTabs()
      tabs.replaceWith(newTabs)
    }
    
    if (toolbar) {
      const newToolbar = createToolbar()
      toolbar.replaceWith(newToolbar)
    }
    
    if (listSection) {
      const newList = createBookList()
      listSection.replaceWith(newList)
    }
  }

  function createSelectGroup(label: string, name: string, values: string[], labels: string[], defaultValue: string): HTMLElement {
    const group = el('div', 'filter-group')
    const labelEl = el('label', 'filter-label', label)
    const select = el('select', 'filter-select') as HTMLSelectElement
    select.name = name
    values.forEach((value, index) => {
      const option = document.createElement('option')
      option.value = value
      option.textContent = labels[index]
      if (value === defaultValue) option.selected = true
      select.appendChild(option)
    })
    select.addEventListener('change', () => {
      if (name === 'topic') state.filters.topic = select.value
      else if (name === 'author') state.filters.author = select.value
      state.selectedIds.clear()
      updateList()
    })
    group.appendChild(labelEl)
    group.appendChild(select)
    return group
  }

  render()
  return container
}
