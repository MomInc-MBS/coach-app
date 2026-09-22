// No production caller enables uploads. Synthetic tests may inject an explicit
// version-1 manifest; activation requires a separate reviewed integration.
export const IMPORT_UPLOAD_MANIFEST=Object.freeze({version:1,uploadsEnabled:false});
