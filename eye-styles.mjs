// Eye styles ("Expression" in the Face tab). Plain JS so the recipe validator on the server shares it.
// Every style is a free starter choice: expressions have never been part of the unlock catalogue.
export const EYE_STYLES=Object.freeze([
 ['open','Curious'],['sleepy','Unimpressed'],['wide','Wide awake'],
 ['anime','Anime'],['squinty','Squinty'],['bloodshot','Bloodshot'],['blind','Blind'],
]);
export const EYE_STYLE_IDS=Object.freeze(EYE_STYLES.map(([id])=>id));
