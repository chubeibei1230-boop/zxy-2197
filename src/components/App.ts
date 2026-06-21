import type { Book, FilterOptions, ViewMode, ReadingStatus } from '../types/book'
import { getBooks, deleteBook, duplicateBook, batchUpdateStatus, updateBook } from '../services/storage'
import { filterBooks, sortBooks } from '../services/filter'
import { exportToJSON, exportToCSV } from '../services/export'
import { createBookCard } from './BookCard'
import { createFilterPanel } from './FilterPanel'
import { createWeeklyView } from './WeeklyView'
import { createValidationAlerts } from './ValidationAlerts'
import { showBookForm } from './BookForm'
import { el } from '../utils/ui'

export class App {
  private container: HTMLElement
  private viewMode: ViewMode = 'list'
  private selectedIds: Set<string> = new Set()
  private filters: FilterOptions = {
    topic: '',
    status: '',
    plannedDateFrom: '',
    plannedDateTo: '',
    progressMin: 0,
    progressMax: 100,
    hasHighlights: null
  }
  private sortBy: string = 'updatedAt'
  private sortOrder: 'asc' | 'desc' = 'desc'

  constructor(container: HTMLElement) {
    this.container = container
    this.render()
  }

  private render(): void {
    this.container.innerHTML = ''

    const header = this.createHeader()
    const main = el('main', 'main-content')

    if (this.viewMode === 'list') {
      const validationSection = this.createValidationSection()
      const filterSection = this.createFilterSection()
      const toolbar = this.createToolbar()
      const bookList = this.createBookList()

      main.appendChild(validationSection)
      main.appendChild(filterSection)
      main.appendChild(toolbar)
      main.appendChild(bookList)
    } else {
      const weeklyView = createWeeklyView()
      main.appendChild(weeklyView)
    }

    this.container.appendChild(header)
    this.container.appendChild(main)
  }

  private createHeader(): HTMLElement {
    const header = el('header', 'app-header')
    
    const title = el('h1', 'app-title', '📚 个人读书计划管理')
    const subtitle = el('p', 'app-subtitle', '管理你的阅读计划、章节进度和读书笔记')
    
    const titleGroup = el('div', 'header-title-group')
    titleGroup.appendChild(title)
    titleGroup.appendChild(subtitle)

    const nav = el('nav', 'app-nav')
    const listBtn = el('button', `nav-btn ${this.viewMode === 'list' ? 'active' : ''}`, '📋 全部书籍')
    listBtn.addEventListener('click', () => {
      this.viewMode = 'list'
      this.render()
    })
    
    const weeklyBtn = el('button', `nav-btn ${this.viewMode === 'weekly' ? 'active' : ''}`, '📅 本周清单')
    weeklyBtn.addEventListener('click', () => {
      this.viewMode = 'weekly'
      this.render()
    })

    nav.appendChild(listBtn)
    nav.appendChild(weeklyBtn)

    const actions = el('div', 'header-actions')
    const addBtn = el('button', 'btn btn-primary', '+ 新增书籍')
    addBtn.addEventListener('click', () => this.handleAddBook())
    
    const exportBtn = el('button', 'btn btn-outline', '📤 导出')
    const exportMenu = el('div', 'export-menu')
    const exportJsonBtn = el('button', 'export-menu-item', '导出 JSON')
    exportJsonBtn.addEventListener('click', () => {
      const filtered = this.getFilteredAndSortedBooks()
      exportToJSON(filtered)
      exportMenu.classList.remove('open')
    })
    const exportCsvBtn = el('button', 'export-menu-item', '导出 CSV')
    exportCsvBtn.addEventListener('click', () => {
      const filtered = this.getFilteredAndSortedBooks()
      exportToCSV(filtered)
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
    actions.appendChild(addBtn)

    header.appendChild(titleGroup)
    header.appendChild(nav)
    header.appendChild(actions)

    return header
  }

  private createValidationSection(): HTMLElement {
    const section = el('section', 'validation-section')
    const alerts = createValidationAlerts({
      onIssueClick: (bookIds) => {
        this.selectedIds = new Set(bookIds)
        this.render()
      }
    })
    section.appendChild(alerts)
    return section
  }

  private createFilterSection(): HTMLElement {
    const section = el('section', 'filter-section')
    const filterPanel = createFilterPanel({
      onFilterChange: (filters) => {
        this.filters = filters
        this.selectedIds.clear()
        this.updateBookList()
      }
    })
    section.appendChild(filterPanel)
    return section
  }

  private createToolbar(): HTMLElement {
    const toolbar = el('div', 'list-toolbar')
    
    const leftGroup = el('div', 'toolbar-left')
    
    const selectAllCheckbox = el('input', 'select-all-checkbox') as HTMLInputElement
    selectAllCheckbox.type = 'checkbox'
    const visibleBooks = this.getFilteredAndSortedBooks()
    const allSelected = visibleBooks.length > 0 && visibleBooks.every(b => this.selectedIds.has(b.id))
    selectAllCheckbox.checked = allSelected
    selectAllCheckbox.addEventListener('change', () => {
      if (selectAllCheckbox.checked) {
        visibleBooks.forEach(b => this.selectedIds.add(b.id))
      } else {
        this.selectedIds.clear()
      }
      this.render()
    })
    
    const selectAllLabel = el('label', 'select-all-label', '全选') as HTMLLabelElement
    selectAllLabel.htmlFor = 'select-all'
    
    const selectedCount = el('span', 'selected-count', 
      this.selectedIds.size > 0 ? `已选 ${this.selectedIds.size} 本` : '')

    leftGroup.appendChild(selectAllCheckbox)
    leftGroup.appendChild(selectAllLabel)
    leftGroup.appendChild(selectedCount)

    const rightGroup = el('div', 'toolbar-right')

    if (this.selectedIds.size > 0) {
      const batchStatusSelect = el('select', 'batch-status-select') as HTMLSelectElement
      const statusOptions: { value: ReadingStatus; label: string }[] = [
        { value: 'not_started', label: '批量设为未开始' },
        { value: 'reading', label: '批量设为阅读中' },
        { value: 'paused', label: '批量设为已暂停' },
        { value: 'reviewing', label: '批量设为复盘中' },
        { value: 'completed', label: '批量设为已完成' },
        { value: 'reviewed', label: '批量设为已复盘' }
      ]
      const defaultOption = document.createElement('option')
      defaultOption.value = ''
      defaultOption.textContent = '批量调整状态...'
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
          batchUpdateStatus(Array.from(this.selectedIds), batchStatusSelect.value as ReadingStatus)
          this.selectedIds.clear()
          this.render()
        }
      })

      rightGroup.appendChild(batchStatusSelect)
    }

    const sortGroup = el('div', 'sort-group')
    const sortLabel = el('span', 'sort-label', '排序：')
    const sortSelect = el('select', 'sort-select') as HTMLSelectElement
    const sortOptions = [
      { value: 'updatedAt', label: '更新时间' },
      { value: 'createdAt', label: '创建时间' },
      { value: 'title', label: '书名' },
      { value: 'author', label: '作者' },
      { value: 'topic', label: '主题' },
      { value: 'progress', label: '进度' },
      { value: 'plannedDate', label: '计划日期' },
      { value: 'favorite', label: '收藏优先' }
    ]
    sortOptions.forEach(opt => {
      const option = document.createElement('option')
      option.value = opt.value
      option.textContent = opt.label
      if (this.sortBy === opt.value) option.selected = true
      sortSelect.appendChild(option)
    })
    sortSelect.addEventListener('change', () => {
      this.sortBy = sortSelect.value
      this.updateBookList()
    })

    const sortOrderBtn = el('button', 'btn btn-icon', this.sortOrder === 'desc' ? '↓' : '↑')
    sortOrderBtn.title = '切换排序方向'
    sortOrderBtn.addEventListener('click', () => {
      this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc'
      this.updateBookList()
    })

    sortGroup.appendChild(sortLabel)
    sortGroup.appendChild(sortSelect)
    sortGroup.appendChild(sortOrderBtn)
    rightGroup.appendChild(sortGroup)

    toolbar.appendChild(leftGroup)
    toolbar.appendChild(rightGroup)

    return toolbar
  }

  private createBookList(): HTMLElement {
    const section = el('section', 'book-list-section')
    const books = this.getFilteredAndSortedBooks()

    if (books.length === 0) {
      const empty = el('div', 'empty-state')
      empty.innerHTML = `
        <div class="empty-icon">📖</div>
        <p>还没有书籍计划</p>
        <p class="empty-hint">点击右上角"新增书籍"开始添加你的第一本书吧</p>
      `
      section.appendChild(empty)
      return section
    }

    const grid = el('div', 'book-grid')
    books.forEach(book => {
      const card = createBookCard({
        book,
        selected: this.selectedIds.has(book.id),
        onSelect: (id) => {
          if (this.selectedIds.has(id)) {
            this.selectedIds.delete(id)
          } else {
            this.selectedIds.add(id)
          }
          this.render()
        },
        onEdit: (book) => this.handleEditBook(book),
        onDelete: (id) => this.handleDeleteBook(id),
        onDuplicate: (id) => this.handleDuplicateBook(id),
        onToggleFavorite: (id) => this.handleToggleFavorite(id)
      })
      grid.appendChild(card)
    })

    section.appendChild(grid)

    const countInfo = el('div', 'list-footer')
    countInfo.textContent = `共 ${books.length} 本书籍`
    section.appendChild(countInfo)

    return section
  }

  private getFilteredAndSortedBooks(): Book[] {
    const allBooks = getBooks()
    const filtered = filterBooks(allBooks, this.filters)
    return sortBooks(filtered, this.sortBy, this.sortOrder)
  }

  private updateBookList(): void {
    const listSection = this.container.querySelector('.book-list-section')
    const toolbar = this.container.querySelector('.list-toolbar')
    const validationSection = this.container.querySelector('.validation-section')
    
    if (validationSection) {
      const newValidation = this.createValidationSection()
      validationSection.replaceWith(newValidation)
    }
    
    if (toolbar) {
      const newToolbar = this.createToolbar()
      toolbar.replaceWith(newToolbar)
    }
    
    if (listSection) {
      const newList = this.createBookList()
      listSection.replaceWith(newList)
    }
  }

  private handleAddBook(): void {
    showBookForm({
      onSuccess: () => this.render(),
      onCancel: () => {}
    })
  }

  private handleEditBook(book: Book): void {
    showBookForm({
      book,
      onSuccess: () => this.render(),
      onCancel: () => {}
    })
  }

  private handleDeleteBook(id: string): void {
    deleteBook(id)
    this.selectedIds.delete(id)
    this.render()
  }

  private handleDuplicateBook(id: string): void {
    duplicateBook(id)
    this.render()
  }

  private handleToggleFavorite(id: string): void {
    const book = getBooks().find(b => b.id === id)
    if (book) {
      updateBook(id, { isFavorite: !book.isFavorite })
      this.render()
    }
  }
}
