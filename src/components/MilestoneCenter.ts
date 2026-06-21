import type { Book, Milestone, MilestoneFilterOptions } from '../types/book'
import {
  getBooks,
  getMilestonesByCategory,
  batchCompleteMilestones,
  updateMilestone
} from '../services/storage'
import { showMilestoneForm } from './MilestoneForm'
import { STATUS_LABELS, STATUS_COLORS, formatDate, getDaysUntil, el } from '../utils/ui'

export interface MilestoneCenterOptions {
  onBack: () => void
  onBookView: (book: Book) => void
  onDataChange: () => void
}

export function createMilestoneCenter(options: MilestoneCenterOptions): HTMLElement {
  const { onBack, onBookView, onDataChange } = options

  const container = el('div', 'milestone-center')

  const state = {
    category: 'upcoming' as 'upcoming' | 'overdue' | 'completed',
    bookKeyword: '',
    sortBy: 'expectedDate' as 'expectedDate' | 'bookTitle' | 'progressThreshold' | 'createdAt',
    sortOrder: 'asc' as 'asc' | 'desc',
    selectedIds: new Set<string>()
  }

  function render(): void {
    container.innerHTML = ''
    const header = createHeader()
    const summary = createSummary()
    const tabSection = createTabs()
    const filterSection = createFilterSection()
    const toolbar = createToolbar()
    const list = createList()

    container.appendChild(header)
    container.appendChild(summary)
    container.appendChild(tabSection)
    container.appendChild(filterSection)
    container.appendChild(toolbar)
    container.appendChild(list)
  }

  function createHeader(): HTMLElement {
    const header = el('div', 'milestone-center-header')

    const backBtn = el('button', 'btn btn-outline milestone-back-btn', '← 返回')
    backBtn.addEventListener('click', onBack)

    const titleGroup = el('div', 'milestone-center-title-group')
    const title = el('h2', 'milestone-center-title', '🎯 阅读里程碑与提醒中心')
    const subtitle = el('p', 'milestone-center-subtitle', '集中管理所有阅读里程碑，及时掌握进度与到期提醒')
    titleGroup.appendChild(title)
    titleGroup.appendChild(subtitle)

    header.appendChild(backBtn)
    header.appendChild(titleGroup)

    return header
  }

  function createSummary(): HTMLElement {
    const upcoming = getMilestonesByCategory('upcoming').length
    const overdue = getMilestonesByCategory('overdue').length
    const completed = getMilestonesByCategory('completed').length

    const section = el('div', 'milestone-center-summary-section')

    const cards = [
      { icon: '📅', label: '即将到期', value: upcoming, unit: '个', className: 'upcoming' },
      { icon: '⚠️', label: '已逾期', value: overdue, unit: '个', className: 'overdue' },
      { icon: '✅', label: '已完成', value: completed, unit: '个', className: 'completed' }
    ]

    cards.forEach(card => {
      const cardEl = el('div', `milestone-summary-card card-${card.className}`)
      const iconEl = el('div', 'summary-icon', card.icon)
      const contentEl = el('div', 'summary-content')
      const valueEl = el('div', 'summary-value', `${card.value}${card.unit}`)
      const labelEl = el('div', 'summary-label', card.label)
      contentEl.appendChild(valueEl)
      contentEl.appendChild(labelEl)
      cardEl.appendChild(iconEl)
      cardEl.appendChild(contentEl)
      cardEl.style.cursor = 'pointer'
      cardEl.addEventListener('click', () => {
        state.category = card.className as 'upcoming' | 'overdue' | 'completed'
        state.selectedIds.clear()
        render()
      })
      section.appendChild(cardEl)
    })

    return section
  }

  function createTabs(): HTMLElement {
    const tabContainer = el('div', 'milestone-tabs')
    const tabs: { key: 'upcoming' | 'overdue' | 'completed'; label: string; icon: string }[] = [
      { key: 'upcoming', label: '即将到期', icon: '📅' },
      { key: 'overdue', label: '已逾期', icon: '⚠️' },
      { key: 'completed', label: '已完成', icon: '✅' }
    ]

    tabs.forEach(tab => {
      const count = getMilestonesByCategory(tab.key).length
      const btn = el('button',
        `milestone-tab ${state.category === tab.key ? 'active' : ''}`,
        `${tab.icon} ${tab.label}${count > 0 ? ` (${count})` : ''}`)
      btn.addEventListener('click', () => {
        state.category = tab.key
        state.selectedIds.clear()
        render()
      })
      tabContainer.appendChild(btn)
    })

    return tabContainer
  }

  function createFilterSection(): HTMLElement {
    const section = el('div', 'milestone-filter-section')
    const panel = el('div', 'milestone-filter-panel')

    const searchGroup = el('div', 'filter-group filter-search-group')
    const searchLabel = el('label', 'filter-label', '🔍 搜索书名')
    const searchInput = el('input', 'filter-input filter-search-input') as HTMLInputElement
    searchInput.type = 'text'
    searchInput.placeholder = '输入书名关键词筛选...'
    searchInput.value = state.bookKeyword
    searchInput.addEventListener('input', () => {
      state.bookKeyword = searchInput.value
      state.selectedIds.clear()
      updateList()
    })
    searchGroup.appendChild(searchLabel)
    searchGroup.appendChild(searchInput)

    const sortGroup = el('div', 'filter-group')
    const sortLabel = el('label', 'filter-label', '排序方式')
    const sortSelect = el('select', 'filter-select') as HTMLSelectElement
    const sortOptions = [
      { value: 'expectedDate', label: '预计日期' },
      { value: 'bookTitle', label: '书名' },
      { value: 'progressThreshold', label: '进度阈值' },
      { value: 'createdAt', label: '创建时间' }
    ]
    sortOptions.forEach(opt => {
      const option = document.createElement('option')
      option.value = opt.value
      option.textContent = opt.label
      if (state.sortBy === opt.value) option.selected = true
      sortSelect.appendChild(option)
    })
    sortSelect.addEventListener('change', () => {
      state.sortBy = sortSelect.value as MilestoneFilterOptions['sortBy']
      updateList()
    })
    sortGroup.appendChild(sortLabel)
    sortGroup.appendChild(sortSelect)

    const orderBtn = el('button', 'btn btn-sm btn-outline', state.sortOrder === 'asc' ? '↑ 升序' : '↓ 降序')
    orderBtn.addEventListener('click', () => {
      state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc'
      updateList()
      render()
    })

    panel.appendChild(searchGroup)
    panel.appendChild(sortGroup)
    panel.appendChild(orderBtn)

    section.appendChild(panel)
    return section
  }

  function createToolbar(): HTMLElement {
    const toolbar = el('div', 'milestone-toolbar')

    const leftGroup = el('div', 'toolbar-left')

    const selectAllCheckbox = el('input', 'select-all-checkbox') as HTMLInputElement
    selectAllCheckbox.type = 'checkbox'
    const visibleItems = getFilteredAndSortedMilestones()
    const allSelected = visibleItems.length > 0 && visibleItems.every(item => state.selectedIds.has(item.milestone.id))
    selectAllCheckbox.checked = allSelected
    selectAllCheckbox.addEventListener('change', () => {
      if (selectAllCheckbox.checked) {
        visibleItems.forEach(item => state.selectedIds.add(item.milestone.id))
      } else {
        state.selectedIds.clear()
      }
      updateList()
    })

    const selectAllLabel = el('label', 'select-all-label', '全选')
    const selectedCount = el('span', 'selected-count',
      state.selectedIds.size > 0 ? `已选 ${state.selectedIds.size} 个` : '')

    leftGroup.appendChild(selectAllCheckbox)
    leftGroup.appendChild(selectAllLabel)
    leftGroup.appendChild(selectedCount)

    if (state.selectedIds.size > 0 && state.category !== 'completed') {
      const batchBtn = el('button', 'btn btn-sm btn-primary batch-btn',
        `✅ 批量完成 (${state.selectedIds.size})`)
      batchBtn.addEventListener('click', () => {
        if (confirm(`确定要将选中的 ${state.selectedIds.size} 个里程碑标记为完成吗？`)) {
          batchCompleteMilestones(Array.from(state.selectedIds))
          state.selectedIds.clear()
          onDataChange()
          render()
        }
      })
      leftGroup.appendChild(batchBtn)
    }

    toolbar.appendChild(leftGroup)
    return toolbar
  }

  function createList(): HTMLElement {
    const section = el('section', 'milestone-list-section')
    const items = getFilteredAndSortedMilestones()

    if (items.length === 0) {
      const empty = el('div', 'empty-state')
      const categoryLabel = state.category === 'upcoming' ? '即将到期'
        : state.category === 'overdue' ? '已逾期' : '已完成'
      empty.innerHTML = `
        <div class="empty-icon">${state.category === 'completed' ? '🎉' : '📭'}</div>
        <p>没有${categoryLabel}的里程碑</p>
        <p class="empty-hint">${state.category === 'completed'
          ? '完成里程碑后它们会出现在这里'
          : '为书籍添加里程碑后，到期提醒会出现在这里'}</p>
      `
      section.appendChild(empty)
      return section
    }

    const list = el('div', 'milestone-list')
    items.forEach(({ book, milestone }) => {
      const card = createMilestoneCard(book, milestone)
      list.appendChild(card)
    })

    section.appendChild(list)

    const countInfo = el('div', 'list-footer')
    const totalInCategory = getMilestonesByCategory(state.category).length
    countInfo.textContent = `当前显示 ${items.length} / 共 ${totalInCategory} 个${state.category === 'upcoming' ? '即将到期' : state.category === 'overdue' ? '已逾期' : '已完成'}里程碑`
    section.appendChild(countInfo)

    return section
  }

  function createMilestoneCard(book: Book, milestone: Milestone): HTMLElement {
    const card = el('div', `milestone-card category-${state.category} ${state.selectedIds.has(milestone.id) ? 'selected' : ''}`)

    const checkbox = el('input', 'milestone-select') as HTMLInputElement
    checkbox.type = 'checkbox'
    checkbox.checked = state.selectedIds.has(milestone.id)
    checkbox.addEventListener('change', () => {
      if (state.selectedIds.has(milestone.id)) {
        state.selectedIds.delete(milestone.id)
      } else {
        state.selectedIds.add(milestone.id)
      }
      updateList()
    })

    const content = el('div', 'milestone-card-content')

    const header = el('div', 'milestone-card-header')
    const titleEl = el('h3', 'milestone-card-title', milestone.title)
    const statusBadge = el('span', `milestone-status-badge status-${milestone.status}`,
      milestone.status === 'completed' ? '✅ 已完成'
        : milestone.status === 'skipped' ? '⏭ 已跳过'
        : milestone.status === 'pending' && milestone.expectedDate && getDaysUntil(milestone.expectedDate) < 0
          ? '⚠️ 已逾期' : '⏳ 待完成')
    header.appendChild(titleEl)
    header.appendChild(statusBadge)

    const bookInfo = el('div', 'milestone-card-book-info')
    const bookLink = el('span', 'milestone-book-link', `📖 《${book.title}》`)
    bookLink.style.cursor = 'pointer'
    bookLink.style.color = 'var(--primary-color)'
    bookLink.addEventListener('click', () => onBookView(book))
    const bookMeta = el('span', 'milestone-book-meta',
      `${book.author || '未知作者'} · ${STATUS_LABELS[book.status]}`)
    bookInfo.appendChild(bookLink)
    bookInfo.appendChild(bookMeta)

    const meta = el('div', 'milestone-card-meta')
    if (milestone.expectedDate) {
      const days = getDaysUntil(milestone.expectedDate)
      let dateText = `预计：${formatDate(milestone.expectedDate)}`
      if (milestone.status === 'pending') {
        if (days < 0) dateText += ` · 逾期${Math.abs(days)}天`
        else if (days <= 3) dateText += ` · 还剩${days}天`
        else if (days <= 7) dateText += ` · ${days}天后到期`
      }
      meta.appendChild(el('span', `milestone-date ${days < 0 && milestone.status === 'pending' ? 'overdue' : days <= 3 && milestone.status === 'pending' ? 'urgent' : ''}`, dateText))
    }
    if (milestone.progressThreshold > 0) {
      const progress = book.totalChapters > 0 ? Math.round((book.readChapters / book.totalChapters) * 100) : 0
      meta.appendChild(el('span', 'milestone-threshold', `阈值：${milestone.progressThreshold}% · 当前进度：${progress}%`))
    }
    if (milestone.targetDescription) {
      meta.appendChild(el('span', 'milestone-desc', milestone.targetDescription))
    }

    const actions = el('div', 'milestone-card-actions')
    const editBtn = el('button', 'btn btn-sm btn-outline', '编辑')
    editBtn.addEventListener('click', () => {
      showMilestoneForm({
        bookId: book.id,
        milestone,
        onSuccess: () => {
          onDataChange()
          render()
        },
        onCancel: () => {}
      })
    })

    if (milestone.status === 'pending') {
      const completeBtn = el('button', 'btn btn-sm btn-primary', '完成')
      completeBtn.addEventListener('click', () => {
        updateMilestone(book.id, milestone.id, { status: 'completed' })
        onDataChange()
        render()
      })
      actions.appendChild(completeBtn)
    } else if (milestone.status === 'completed') {
      const reopenBtn = el('button', 'btn btn-sm btn-outline', '重开')
      reopenBtn.addEventListener('click', () => {
        updateMilestone(book.id, milestone.id, { status: 'pending' })
        onDataChange()
        render()
      })
      actions.appendChild(reopenBtn)
    }

    const viewBookBtn = el('button', 'btn btn-sm btn-outline', '查看书籍')
    viewBookBtn.addEventListener('click', () => onBookView(book))
    actions.appendChild(editBtn)
    actions.appendChild(viewBookBtn)

    content.appendChild(header)
    content.appendChild(bookInfo)
    content.appendChild(meta)
    content.appendChild(actions)

    card.appendChild(checkbox)
    card.appendChild(content)

    return card
  }

  function getFilteredAndSortedMilestones(): { book: Book; milestone: Milestone }[] {
    let items = getMilestonesByCategory(state.category)

    if (state.bookKeyword) {
      const keyword = state.bookKeyword.toLowerCase()
      items = items.filter(({ book }) => book.title.toLowerCase().includes(keyword))
    }

    items.sort((a, b) => {
      let cmp = 0
      switch (state.sortBy) {
        case 'expectedDate':
          cmp = (a.milestone.expectedDate || '').localeCompare(b.milestone.expectedDate || '')
          break
        case 'bookTitle':
          cmp = a.book.title.localeCompare(b.book.title, 'zh-CN')
          break
        case 'progressThreshold':
          cmp = a.milestone.progressThreshold - b.milestone.progressThreshold
          break
        case 'createdAt':
          cmp = a.milestone.createdAt.localeCompare(b.milestone.createdAt)
          break
      }
      return state.sortOrder === 'desc' ? -cmp : cmp
    })

    return items
  }

  function updateList(): void {
    const listSection = container.querySelector('.milestone-list-section')
    const toolbar = container.querySelector('.milestone-toolbar')
    const summary = container.querySelector('.milestone-center-summary-section')
    const tabs = container.querySelector('.milestone-tabs')

    if (summary) {
      const newSummary = createSummary()
      summary.replaceWith(newSummary)
    }
    if (tabs) {
      const newTabs = createTabs()
      tabs.replaceWith(newTabs)
    }
    if (toolbar) {
      const newToolbar = createToolbar()
      toolbar.replaceWith(newToolbar)
    }
    if (listSection) {
      const newList = createList()
      listSection.replaceWith(newList)
    }
  }

  render()
  return container
}
