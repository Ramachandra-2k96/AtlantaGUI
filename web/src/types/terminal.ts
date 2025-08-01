// Type definitions for dynamically imported xterm.js modules

export interface ITerminal {
  write(data: string): void;
  clear(): void;
  focus(): void;
  dispose(): void;
  open(element: HTMLElement): void;
  onData(callback: (data: string) => void): void;
  onResize(callback: (size: { cols: number; rows: number }) => void): void;
  attachCustomKeyEventHandler(callback: (event: KeyboardEvent) => boolean): void;
  hasSelection(): boolean;
  getSelection(): string;
  loadAddon(addon: unknown): void;
}

export interface IFitAddon {
  fit(): void;
}

export interface IWebLinksAddon {
  activate?: (terminal: ITerminal) => void;
  dispose?: () => void;
}

export interface TerminalConstructor {
  new (options?: unknown): ITerminal;
}

export interface FitAddonConstructor {
  new (): IFitAddon;
}

export interface WebLinksAddonConstructor {
  new (): IWebLinksAddon;
}