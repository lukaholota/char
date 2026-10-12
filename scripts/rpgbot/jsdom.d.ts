declare module "jsdom" {
  export class VirtualConsole {}
  export class JSDOM {
    constructor(html: string, options?: { url?: string; virtualConsole?: VirtualConsole });
    readonly window: { document: Document };
  }
}
