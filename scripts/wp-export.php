<?php
/**
 * Read-only export of mikraot.net content for the migration, printed as JSON.
 *
 * Run on the server from the WordPress root (reads this file from stdin):
 *   ssh <user>@<host> 'cd ~/public_html && wp eval-file -' < scripts/wp-export.php > .migration/wp-export.json
 *
 * Exports content only: posts of the site's content types, menus, SEO fields, media and the
 * LearnPress course/quiz structure. Deliberately excludes comments, users, orders and newsletter
 * subscribers (personal data), which are migrated separately if at all.
 */

global $wpdb;
$p = $wpdb->prefix;

$types = array('page', 'post', 'lp_course', 'lp_lesson', 'lp_quiz', 'lp_question');
$posts = array();
foreach (get_posts(array(
    'post_type' => $types,
    'post_status' => array('publish', 'draft', 'private', 'pending', 'future'),
    'numberposts' => -1,
    'orderby' => 'ID',
    'order' => 'ASC',
)) as $post) {
    $posts[] = array(
        'id' => $post->ID,
        'type' => $post->post_type,
        'status' => $post->post_status,
        'title' => $post->post_title,
        'slug' => urldecode($post->post_name),
        'parentId' => $post->post_parent,
        'menuOrder' => $post->menu_order,
        'date' => $post->post_date_gmt,
        'modified' => $post->post_modified_gmt,
        'excerpt' => $post->post_excerpt,
        'content' => $post->post_content,
        'url' => $post->post_status === 'publish' ? get_permalink($post) : null,
        'template' => get_page_template_slug($post),
        'thumbnailId' => (int) get_post_thumbnail_id($post),
    );
}

$menus = array();
foreach (wp_get_nav_menus() as $menu) {
    $locations = array_keys(array_filter(get_nav_menu_locations(), function ($id) use ($menu) {
        return $id === $menu->term_id;
    }));
    $items = array();
    foreach (wp_get_nav_menu_items($menu->term_id) ?: array() as $item) {
        $items[] = array(
            'id' => $item->ID,
            'title' => $item->title,
            'url' => $item->url,
            'parentId' => (int) $item->menu_item_parent,
            'order' => $item->menu_order,
            'object' => $item->object,
            'objectId' => (int) $item->object_id,
        );
    }
    $menus[] = array('name' => $menu->name, 'slug' => $menu->slug, 'locations' => $locations, 'items' => $items);
}

$seo = $wpdb->get_results(
    "SELECT post_id AS postId, title, description, canonical_url AS canonicalUrl,
            og_title AS ogTitle, og_description AS ogDescription, robots_noindex AS noindex
     FROM {$p}aioseo_posts",
    ARRAY_A
);

$media = array();
foreach (get_posts(array('post_type' => 'attachment', 'post_status' => 'inherit', 'numberposts' => -1)) as $att) {
    $media[] = array(
        'id' => $att->ID,
        'title' => $att->post_title,
        'mime' => $att->post_mime_type,
        'url' => wp_get_attachment_url($att->ID),
        'file' => get_post_meta($att->ID, '_wp_attached_file', true),
        'alt' => get_post_meta($att->ID, '_wp_attachment_image_alt', true),
        'parentId' => $att->post_parent,
    );
}

$learnpress = array(
    'sections' => $wpdb->get_results("SELECT * FROM {$p}learnpress_sections ORDER BY section_course_id, section_order", ARRAY_A),
    'sectionItems' => $wpdb->get_results("SELECT * FROM {$p}learnpress_section_items ORDER BY section_id, item_order", ARRAY_A),
    'quizQuestions' => $wpdb->get_results("SELECT * FROM {$p}learnpress_quiz_questions ORDER BY quiz_id, question_order", ARRAY_A),
    'questionAnswers' => $wpdb->get_results("SELECT * FROM {$p}learnpress_question_answers ORDER BY question_id, `order`", ARRAY_A),
    'questionAnswerMeta' => $wpdb->get_results("SELECT * FROM {$p}learnpress_question_answermeta", ARRAY_A),
);

$lpMetaKeys = array('_lp_duration', '_lp_passing_grade', '_lp_type', '_lp_mark', '_lp_explanation', '_lp_hint',
    '_lp_preview', '_lp_retake_count', '_lp_show_correct_review', '_lp_instant_check', '_lp_negative_marking',
    '_lp_minus_skip_questions', '_lp_pagination', '_lp_level', '_lp_students', '_lp_price', '_lp_course_result');
$postMeta = array();
foreach ($posts as $post) {
    if (strpos($post['type'], 'lp_') !== 0) continue;
    $meta = array();
    foreach ($lpMetaKeys as $key) {
        $value = get_post_meta($post['id'], $key, true);
        if ($value !== '') $meta[$key] = $value;
    }
    if ($meta) $postMeta[$post['id']] = $meta;
}

echo wp_json_encode(array(
    'exportedAt' => gmdate('c'),
    'site' => array(
        'url' => home_url('/'),
        'title' => get_option('blogname'),
        'tagline' => get_option('blogdescription'),
        'frontPageId' => (int) get_option('page_on_front'),
        'permalinkStructure' => get_option('permalink_structure'),
    ),
    'posts' => $posts,
    'postMeta' => $postMeta,
    'menus' => $menus,
    'seo' => $seo,
    'media' => $media,
    'learnpress' => $learnpress,
), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
