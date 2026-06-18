import { create } from "zustand";
import type { ForumPost } from "../types";
import { attachPersistence } from "../persist";

export interface ForumComment {
  id: string;
  postId: string;
  author: string;
  text: string;
  createdAt: string;
}

interface CommunityState {
  userPosts: ForumPost[];
  likes: Record<string, boolean>; // postId -> liked by me
  comments: Record<string, ForumComment[]>; // postId -> my comments
  hydrated: boolean;

  addPost: (post: Omit<ForumPost, "id" | "likes" | "comments" | "createdAt">) => void;
  toggleLike: (postId: string) => void;
  isLiked: (postId: string) => boolean;
  addComment: (postId: string, author: string, text: string) => void;
  commentsFor: (postId: string) => ForumComment[];
  /** Extra like count contributed by this user (0 or 1). */
  bonusLikes: (postId: string) => number;
}

export const useCommunityStore = create<CommunityState>((set, get) => ({
  userPosts: [],
  likes: {},
  comments: {},
  hydrated: false,

  addPost: (data) => {
    const post: ForumPost = {
      ...data,
      id: `up_${Date.now()}`,
      likes: 0,
      comments: 0,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ userPosts: [post, ...s.userPosts] }));
  },

  toggleLike: (postId) =>
    set((s) => ({ likes: { ...s.likes, [postId]: !s.likes[postId] } })),

  isLiked: (postId) => !!get().likes[postId],

  addComment: (postId, author, text) => {
    const comment: ForumComment = {
      id: `c_${Date.now()}`,
      postId,
      author,
      text,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({
      comments: { ...s.comments, [postId]: [...(s.comments[postId] ?? []), comment] },
    }));
  },

  commentsFor: (postId) => get().comments[postId] ?? [],
  bonusLikes: (postId) => (get().likes[postId] ? 1 : 0),
}));

attachPersistence(
  useCommunityStore,
  "momease-community",
  (s) => ({ userPosts: s.userPosts, likes: s.likes, comments: s.comments }),
  { onHydrated: () => useCommunityStore.setState({ hydrated: true }) }
);
