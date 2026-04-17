import { estimateTokenCount } from "@/lib/parsers";

describe("estimateTokenCount", () => {
  it("estimates ~4 chars per token", () => {
    const text = "a".repeat(400);
    expect(estimateTokenCount(text)).toBe(100);
  });

  it("rounds up for partial tokens", () => {
    expect(estimateTokenCount("hello")).toBe(2);
  });

  it("handles empty string", () => {
    expect(estimateTokenCount("")).toBe(0);
  });
});
