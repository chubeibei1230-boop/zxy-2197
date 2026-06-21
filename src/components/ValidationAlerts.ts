import { validateAllBooks } from '../services/validation'
import { el } from '../utils/ui'

export interface ValidationAlertOptions {
  onIssueClick?: (bookIds: string[]) => void
}

export function createValidationAlerts(options: ValidationAlertOptions = {}): HTMLElement {
  const { onIssueClick } = options
  const container = el('div', 'validation-alerts')
  
  const issues = validateAllBooks()
  
  if (issues.length === 0) {
    return container
  }

  const header = el('div', 'validation-header')
  const title = el('span', 'validation-title', `⚠️ 检测到 ${issues.length} 个问题`)
  const toggleBtn = el('button', 'btn btn-link btn-sm', '展开')
  let expanded = false
  
  const issueList = el('div', 'validation-list')
  issueList.style.display = 'none'

  toggleBtn.addEventListener('click', () => {
    expanded = !expanded
    issueList.style.display = expanded ? 'block' : 'none'
    toggleBtn.textContent = expanded ? '收起' : '展开'
  })

  header.appendChild(title)
  header.appendChild(toggleBtn)

  issues.forEach(issue => {
    const item = el('div', `validation-item ${issue.severity}`)
    const icon = el('span', 'validation-icon', issue.severity === 'error' ? '❌' : '⚠️')
    const message = el('span', 'validation-message', issue.message)
    
    item.appendChild(icon)
    item.appendChild(message)

    if (onIssueClick && issue.bookIds.length > 0) {
      item.style.cursor = 'pointer'
      item.addEventListener('click', () => {
        onIssueClick(issue.bookIds)
      })
    }

    issueList.appendChild(item)
  })

  container.appendChild(header)
  container.appendChild(issueList)

  return container
}
