/**
 * Keystatic: the browser editor for the site's content (src/content/pages/*.mdoc and
 * src/data/site.json). Its components mirror the Markdoc tags in markdoc.config.mjs, so pages
 * open and save without losing anything. Locally it edits the files directly (npm run cms).
 */
import { collection, config, fields, singleton } from '@keystatic/core';
import { block, inline, mark, wrapper } from '@keystatic/core/content-components';
import { Eye, EyeOff, Highlighter, Keyboard, Newspaper, Video, Volume2 } from 'lucide-react';
import { slugFromTitle } from './src/lib/slug';

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
      schema: {
        anchor: fields.text({ label: 'עוגן (לקישורים בתוך העמוד)' }),
        // Markdoc attribute size="small" (markdoc.config.mjs); empty means the level's own size.
        // A dropdown is easier than typing "small"; it does write size="" into headings on a
        // page's first save, which is harmless (markdoc.config.mjs accepts it).
        size: fields.select({
          label: 'גודל',
          options: [
            { label: 'לפי הרמה', value: '' },
            { label: 'קטן', value: 'small' },
          ],
          defaultValue: '',
        }),
      },
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
      style: { color: '#c2410c', fontWeight: 'bold' },
    }),
    muted: mark({
      label: 'הקשר (אפור)',
      icon: <EyeOff />,
      schema: {},
      style: { color: '#475569' },
    }),
    silent: mark({
      label: 'אות שאינה נשמעת (אפור בהיר)',
      icon: <EyeOff />,
      schema: {},
      style: { color: '#707070', textDecoration: 'underline dotted' },
    }),
    kbd: mark({ label: 'הזחה (kbd)', icon: <Keyboard />, schema: {}, tag: 'kbd' }),
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
  // Hebrew interface; it also lays the editor out right-to-left.
  locale: 'he-IL',
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
        // The address is proposed from the title (src/lib/slug.ts; Keystatic's own drops Hebrew).
        title: fields.slug({
          name: { label: 'כותרת' },
          slug: { label: 'כתובת (slug)', generate: slugFromTitle },
        }),
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
        categories: fields.array(fields.text({ label: 'קטגוריה (slug, מהגדרות האתר)' }), {
          label: 'קטגוריות (לפוסטים)',
          itemLabel: (props) => props.value,
        }),
        excerpt: fields.text({ label: 'תקציר', multiline: true }),
        draft: fields.checkbox({ label: 'טיוטה (לא מתפרסם)', defaultValue: false }),
        showLastUpdated: fields.checkbox({
          label: 'להציג ״עודכן לאחרונה״ (התאריך מתעדכן מעצמו כשהעמוד משתנה)',
          defaultValue: false,
        }),
        updates: fields.array(
          fields.object({
            date: fields.date({ label: 'תאריך', defaultValue: { kind: 'today' } }),
            note: fields.text({ label: 'מה חדש (שורה אחת, נשלח למנויים)' }),
          }),
          {
            label: 'הודעות על תוכן חדש בעמוד ("מה חדש" והניוזלטר)',
            itemLabel: (props) => `${props.fields.date.value ?? ''} – ${props.fields.note.value}`,
          },
        ),
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
        author: fields.object(
          {
            name: fields.text({ label: 'שם' }),
            slug: fields.text({ label: 'כתובת (slug)' }),
          },
          { label: 'כותב הפוסטים' },
        ),
        categories: fields.array(
          fields.object({
            slug: fields.text({ label: 'כתובת (slug)' }),
            name: fields.text({ label: 'שם' }),
          }),
          { label: 'קטגוריות', itemLabel: (props) => props.fields.name.value },
        ),
      },
    }),
  },
});
