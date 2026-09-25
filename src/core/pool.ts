/** Pool simples de objetos reutilizáveis para evitar alocações por frame. */
export class Pool<T> {
  private free: T[] = [];
  constructor(
    private readonly create: () => T,
    private readonly reset?: (t: T) => void,
  ) {}

  acquire(): T {
    return this.free.pop() ?? this.create();
  }

  release(t: T): void {
    this.reset?.(t);
    this.free.push(t);
  }

  get size(): number {
    return this.free.length;
  }
}
