/**
 * html-validate (run on the built pages by `npm run build:site`): catches broken markup, invalid
 * nesting and accessibility mistakes before they ship.
 */
export default {
  extends: ['html-validate:recommended'],
  elements: [
    'html5',
    // Astro puts the <style> for its islands (`astro-island { display: contents }`) next to the
    // first island in the body, which browsers accept; it's framework output, not ours.
    { style: { flow: true } },
  ],
  rules: {
    // Style preferences (how `<br />` and boolean attributes are written), not errors.
    'void-style': 'off',
    'attribute-boolean-style': 'off',
    // React's server rendering writes `autoComplete`; HTML attribute names are case-insensitive.
    'attr-case': 'off',
  },
};
