export class PolicyError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errorName: string = "PolicyError",
  ) {
    super(message);
    this.name = "PolicyError";
  }

  toJSON(): Record<string, unknown> {
    return { error: this.errorName, message: this.message };
  }
}
