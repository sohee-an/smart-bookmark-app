import type { ReactNode } from "react";

/**
 * 챗 답변용 경량 마크다운 렌더러 (의존성 없음).
 * LLM 답변에 실제로 등장하는 문법만 처리: 제목 · 볼드 · 인라인 코드 · 링크 · 리스트.
 * 매 토큰마다 현재 문자열을 다시 파싱하므로 스트리밍 중 미완성 마크다운도 무난히 렌더된다.
 */
function parseInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // **bold** | `code` | [text](url)
  const regex = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));

    if (m[1] !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-b${i}`}>{m[1]}</strong>);
    } else if (m[2] !== undefined) {
      nodes.push(
        <code
          key={`${keyPrefix}-c${i}`}
          className="rounded bg-zinc-100 px-1 py-0.5 text-[0.85em] dark:bg-zinc-800"
        >
          {m[2]}
        </code>
      );
    } else if (m[3] !== undefined && m[4] !== undefined) {
      nodes.push(
        <a
          key={`${keyPrefix}-l${i}`}
          href={m[4]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-primary underline"
        >
          {m[3]}
        </a>
      );
    }

    last = m.index + m[0].length;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let listItems: string[] | null = null;
  let ordered = false;
  let key = 0;

  const flush = () => {
    if (!listItems) return;
    const items = listItems.map((it, idx) => (
      <li key={idx}>{parseInline(it, `li${key}-${idx}`)}</li>
    ));
    blocks.push(
      ordered ? (
        <ol key={key++} className="list-decimal space-y-1 pl-5">
          {items}
        </ol>
      ) : (
        <ul key={key++} className="list-disc space-y-1 pl-5">
          {items}
        </ul>
      )
    );
    listItems = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);

    if (ul) {
      if (listItems && ordered) flush();
      listItems = listItems ?? [];
      ordered = false;
      listItems.push(ul[1]);
    } else if (ol) {
      if (listItems && !ordered) flush();
      listItems = listItems ?? [];
      ordered = true;
      listItems.push(ol[1]);
    } else if (heading) {
      flush();
      blocks.push(
        <p key={key++} className="font-bold">
          {parseInline(heading[2], `h${key}`)}
        </p>
      );
    } else {
      flush();
      if (line.trim() === "") continue;
      blocks.push(<p key={key++}>{parseInline(line, `p${key}`)}</p>);
    }
  }
  flush();

  return <div className="flex flex-col gap-2">{blocks}</div>;
}
