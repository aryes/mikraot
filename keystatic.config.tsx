/**
 * Keystatic: the browser editor for the site's content (src/content/pages/*.mdoc and
 * src/data/site.json). Its components mirror the Markdoc tags in markdoc.config.mjs, so pages
 * open and save without losing anything. Locally it edits the files directly (npm run cms).
 */
import { collection, config, fields, singleton } from '@keystatic/core';
import { block, inline, mark, wrapper } from '@keystatic/core/content-components';
import { Eye, EyeOff, Highlighter, Keyboard, Newspaper, Video, Volume2 } from 'lucide-react';

const collapseSchema = {
  expandText: fields.text({ label: 'טקסט לפתיחה (ריק = אייקון עין בלבד)' }),
  collapseText: fields.text({ label: 'טקסט לסגירה' }),
};

const content = fields.markdoc({
  label: 'תוכן',
  extension: 'mdoc',
  options: {
    heading: {
      levels: [2, 3, 4, 5, 6],
      schema: { anchor: fields.text({ label: 'עוגן (לקישורים בתוך העמוד)' }) },
    },
    table: true,
    image: false,
    code: false,
    codeBlock: false,
  },
  components: {
    highlight: mark({
      label: 'אות נלמדת (כתום)',
      icon: <Highlighter />,
      schema: {},
      style: { color: '#ff6600' },
    }),
    muted: mark({
      label: 'הקשר (אפור)',
      icon: <EyeOff />,
      schema: {},
      style: { color: '#c3c3c3' },
    }),
    silent: mark({
      label: 'אות שאינה נשמעת (אפור בהיר)',
      icon: <EyeOff />,
      schema: {},
      style: { color: '#d1cfcf' },
    }),
    kbd: mark({ label: 'מסגרת (kbd)', icon: <Keyboard />, schema: {}, tag: 'kbd' }),
    collapse: mark({
      label: 'ביאור מוסתר',
      icon: <Eye />,
      schema: collapseSchema,
      style: { borderBottom: '1px dashed #8CB65F' },
    }),
    'collapse-block': wrapper({
      label: 'פתרון מוסתר (פסקאות)',
      icon: <Eye />,
      schema: collapseSchema,
    }),
    audio: inline({
      label: 'הקלטה',
      icon: <Volume2 />,
      schema: { src: fields.text({ label: 'קובץ (למשל /wp-content/uploads/…mp3)' }) },
    }),
    youtube: block({
      label: 'סרטון YouTube',
      icon: <Video />,
      schema: { videoId: fields.text({ label: 'מזהה הסרטון (11 תווים)' }) },
    }),
    'latest-posts': block({ label: 'פוסטים אחרונים', icon: <Newspaper />, schema: {} }),
  },
});

export default config({
  storage: { kind: 'local' },
  ui: { brand: { name: 'מקראות' } },
  collections: {
    pages: collection({
      label: 'עמודים ופוסטים',
      slugField: 'title',
      path: 'src/content/pages/*',
      format: { contentField: 'content' },
      entryLayout: 'content',
      columns: ['title'],
      schema: {
        title: fields.slug({ name: { label: 'כותרת' }, slug: { label: 'כתובת (slug)' } }),
        kind: fields.select({
          label: 'סוג',
          options: [
            { label: 'עמוד', value: 'page' },
            { label: 'פוסט', value: 'post' },
          ],
          defaultValue: 'page',
        }),
        parent: fields.relationship({ label: 'עמוד אב', collection: 'pages' }),
        order: fields.integer({ label: 'סדר', defaultValue: 0 }),
        date: fields.date({ label: 'תאריך', defaultValue: { kind: 'today' } }),
        excerpt: fields.text({ label: 'תקציר', multiline: true }),
        draft: fields.checkbox({ label: 'טיוטה (לא מתפרסם)', defaultValue: false }),
        seo: fields.object(
          {
            title: fields.text({ label: 'כותרת לחיפוש (title)' }),
            description: fields.text({ label: 'תיאור לחיפוש', multiline: true }),
            ogImage: fields.text({ label: 'תמונה לשיתוף (נתיב)' }),
          },
          { label: 'SEO' },
        ),
        wpId: fields.integer({ label: 'מזהה וורדפרס (אל תשנו)' }),
        content,
      },
    }),
  },
  singletons: {
    site: singleton({
      label: 'הגדרות האתר',
      path: 'src/data/site',
      format: { data: 'json' },
      schema: {
        title: fields.text({ label: 'שם האתר' }),
        tagline: fields.text({ label: 'תיאור קצר' }),
        copyright: fields.text({ label: 'זכויות יוצרים' }),
        frontPage: fields.relationship({ label: 'עמוד הבית', collection: 'pages' }),
      },
    }),
  },
});
