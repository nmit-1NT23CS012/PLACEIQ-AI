function escapeCsvCell(value) {
  let cell = String(value ?? '')
  if (/^[=+\-@\t\r]/.test(cell)) {
    cell = `'${cell}`
  }
  return `"${cell.replace(/"/g, '""')}"`
}

export function downloadCsv(filename, rows) {
  const content = rows.map(row => row.map(escapeCsvCell).join(',')).join('\r\n')
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
