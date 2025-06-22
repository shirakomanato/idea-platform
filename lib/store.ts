import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface User {
  id: string
  address: string
  nickname?: string
  email?: string
  avatar?: string
}

export interface Idea {
  id: string
  title: string
  target: string
  why: string
  what?: string
  how?: string
  impact?: string
  author: string
  authorNickname: string
  likes: number
  likedBy: string[]
  comments: Comment[]
  status: "idea" | "pre-draft" | "draft" | "commit" | "in-progress" | "test" | "finish" | "archive"
  createdAt: Date
  updatedAt: Date
  githubRepo?: string
  nftTokenId?: string
}

export interface Comment {
  id: string
  content: string
  author: string
  authorNickname: string
  createdAt: Date
}

interface AppState {
  // User state
  user: User | null
  isConnected: boolean
  setUser: (user: User | null) => void
  setConnected: (connected: boolean) => void

  // Ideas state
  ideas: Idea[]
  currentIdeaIndex: number
  addIdea: (idea: Omit<Idea, "id" | "createdAt" | "updatedAt">) => void
  updateIdea: (id: string, updates: Partial<Idea>) => void
  likeIdea: (id: string, userAddress: string) => void
  addComment: (ideaId: string, comment: Omit<Comment, "id" | "createdAt">) => void
  setCurrentIdeaIndex: (index: number) => void

  // Filters
  currentFilter: "all" | "idea" | "pre-draft" | "draft" | "proposal"
  setCurrentFilter: (filter: "all" | "idea" | "pre-draft" | "draft" | "proposal") => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // User state
      user: null,
      isConnected: false,
      setUser: (user) => set({ user }),
      setConnected: (connected) => set({ isConnected: connected }),

      // Ideas state
      ideas: [
        {
          id: "1",
          title: "AI駆動型学習プラットフォーム",
          target: "学習効率を向上させたい学生・社会人",
          why: "従来の学習方法では個人の理解度に合わせた最適化が困難",
          what: "AIが学習者の理解度を分析し、最適な学習パスを提案するプラットフォーム",
          how: "Machine Learning + 適応学習アルゴリズム + ゲーミフィケーション",
          impact: "学習効率30%向上、継続率80%改善を目指す",
          author: "0x1234...5678",
          authorNickname: "AIエンジニア太郎",
          likes: 15,
          likedBy: [],
          comments: [],
          status: "idea",
          createdAt: new Date("2024-01-15"),
          updatedAt: new Date("2024-01-15"),
        },
        {
          id: "2",
          title: "サステナブル配送システム",
          target: "ECサイト運営者・環境意識の高い消費者",
          why: "配送による環境負荷が深刻化している",
          what: "ドローン＋電動車両を組み合わせたカーボンニュートラル配送",
          how: "IoT + ルート最適化AI + 再生可能エネルギー",
          impact: "CO2排出量70%削減、配送コスト20%削減",
          author: "0xabcd...efgh",
          authorNickname: "グリーンテック花子",
          likes: 8,
          likedBy: [],
          comments: [],
          status: "pre-draft",
          createdAt: new Date("2024-01-10"),
          updatedAt: new Date("2024-01-12"),
        },
      ],
      currentIdeaIndex: 0,
      addIdea: (ideaData) => {
        const newIdea: Idea = {
          ...ideaData,
          id: Date.now().toString(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        set((state) => ({ ideas: [newIdea, ...state.ideas] }))
      },
      updateIdea: (id, updates) => {
        set((state) => ({
          ideas: state.ideas.map((idea) => (idea.id === id ? { ...idea, ...updates, updatedAt: new Date() } : idea)),
        }))
      },
      likeIdea: (id, userAddress) => {
        set((state) => ({
          ideas: state.ideas.map((idea) => {
            if (idea.id === id) {
              const isLiked = idea.likedBy.includes(userAddress)
              return {
                ...idea,
                likes: isLiked ? idea.likes - 1 : idea.likes + 1,
                likedBy: isLiked ? idea.likedBy.filter((addr) => addr !== userAddress) : [...idea.likedBy, userAddress],
              }
            }
            return idea
          }),
        }))
      },
      addComment: (ideaId, commentData) => {
        const newComment: Comment = {
          ...commentData,
          id: Date.now().toString(),
          createdAt: new Date(),
        }
        set((state) => ({
          ideas: state.ideas.map((idea) =>
            idea.id === ideaId ? { ...idea, comments: [...idea.comments, newComment] } : idea,
          ),
        }))
      },
      setCurrentIdeaIndex: (index) => set({ currentIdeaIndex: index }),

      // Filters
      currentFilter: "all",
      setCurrentFilter: (filter) => set({ currentFilter: filter }),
    }),
    {
      name: "idea-junkies-storage",
    },
  ),
)
