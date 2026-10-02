import type { APIRoute, GetStaticPaths } from 'astro';
import { feed } from '../../../../lib/feeds';
import { getPosts, site } from '../../../../lib/site';

/** A category's posts feed, served at /category/<slug>/feed/. */
export const getStaticPaths = (async () => {
  const posts = await getPosts();
  return site.categories
    .map((category) => ({
      params: { slug: category.slug },
      props: {
        name: category.name,
        posts: posts.filter(({ entry }) => entry.data.categories.includes(category.slug)),
      },
    }))
    .filter(({ props }) => props.posts.length > 0);
}) satisfies GetStaticPaths;

export const GET: APIRoute<Awaited<ReturnType<typeof getStaticPaths>>[number]['props']> = (
  context,
) => feed(`${site.title} - ${context.props.name}`, context.site, context.props.posts);
