import type { Book, ArchiveFilterOptions, ReadingStatus, ArchiveStatus } from '../types/book'
import {
  getBooks,
  getArchivedBooks,
  getArchivedTopics,
  getArchivedAuthors,
  getAllTopics,
  getAllAuthors,
  unarchiveBook,
  batchUnarchiveBooks,
  deleteBook
} from '../services/storage'
import { filterArchivedBooks, sortBooks, getArchiveSummary } from '../services/filter'
import { exportArchivedToJSON, exportArchivedToCSV } from '../services/export'
import { createBookCard } from './BookCard'
import { STATUS_LABELS, STATUS_COLORS, formatDate, el } from '../utils/ui'

export interface ArchiveCenterOptions {
  onBookView: (book: Book) => void
  onBack: () => void
  onDataChange: () => void
}

export function createArchiveCenter(options: ArchiveCenterOptions): HTMLElement {
  const { onBookView, onBack, onDataChange } = options

  const container = el('div', 'archive-center')

  const state = {
    filters: {
      topic: '',
      author: '',
      status: '' as ReadingStatus | '',
      archiveStatus: 'archived' as ArchiveStatus,
      searchKeyword: ''
    } as ArchiveFilterOptions,
    sortBy: 'archivedAt',
    sortOrder: 'desc' as 'asc' | 'desc',
    selectedIds: new Set<string>()
  }

  function render(): void {
    container.innerHTML = ''

    const header = createHeader()
    const summary = createSummary()
    const filterSection = createFilterSection()
    const toolbar = createToolbar()
    const bookList = createBookList()

    container.appendChild(header)
    container.appendChild(summary)
    container.appendChild(filterSection)
    container.appendChild(toolbar)
    container.appendChild(bookList)
  }

  function createHeader(): HTMLElement {
    const header = el('div', 'archive-header')
    
    const backBtn = el('button', 'btn btn-outline archive-back-btn', '← 返回')
    backBtn.addEventListener('click', onBack)
    
    const titleGroup = el('div', 'archive-title-group')
    const title = el('h2', 'archive-title', '📦 阅读归档中心')
    const subtitle = el('p', 'archive-subtitle', '查看已完成的阅读成果，随时可恢复到正常计划')
    titleGroup.appendChild(title)
    titleGroup.appendChild(subtitle)

    const actions = el('div', 'archive-header-actions')
    const exportBtn = el('button', 'btn btn-outline', '📤 导出归档')
    const exportMenu = el('div', 'export-menu')
    const exportJsonBtn = el('button', 'export-menu-item', '导出 JSON')
    exportJsonBtn.addEventListener('click', () => {
      const filtered = getFilteredAndSortedBooks()
      exportArchivedToJSON(filtered)
      exportMenu.classList.remove('open')
    })
    const exportCsvBtn = el('button', 'export-menu-item', '导出 CSV')
    exportCsvBtn.addEventListener('click', () => {
      const filtered = getFilteredAndSortedBooks()
      exportArchivedToCSV(filtered)
      exportMenu.classList.remove('open')
    })
    exportMenu.appendChild(exportJsonBtn)
    exportMenu.appendChild(exportCsvBtn)
    
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      exportMenu.classList.toggle('open')
    })
    document.addEventListener('click', () => {
      exportMenu.classList.remove('open')
    })

    const exportWrapper = el('div', 'export-wrapper')
    exportWrapper.appendChild(exportBtn)
    exportWrapper.appendChild(exportMenu)
    actions.appendChild(exportWrapper)

    header.appendChild(backBtn)
    header.appendChild(titleGroup)
    header.appendChild(actions)

    return header
  }

  function createSummary(): HTMLElement {
    const allArchived = getArchivedBooks()
    const totalArchived = allArchived.length
    const avgProgress = totalArchived > 0
      ? Math.round(allArchived.reduce((sum, b) => {
          const s = getArchiveSummary(b)
          return sum + s.finalProgress
        }, 0) / totalArchived)
      : 0
    const withHighlights = allArchived.filter(b => getArchiveSummary(b).highlightsCount > 0).length
    const withReviews = allArchived.filter(b => getArchiveSummary(b).hasReviewNotes).length

    const section = el('div', 'archive-summary-section')
    
    const cards = [
      { icon: '📚', label: '归档书籍', value: totalArchived, unit: '本' },
      { icon: '📈', label: '平均完成进度', value: avgProgress, unit: '%' },
      { icon: '📝', label: '有摘录', value: withHighlights, unit: '本' },
      { icon: '💭', label: '有复盘', value: withReviews, unit: '本' }
    ]

    cards.forEach(card => {
      const cardEl = el('div', 'archive-summary-card')
      const iconEl = el('div', 'summary-icon', card.icon)
      const contentEl = el('div', 'summary-content')
      const valueEl = el('div', 'summary-value', `${card.value}${card.unit}`)
      const labelEl = el('div', 'summary-label', card.label)
      contentEl.appendChild(valueEl)
      contentEl.appendChild(labelEl)
      cardEl.appendChild(iconEl)
      cardEl.appendChild(contentEl)
      section.appendChild(cardEl)
    })

    return section
  }

  function createFilterSection(): HTMLElement {
    const section = el('section', 'archive-filter-section')
    const panel = el('div', 'archive-filter-panel')

    const useAll = state.filters.archiveStatus === 'all'
    const topics = useAll ? getAllTopics() : getArchivedTopics()
    const authors = useAll ? getAllAuthors() : getArchivedAuthors()

    const searchGroup = el('div', 'filter-group filter-search-group')
    const searchLabel = el('label', 'filter-label', '🔍 关键词搜索')
    const searchInput = el('input', 'filter-input filter-search-input') as HTMLInputElement
    searchInput.type = 'text'
    searchInput.placeholder = '搜索书名、作者、主题、摘录、复盘内容...'
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

    const statusGroup = createSelectGroup(
      '阅读状态',
      'status',
      ['', 'completed', 'reviewed'],
      ['全部', '已完成', '已复盘'],
      state.filters.status
    )

    const archiveGroup = createSelectGroup(
      '归档范围',
      'archiveStatus',
      ['archived'],
      ['仅归档书籍'],
      state.filters.archiveStatus
    )

    const resetBtn = el('button', 'btn btn-outline btn-sm filter-reset-btn', '重置筛选')
    resetBtn.addEventListener('click', () => {
      state.filters = {
        topic: '',
        author: '',
        status: '',
        archiveStatus: 'archived',
        searchKeyword: ''
      }
      state.selectedIds.clear()
      render()
    })

    panel.appendChild(searchGroup)
    panel.appendChild(topicGroup)
    panel.appendChild(authorGroup)
    panel.appendChild(statusGroup)
    panel.appendChild(archiveGroup)
    panel.appendChild(resetBtn)

    section.appendChild(panel)
    return section
  }

  function createToolbar(): HTMLElement {
    const toolbar = el('div', 'list-toolbar archive-toolbar')
    
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
      const batchUnarchiveBtn = el('button', 'btn btn-sm btn-primary batch-btn', `↩ 批量恢复 (${state.selectedIds.size})`)
      batchUnarchiveBtn.addEventListener('click', () => {
        if (confirm(`确定要将选中的 ${state.selectedIds.size} 本书籍恢复到正常计划吗？`)) {
          batchUnarchiveBooks(Array.from(state.selectedIds))
          state.selectedIds.clear()
          onDataChange()
          render()
        }
      })
      leftGroup.appendChild(selectAllCheckbox)
      leftGroup.appendChild(selectAllLabel)
      leftGroup.appendChild(selectedCount)
      leftGroup.appendChild(batchUnarchiveBtn)
    } else {
      leftGroup.appendChild(selectAllCheckbox)
      leftGroup.appendChild(selectAllLabel)
      leftGroup.appendChild(selectedCount)
    }

    const rightGroup = el('div', 'toolbar-right')

    const sortGroup = el('div', 'sort-group')
    const sortLabel = el('span', 'sort-label', '排序：')
    const sortSelect = el('select', 'sort-select') as HTMLSelectElement
    const sortOptions = [
      { value: 'archivedAt', label: '归档时间' },
      { value: 'completedAt', label: '完成时间' },
      { value: 'title', label: '书名' },
      { value: 'author', label: '作者' },
      { value: 'topic', label: '主题' },
      { value: 'progress', label: '进度' },
      { value: 'favorite', label: '收藏优先' }
    ]
    sortOptions.forEach(opt => {
      const option = document.createElement('option')
      option.value = opt.value
      option.textContent = opt.label
      if (state.sortBy === opt.value) option.selected = true
      sortSelect.appendChild(option)
    })
    sortSelect.addEventListener('change', () => {
      state.sortBy = sortSelect.value
      updateList()
    })

    const sortOrderBtn = el('button', 'btn btn-icon', state.sortOrder === 'desc' ? '↓' : '↑')
    sortOrderBtn.title = '切换排序方向'
    sortOrderBtn.addEventListener('click', () => {
      state.sortOrder = state.sortOrder === 'desc' ? 'asc' : 'desc'
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
    const section = el('section', 'book-list-section archive-list-section')
    const books = getFilteredAndSortedBooks()

    if (books.length === 0) {
      const empty = el('div', 'empty-state')
      empty.innerHTML = `
        <div class="empty-icon">📦</div>
        <p>${state.filters.archiveStatus === 'archived' ? '归档中心还是空的' : '没有找到匹配的书籍'}</p>
        <p class="empty-hint">${state.filters.archiveStatus === 'archived' 
          ? '将"已完成"或"已复盘"的书籍归档后，它们会出现在这里'
          : '试试调整筛选条件或关键词'
        }</p>
      `
      section.appendChild(empty)
      return section
    }

    const grid = el('div', 'book-grid')
    books.forEach(book => {
      const summary = getArchiveSummary(book)
      const card = createBookCard({
        book,
        selected: state.selectedIds.has(book.id),
        onSelect: (id) => {
          if (state.selectedIds.has(id)) {
            state.selectedIds.delete(id)
          } else {
            state.selectedIds.add(id)
          }
          render()
        },
        onEdit: (book) => {
          const modal = createDetailModal(book, summary)
          document.body.appendChild(modal)
        },
        onDelete: (id) => {
          deleteBook(id)
          state.selectedIds.delete(id)
          onDataChange()
          render()
        },
        onDuplicate: () => {},
        onToggleFavorite: () => {},
        onUnarchive: (id) => {
          unarchiveBook(id)
          state.selectedIds.delete(id)
          onDataChange()
          render()
        },
        isArchiveView: true
      })
      grid.appendChild(card)
    })

    section.appendChild(grid)

    const countInfo = el('div', 'list-footer')
    const sourceBooks = state.filters.archiveStatus === 'all' ? getBooks() : getArchivedBooks()
    const allCount = sourceBooks.length
    countInfo.textContent = `当前显示 ${books.length} / 共 ${allCount} 本${state.filters.archiveStatus === 'all' ? '书籍（含未归档）' : '归档书籍'}`
    section.appendChild(countInfo)

    return section
  }

  function createDetailModal(book: Book, summary: ReturnType<typeof getArchiveSummary>): HTMLElement {
    const overlay = el('div', 'modal-overlay')
    const modal = el('div', 'modal archive-detail-modal')
    
    const header = el('div', 'modal-header')
    const title = el('h2', 'modal-title', `📖 ${book.title}`)
    const closeBtn = el('button', 'btn btn-icon', '×')
    closeBtn.addEventListener('click', closeModal)
    header.appendChild(title)
    header.appendChild(closeBtn)

    const body = el('div', 'archive-detail-body')

    const metaSection = el('div', 'detail-section')
    const metaTitle = el('h3', 'detail-section-title', '📋 基础信息')
    const metaGrid = el('div', 'detail-grid')
    const metaItems = [
      { label: '作者', value: book.author || '未知' },
      { label: '主题', value: book.topic || '未分类' },
      { label: '阅读状态', value: STATUS_LABELS[book.status], color: STATUS_COLORS[book.status] },
      { label: '总章节', value: `${book.totalChapters} 章` },
      { label: '是否收藏', value: book.isFavorite ? '★ 是' : '否' },
      { label: '计划完成日', value: book.plannedDate ? formatDate(book.plannedDate) : '未设置' }
    ]
    metaItems.forEach(item => {
      const row = el('div', 'detail-row')
      const labelEl = el('span', 'detail-label', item.label)
      const valueEl = el('span', 'detail-value', item.value)
      if (item.color) {
        valueEl.style.color = item.color
        valueEl.style.fontWeight = '600'
      }
      row.appendChild(labelEl)
      row.appendChild(valueEl)
      metaGrid.appendChild(row)
    })
    metaSection.appendChild(metaTitle)
    metaSection.appendChild(metaGrid)

    const progressSection = el('div', 'detail-section')
    const progressTitle = el('h3', 'detail-section-title', '📊 最终阅读成果')
    const progressGrid = el('div', 'detail-grid')
    const progressItems = [
      { label: '最终进度', value: `${summary.finalProgress}% (${book.readChapters}/${book.totalChapters} 章)` },
      { label: '完成时间', value: summary.completionTime ? formatDate(summary.completionTime) : '未记录' },
      { label: '归档时间', value: book.archivedAt ? formatDate(book.archivedAt) : '未归档' },
      { label: '摘录条数', value: `${summary.highlightsCount} 条` }
    ]
    progressItems.forEach(item => {
      const row = el('div', 'detail-row')
      const labelEl = el('span', 'detail-label', item.label)
      const valueEl = el('span', 'detail-value', item.value)
      row.appendChild(labelEl)
      row.appendChild(valueEl)
      progressGrid.appendChild(row)
    })
    
    const progressBar = el('div', 'progress-bar detail-progress-bar')
    const progressFill = el('div', 'progress-fill')
    progressFill.style.width = `${summary.finalProgress}%`
    progressFill.style.backgroundColor = STATUS_COLORS[book.status]
    
    progressSection.appendChild(progressTitle)
    progressSection.appendChild(progressGrid)
    progressSection.appendChild(progressBar)

    body.appendChild(metaSection)
    body.appendChild(progressSection)

    if (book.highlights.trim()) {
      const highlightsSection = el('div', 'detail-section')
      const highlightsTitle = el('h3', 'detail-section-title', `📝 重点摘录 (${summary.highlightsCount} 条)`)
      const highlightsContent = el('div', 'detail-content-block', book.highlights)
      highlightsSection.appendChild(highlightsTitle)
      highlightsSection.appendChild(highlightsContent)
      body.appendChild(highlightsSection)
    }

    if (book.reviewNotes.trim()) {
      const reviewSection = el('div', 'detail-section')
      const reviewTitle = el('h3', 'detail-section-title', '💭 复盘备注')
      const reviewContent = el('div', 'detail-content-block', book.reviewNotes)
      reviewSection.appendChild(reviewTitle)
      reviewSection.appendChild(reviewContent)
      body.appendChild(reviewSection)
    }

    const footer = el('div', 'modal-footer archive-detail-footer')
    const cancelBtn = el('button', 'btn btn-secondary', '关闭') as HTMLButtonElement
    cancelBtn.type = 'button'
    cancelBtn.addEventListener('click', closeModal)
    const editBtn = el('button', 'btn btn-outline', '编辑内容') as HTMLButtonElement
    editBtn.addEventListener('click', () => {
      closeModal()
      onBookView(book)
    })
    const unarchiveBtn = el('button', 'btn btn-primary', '↩ 恢复到计划') as HTMLButtonElement
    unarchiveBtn.addEventListener('click', () => {
      if (confirm(`确定要将《${book.title}》恢复到正常计划吗？`)) {
        unarchiveBook(book.id)
        onDataChange()
        closeModal()
        render()
      }
    })
    footer.appendChild(cancelBtn)
    footer.appendChild(editBtn)
    footer.appendChild(unarchiveBtn)

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

  function getFilteredAndSortedBooks(): Book[] {
    const sourceBooks = state.filters.archiveStatus === 'archived' 
      ? getArchivedBooks() 
      : getBooks()
    const filtered = filterArchivedBooks(sourceBooks, state.filters)
    return sortBooks(filtered, state.sortBy, state.sortOrder)
  }

  function updateList(): void {
    const listSection = container.querySelector('.archive-list-section')
    const toolbar = container.querySelector('.archive-toolbar')
    const summary = container.querySelector('.archive-summary-section')
    
    if (summary) {
      const newSummary = createSummary()
      summary.replaceWith(newSummary)
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
      else if (name === 'status') state.filters.status = select.value as ReadingStatus | ''
      else if (name === 'archiveStatus') state.filters.archiveStatus = select.value as ArchiveStatus
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
