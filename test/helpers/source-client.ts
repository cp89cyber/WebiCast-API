import type { FetchCatalogInput, SourceClient, SourceFetchResult } from "../../src/lib/source-client.js";

type SequenceEntry = SourceFetchResult | Error;

export class SequenceSourceClient implements SourceClient {
  private readonly sequence: SequenceEntry[];
  private fallback: SequenceEntry | null = null;

  public constructor(sequence: SequenceEntry[]) {
    this.sequence = [...sequence];
    this.fallback = this.sequence.at(-1) ?? null;
  }

  public async fetchCatalog(_input?: FetchCatalogInput): Promise<SourceFetchResult> {
    void _input;
    const next = this.sequence.length > 0 ? this.sequence.shift() ?? this.fallback : this.fallback;
    if (!next) {
      throw new Error("No source client response configured.");
    }

    if (next instanceof Error) {
      throw next;
    }

    return next;
  }
}
