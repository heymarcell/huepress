
import { describe, it, expect } from "vitest";
import { expandQuery } from "../../src/lib/search-utils";

describe("search-utils", () => {
    it("should return null for empty query", () => {
        expect(expandQuery("")).toBeNull();
        expect(expandQuery("   ")).toBeNull();
    });

    it("should sanitize special characters", () => {
        expect(expandQuery("rainbow!")).toContain("rainbow");
        expect(expandQuery("rainbow!")).not.toContain("!");
    });

    it("should simple term with prefix wildcard", () => {
        // "rainbow" -> "rainbow"*
        expect(expandQuery("rainbow")).toBe('"rainbow"*');
    });

    it("should expand synonyms", () => {
        // "puppy" -> ("puppy"* OR "dog"* OR "canine"* ...)
        const result = expandQuery("puppy");
        expect(result).toContain('"puppy"*');
        expect(result).toContain('"dog"*');
        expect(result).toContain('OR');

        // New synonyms check
        const mandalas = expandQuery("mandala");
        expect(mandalas).toContain('"pattern"*');
        expect(mandalas).toContain('"meditative"*');

        const tram = expandQuery("tram");
        expect(tram).toContain('"streetcar"*');
    });

    it("should expand multiple terms with AND logic", () => {
        // "puppy car" -> (puppy_group) (car_group)
        // In FTS5, space between groups means AND
        const result = expandQuery("puppy car");
        expect(result).toContain('"puppy"*');
        expect(result).toContain('"car"*');
        // valid: ("puppy"* OR ...) ("car"* OR ...)
    });

    it("should ignore unknown terms only if they become empty", () => {
        const result = expandQuery("unknownterm");
        expect(result).toBe('"unknownterm"*');
    });
});
