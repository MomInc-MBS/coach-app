# Vendored Butterchurn

Unmodified official npm distributables, downloaded 2026-10-09 using `npm pack --ignore-scripts`. No package.json or lockfile changes.

- Engine: butterchurn **2.6.7**, `lib/butterchurn.min.js` → `butterchurn-2.6.7.min.js`.
  Source: https://github.com/jberg/butterchurn
  Archive: https://registry.npmjs.org/butterchurn/-/butterchurn-2.6.7.tgz
  npm integrity: `sha512-BJiRA8L0L2+84uoG2SSfkp0kclBuN+vQKf217pK7pMlwEO2ZEg3MtO2/o+l8Qpr8Nbejg8tmL1ZHD1jmhiaaqg==`
  Vendored SHA256: `4e67421bc18d48fac4a6ff4e69e2778f770737fbdd4e323438da154085b4818d`.
- Presets: butterchurn-presets **2.4.7**, `lib/butterchurnPresets.min.js` → `presets-2.4.7.min.js`.
  Source: https://github.com/jberg/butterchurn-presets
  Archive: https://registry.npmjs.org/butterchurn-presets/-/butterchurn-presets-2.4.7.tgz
  npm integrity: `sha512-4MdM8ripz/VfH1BCldrIKdAc/1ryJFBDvqlyow6Ivo1frwj0H3duzvSMFC7/wIjAjxb1QpwVHVqGqS9uAFKhpg==`
  Vendored SHA256: `136c746836aef6dff8a1f6a93ede48c7bbe4da27d2f44de6b59ebc56ffefca10`.

Both upstream packages use MIT. Their complete original notices travel in LICENSE.engine and LICENSE.presets. Preset author names remain in the preset names and runtime status. No upstream rendering or equation code was modified.

The wrapper lazy-loads both UMD scripts. WebGL2 is required; it reports an error if unavailable. It connects actual audio only, via Butterchurn's native AudioNode input or its supported render(audioLevels) waveform input when switching AudioContexts. Input gain controls waveform sensitivity and does not change audible mix volume. Source labels preserve MYR5 mix versus microphone.

Thirty FPS, 1.5 maximum pixel ratio and 32×24 internal mesh limit mobile GPU cost. Reduced motion disables preset morphing and lowers rendering to twelve FPS; preset animations and audio-reactive shape changes remain. This is reduced animation, not a claim of flash-safety certification.

Scene selectors are original preset families, not literal standalone spectrum/scope meters. Each family has three real alternate looks. The palette control selects another supplied preset rather than claiming an unsupported recoloring API. Label it **Alternate look** in UI.

Primary presets: orbit = Flexi - mindblob mix; tunnel = martin - glass corridor; spectrum = Geiss - Thumb Drum; scope = Eo.S. + Phat - cubetrace - v2; trails = Zylot - Paint Spill (Music Reactive Paint Mix). All fifteen preset names are declared in the wrapper and selected unchanged from the supplied bank.

Butterchurn 2.6.7 compiles preset equations using new Function. A strict production CSP requires an explicit compatible policy; this wrapper does not weaken the site's policy. Official source documentation: https://github.com/jberg/butterchurn#usage
