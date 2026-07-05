import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useBookmarkChat } from "./useBookmarkChat";

/** SSE 프레임들을 청크 배열로 흘려보내는 mock Response 생성 */
function sseResponse(chunks: string[], init: { ok?: boolean; status?: number } = {}) {
  const { ok = true, status = 200 } = init;
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
  return { ok, status, body } as unknown as Response;
}

const SOURCE = {
  n: 1,
  id: "b1",
  url: "https://a.com",
  title: "Zustand 정리",
  summary: "s",
  thumbnailUrl: null,
  similarity: 0.9,
};

afterEach(() => vi.restoreAllMocks());

describe("useBookmarkChat — SSE 파싱", () => {
  it("sources/token 이벤트를 파싱해 답변을 누적하고 근거를 채운다", async () => {
    const chunks = [
      `event: sources\ndata: ${JSON.stringify([SOURCE])}\n\n`,
      `event: token\ndata: ${JSON.stringify({ text: "안녕" })}\n\n`,
      `event: token\ndata: ${JSON.stringify({ text: "하세요[1]" })}\n\n`,
      `event: done\ndata: {}\n\n`,
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(sseResponse(chunks));

    const { result } = renderHook(() => useBookmarkChat());
    await act(async () => {
      await result.current.send("질문");
    });

    expect(result.current.messages[0]).toMatchObject({ role: "user", content: "질문" });
    const assistant = result.current.messages[1];
    expect(assistant.role).toBe("assistant");
    expect(assistant.content).toBe("안녕하세요[1]");
    expect(assistant.sources?.[0].title).toBe("Zustand 정리");
    expect(result.current.isStreaming).toBe(false);
  });

  it("프레임이 청크 경계에 걸쳐 나눠 와도 올바르게 파싱한다 (고전 SSE 버그)", async () => {
    const chunks = [
      `event: token\ndata: {"text":"부분`, // 프레임 중간에서 잘림
      `1"}\n\nevent: token\ndata: {"text":"부분2"}\n\n`, // 이어짐 + 다음 프레임
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(sseResponse(chunks));

    const { result } = renderHook(() => useBookmarkChat());
    await act(async () => {
      await result.current.send("q");
    });

    expect(result.current.messages[1].content).toBe("부분1부분2");
  });

  it("error 이벤트를 답변에 반영한다", async () => {
    const chunks = [`event: error\ndata: ${JSON.stringify({ message: "생성 실패" })}\n\n`];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(sseResponse(chunks));

    const { result } = renderHook(() => useBookmarkChat());
    await act(async () => {
      await result.current.send("q");
    });

    expect(result.current.messages[1].content).toBe("생성 실패");
  });

  it("401 응답이면 로그인 안내를 보여준다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 401,
      body: null,
    } as unknown as Response);

    const { result } = renderHook(() => useBookmarkChat());
    await act(async () => {
      await result.current.send("q");
    });

    expect(result.current.messages[1].content).toContain("로그인");
  });

  it("빈 질문은 무시한다", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { result } = renderHook(() => useBookmarkChat());
    await act(async () => {
      await result.current.send("   ");
    });

    expect(result.current.messages).toHaveLength(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
