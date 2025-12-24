import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn (className utility)", () => {
  it("should merge class names", () => {
    const result = cn("foo", "bar");
    expect(result).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    const hidden = false;
    const visible = true;
    const result = cn("base", hidden && "hidden", visible && "visible");
    expect(result).toBe("base visible");
  });

  it("should merge tailwind classes intelligently", () => {
    // tailwind-merge should resolve conflicts
    const result = cn("px-4", "px-8");
    expect(result).toBe("px-8");
  });

  it("should handle arrays", () => {
    const result = cn(["foo", "bar"]);
    expect(result).toBe("foo bar");
  });

  it("should handle objects", () => {
    const result = cn({ foo: true, bar: false, baz: true });
    expect(result).toBe("foo baz");
  });

  it("should handle undefined and null", () => {
    const result = cn("foo", undefined, null, "bar");
    expect(result).toBe("foo bar");
  });

  it("should handle empty input", () => {
    const result = cn();
    expect(result).toBe("");
  });
});
