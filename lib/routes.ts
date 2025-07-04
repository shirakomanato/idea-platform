/**
 * アプリケーション全体のルート定義
 * 型安全性とメンテナンス性を向上させるための一元管理
 */

export const ROUTES = {
  // Public routes
  HOME: '/',
  CONNECT: '/connect',
  
  // Protected routes
  DASHBOARD: '/dashboard',
  EMPATHIZED: '/empathized',
  PRE_DRAFTS: '/pre-drafts',
  PROPOSALS: '/proposals',
  PROFILE: '/me',
  SETTINGS: '/settings',
  
  // Dynamic routes
  NEW_IDEA: '/idea/new',
  IDEA_DETAIL: (id: string) => `/idea/${id}` as const,
} as const

/**
 * 保護されたルートのリスト
 * ミドルウェアや認証ガードで使用
 */
export const PROTECTED_ROUTES = [
  ROUTES.DASHBOARD,
  ROUTES.EMPATHIZED,
  ROUTES.PRE_DRAFTS,
  ROUTES.PROPOSALS,
  ROUTES.PROFILE,
  ROUTES.SETTINGS,
  ROUTES.NEW_IDEA,
  '/idea', // 動的ルート /idea/[id] をカバー
] as const

/**
 * パブリックルートのリスト
 * 認証不要でアクセス可能
 */
export const PUBLIC_ROUTES = [
  ROUTES.HOME,
  ROUTES.CONNECT,
] as const

/**
 * ルート型定義
 */
export type RouteKey = keyof typeof ROUTES
export type StaticRoute = typeof ROUTES[Exclude<RouteKey, 'IDEA_DETAIL'>]
export type DynamicRoute = ReturnType<typeof ROUTES.IDEA_DETAIL>
export type AppRoute = StaticRoute | DynamicRoute

/**
 * ルートのバリデーション
 */
export function isProtectedRoute(path: string): boolean {
  return PROTECTED_ROUTES.some(route => path.startsWith(route))
}

export function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.includes(path as any)
}

/**
 * ナビゲーションヘルパー
 */
export const createNavigationHelper = (router: any) => ({
  toDashboard: () => router.push(ROUTES.DASHBOARD),
  toConnect: () => router.push(ROUTES.CONNECT),
  toEmpathized: () => router.push(ROUTES.EMPATHIZED),
  toNewIdea: () => router.push(ROUTES.NEW_IDEA),
  toIdeaDetail: (id: string) => router.push(ROUTES.IDEA_DETAIL(id)),
  toProfile: () => router.push(ROUTES.PROFILE),
  toSettings: () => router.push(ROUTES.SETTINGS),
  toPreDrafts: () => router.push(ROUTES.PRE_DRAFTS),
  toProposals: () => router.push(ROUTES.PROPOSALS),
})