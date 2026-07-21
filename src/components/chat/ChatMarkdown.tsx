import type { ReactNode } from 'react'

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  const re = /\*\*(.+?)\*\*/g
  let last = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index))
    }
    parts.push(
      <strong key={`b-${key++}`} className="font-bold text-text">
        {match[1]}
      </strong>,
    )
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

function isBullet(line: string): boolean {
  return /^\s*([*\-•]|\d+\.)\s+/.test(line)
}

function bulletText(line: string): string {
  return line.replace(/^\s*([*\-•]|\d+\.)\s+/, '')
}

type Block =
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }

function toBlocks(content: string): Block[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let para: string[] = []
  let list: string[] = []

  const flushPara = () => {
    if (!para.length) return
    const text = para.join('\n').trim()
    if (text) blocks.push({ type: 'p', text })
    para = []
  }
  const flushList = () => {
    if (!list.length) return
    blocks.push({ type: 'ul', items: [...list] })
    list = []
  }

  for (const line of lines) {
    if (!line.trim()) {
      flushList()
      flushPara()
      continue
    }
    if (isBullet(line)) {
      flushPara()
      list.push(bulletText(line))
      continue
    }
    flushList()
    para.push(line)
  }
  flushList()
  flushPara()
  return blocks
}

/** Renders light markdown: **bold**, bullets (* / - / 1.), newlines. */
export function ChatMarkdown({ content }: { content: string }) {
  const blocks = toBlocks(content)
  return (
    <div className="chat-md space-y-2 leading-relaxed">
      {blocks.map((block, i) => {
        if (block.type === 'ul') {
          return (
            <ul key={i} className="marker:text-brand space-y-1 pl-5 [&>li]:list-disc">
              {block.items.map((item, j) => (
                <li key={j}>{renderInline(item)}</li>
              ))}
            </ul>
          )
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {renderInline(block.text)}
          </p>
        )
      })}
    </div>
  )
}