export type SteIssue = { type: string; severity: string; message: string; permitted?: boolean; word?: string; cluster?: string; replacement?: string; suggestion?: string }
export type SteSentence = { index: number; text: string; wordCount: number; isProcedural: boolean; issues: SteIssue[] }
export type SteReport = { mode: string; score: number; totalSentences: number; totalWords: number; averageWordsPerSentence: number; totalIssues: number; sentences: SteSentence[] }
export type SteView = { text: string; original: string; source: 'answer' | 'rewrite'; isAsked: boolean }

declare module 'claude-code' {
  interface PluginState {
    'asd-ste100': {
      view: SteView | null
      report: SteReport | null
      tab: string
      isAsked: boolean
      isRewriting: boolean
      paneOpen: boolean
    }
  }
}
