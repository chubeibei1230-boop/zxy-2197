import type { FilterOptions, ReadingStatus } from '../types/book'
import { getAllTopics } from '../services/storage'
import { el } from '../utils/ui'

export interface FilterPanelOptions {
  onFilterChange: (filters: FilterOptions) => void
}

export function createFilterPanel(options: FilterPanelOptions): HTMLElement {
  const { onFilterChange } = options
  const panel = el('div', 'filter-panel')

  const topics = getAllTopics()

  const topicGroup = createSelectGroup('主题', 'topic', ['', ...topics], ['全部', ...topics])
  
  const statusGroup = createSelectGroup(
    '状态',
    'status',
    ['', 'not_started', 'reading', 'paused', 'reviewing', 'completed', 'reviewed'],
    ['全部', '未开始', '阅读中', '已暂停', '复盘中', '已完成', '已复盘']
  )

  const dateRow = el('div', 'filter-row')
  const dateFromGroup = createInputGroup('开始日期', 'date', 'dateFrom')
  const dateToGroup = createInputGroup('结束日期', 'date', 'dateTo')
  dateRow.appendChild(dateFromGroup)
  dateRow.appendChild(dateToGroup)

  const progressRow = el('div', 'filter-row')
  const progressMinGroup = createInputGroup('最低进度(%)', 'number', 'progressMin', '0')
  const progressMaxGroup = createInputGroup('最高进度(%)', 'number', 'progressMax', '100')
  progressRow.appendChild(progressMinGroup)
  progressRow.appendChild(progressMaxGroup)

  const highlightsGroup = el('div', 'filter-group')
  const highlightsLabel = el('label', 'filter-label', '重点摘录')
  const highlightsSelect = el('select', 'filter-select') as HTMLSelectElement
  highlightsSelect.name = 'hasHighlights'
  const highlightOptions = [
    { value: '', label: '全部' },
    { value: 'true', label: '有摘录' },
    { value: 'false', label: '无摘录' }
  ]
  highlightOptions.forEach(opt => {
    const option = document.createElement('option')
    option.value = opt.value
    option.textContent = opt.label
    highlightsSelect.appendChild(option)
  })
  highlightsGroup.appendChild(highlightsLabel)
  highlightsGroup.appendChild(highlightsSelect)

  const resetBtn = el('button', 'btn btn-outline btn-sm', '重置筛选')
  resetBtn.addEventListener('click', () => {
    topicGroup.querySelector('select')!.value = ''
    statusGroup.querySelector('select')!.value = ''
    dateFromGroup.querySelector('input')!.value = ''
    dateToGroup.querySelector('input')!.value = ''
    progressMinGroup.querySelector('input')!.value = '0'
    progressMaxGroup.querySelector('input')!.value = '100'
    highlightsSelect.value = ''
    triggerChange()
  })

  panel.appendChild(topicGroup)
  panel.appendChild(statusGroup)
  panel.appendChild(dateRow)
  panel.appendChild(progressRow)
  panel.appendChild(highlightsGroup)
  panel.appendChild(resetBtn)

  function triggerChange(): void {
    const topic = (topicGroup.querySelector('select') as HTMLSelectElement).value
    const status = (statusGroup.querySelector('select') as HTMLSelectElement).value as ReadingStatus | ''
    const dateFrom = (dateFromGroup.querySelector('input') as HTMLInputElement).value
    const dateTo = (dateToGroup.querySelector('input') as HTMLInputElement).value
    const progressMin = parseInt((progressMinGroup.querySelector('input') as HTMLInputElement).value) || 0
    const progressMax = parseInt((progressMaxGroup.querySelector('input') as HTMLInputElement).value) || 100
    
    let hasHighlights: boolean | null = null
    if (highlightsSelect.value === 'true') hasHighlights = true
    else if (highlightsSelect.value === 'false') hasHighlights = false

    onFilterChange({
      topic,
      status,
      plannedDateFrom: dateFrom,
      plannedDateTo: dateTo,
      progressMin,
      progressMax,
      hasHighlights
    })
  }

  panel.querySelectorAll('select, input').forEach(el => {
    el.addEventListener('change', triggerChange)
    el.addEventListener('input', triggerChange)
  })

  return panel
}

function createSelectGroup(label: string, name: string, values: string[], labels: string[]): HTMLElement {
  const group = el('div', 'filter-group')
  const labelEl = el('label', 'filter-label', label)
  const select = el('select', 'filter-select') as HTMLSelectElement
  select.name = name
  values.forEach((value, index) => {
    const option = document.createElement('option')
    option.value = value
    option.textContent = labels[index]
    select.appendChild(option)
  })
  group.appendChild(labelEl)
  group.appendChild(select)
  return group
}

function createInputGroup(label: string, type: string, name: string, defaultValue = ''): HTMLElement {
  const group = el('div', 'filter-group')
  const labelEl = el('label', 'filter-label', label)
  const input = el('input', 'filter-input') as HTMLInputElement
  input.type = type
  input.name = name
  input.value = defaultValue
  group.appendChild(labelEl)
  group.appendChild(input)
  return group
}
