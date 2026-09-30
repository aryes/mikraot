export interface MenuItem {
  id: number;
  title: string;
  url: string;
  parentId: number;
  order: number;
  objectId?: number;
  object?: string;
  children?: MenuItem[];
}

export interface ContentItem {
  id: number;
  title: string;
  slug: string;
  rawSlug: string;
  type: string; // 'page' | 'post' | 'lp_course' | 'lp_lesson' | 'lp_quiz' | 'lp_question'
  status: string;
  content: string;
  excerpt: string;
  parentId: number;
  order: number;
  meta?: Record<string, unknown>;
}

export interface AudioFile {
  id: number;
  title: string;
  url: string;
  filename: string;
}

export interface SiteData {
  site: {
    title: string;
    tagline: string;
    copyright: string;
    frontPageId: string;
  };
  menu: MenuItem[];
  content: ContentItem[];
  audioFiles: AudioFile[];
}
