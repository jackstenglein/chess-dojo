// Cartoon badge icons for the logo and each rank. Plain SVG strings, 64×64 viewBox.
const O = '#15171e'; // outline
const SKIN = '#f3c9a2';
const line = `stroke="${O}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;

// Round badge with a two-tone gradient, an inner rim highlight and a dark outline.
const badge = (id, from, to, inner = '') => `
  <defs>
    <linearGradient id="bg-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
    </linearGradient>
    <clipPath id="clip-${id}"><circle cx="32" cy="32" r="29"/></clipPath>
  </defs>
  <circle cx="32" cy="32" r="29" fill="url(#bg-${id})"/>
  <g clip-path="url(#clip-${id})">
    <ellipse cx="32" cy="8" rx="30" ry="14" fill="#fff" opacity=".12"/>
    ${inner}
  </g>
  <circle cx="32" cy="32" r="29" fill="none" stroke="${O}" stroke-width="3"/>
  <circle cx="32" cy="32" r="25.8" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="1.4"/>`;

const sparkle = (x, y, s = 1, c = '#fff6c2') =>
  `<path d="M${x} ${y - 4 * s} Q${x + 0.8 * s} ${y - 0.8 * s} ${x + 4 * s} ${y} Q${x + 0.8 * s} ${y + 0.8 * s} ${x} ${y + 4 * s} Q${x - 0.8 * s} ${y + 0.8 * s} ${x - 4 * s} ${y} Q${x - 0.8 * s} ${y - 0.8 * s} ${x} ${y - 4 * s}Z" fill="${c}"/>`;

const ICONS = {
  grasshopper: badge('grasshopper', '#4fbf6a', '#1f6b3a', `
    <path d="M26 23 Q22 12 15 9" fill="none" ${line}/>
    <path d="M38 23 Q42 12 49 9" fill="none" ${line}/>
    <circle cx="15" cy="9" r="3" fill="#b6f06a" ${line}/>
    <circle cx="49" cy="9" r="3" fill="#b6f06a" ${line}/>
    <path d="M14 40 Q12 22 32 21 Q52 22 50 40 Q48 56 32 56 Q16 56 14 40Z" fill="#9be05a" ${line}/>
    <path d="M20 44 Q32 50 44 44" fill="none" stroke="#5fae2e" stroke-width="2.2" stroke-linecap="round"/>
    <ellipse cx="24" cy="34" rx="7" ry="8" fill="#fff" ${line}/>
    <ellipse cx="40" cy="34" rx="7" ry="8" fill="#fff" ${line}/>
    <circle cx="25.5" cy="35" r="3.4" fill="${O}"/><circle cx="41.5" cy="35" r="3.4" fill="${O}"/>
    <circle cx="26.6" cy="33.6" r="1.2" fill="#fff"/><circle cx="42.6" cy="33.6" r="1.2" fill="#fff"/>
    <path d="M27 47 Q32 51 37 47" fill="none" ${line}/>
    <circle cx="18" cy="44" r="2.4" fill="#ff8fa3" opacity=".7"/><circle cx="46" cy="44" r="2.4" fill="#ff8fa3" opacity=".7"/>`),

  // Jester: a cunning trickster, not a clown — dark hat, half mask, focused eyes, sly smirk.
  jester: badge('jester', '#432580', '#12082a', `
    <circle cx="32" cy="42" r="12" fill="${SKIN}" ${line}/>
    <path d="M19 35 L8 18 Q15 22 24 29Z" fill="#a3203a" ${line}/>
    <path d="M45 35 L56 18 Q49 22 40 29Z" fill="#1d6f68" ${line}/>
    <path d="M23 32 L32 8 L41 32Z" fill="#c99a2e" ${line}/>
    <rect x="17" y="30" width="30" height="7" rx="3.5" fill="#2a2140" ${line}/>
    <path d="M22 33.5 L24 32 L26 33.5 L24 35Z M30 33.5 L32 32 L34 33.5 L32 35Z M38 33.5 L40 32 L42 33.5 L40 35Z" fill="#c99a2e"/>
    <circle cx="8" cy="18" r="3" fill="#c99a2e" ${line}/>
    <circle cx="56" cy="18" r="3" fill="#c99a2e" ${line}/>
    <circle cx="32" cy="8" r="3" fill="#a3203a" ${line}/>
    <path d="M21.5 40 Q32 36 42.5 40 L41.5 44 Q32 45.5 22.5 44Z" fill="#2a2140" ${line}/>
    <ellipse cx="27.3" cy="41.6" rx="2.6" ry="1.5" fill="#fff"/><circle cx="27.9" cy="41.7" r="1.1" fill="${O}"/>
    <ellipse cx="36.7" cy="41.6" rx="2.6" ry="1.5" fill="#fff"/><circle cx="37.3" cy="41.7" r="1.1" fill="${O}"/>
    <path d="M29.5 49.2 Q33 50.2 36 48" fill="none" ${line}/>`),

  // Apprentice: a determined dojo student — white training headband with a red mark with flying tails, focused
  // eyes, and a study scroll of patterns in front.
  apprentice: badge('apprentice', '#2a9db0', '#0f4656', `
    <path d="M17 34 Q17 19 32 18 Q47 19 47 34 Q47 51 32 53 Q17 51 17 34Z" fill="${SKIN}" ${line}/>
    <path d="M17.5 30 Q17 17 32 16 Q47 17 46.5 30 Q40 25 32 25 Q24 25 17.5 30Z" fill="#6b4226" ${line}/>
    <path d="M16.8 30.5 Q32 24.5 47.2 30.5 L47 35 Q32 29.5 17 35Z" fill="#f4f6fa" ${line}/>
    <path d="M46 32 Q53 29 58 33 Q53 33 50 35 Q55 37 57 42 Q51 38 46.5 35Z" fill="#f4f6fa" ${line}/>
    <circle cx="32" cy="30.4" r="2.3" fill="#d9363e"/>
    <path d="M23.5 38 L29 39.2 M40.5 38 L35 39.2" ${line}/>
    <circle cx="26.8" cy="41.8" r="1.8" fill="${O}"/><circle cx="37.2" cy="41.8" r="1.8" fill="${O}"/>
    <path d="M29 47.6 Q32 48.6 35 47.6" fill="none" ${line}/>
    <rect x="18" y="53" width="28" height="9" rx="2" fill="#f1e3c2" ${line}/>
    <rect x="15" y="52" width="4.5" height="11" rx="2.2" fill="#b98a4a" ${line}/>
    <rect x="44.5" y="52" width="4.5" height="11" rx="2.2" fill="#b98a4a" ${line}/>
    <g fill="#0f4656" opacity=".75"><rect x="22" y="55" width="3" height="3"/><rect x="25" y="58" width="3" height="3"/><rect x="28" y="55" width="3" height="3"/><rect x="31" y="58" width="3" height="3"/><rect x="34" y="55" width="3" height="3"/><rect x="37" y="58" width="3" height="3"/><rect x="40" y="55" width="3" height="3"/></g>`),

  // Squire: a young squire in a chainmail hood, polishing a knight's shield until it gleams.
  // Rogue: a hooded thief — deep green hood, face in shadow, sharp gleaming eyes, a sly grin and a dagger.
  rogue: badge('rogue', '#3f9a6e', '#0f3324', `
    <path d="M12 64 Q12 48 24 45 L40 45 Q52 48 52 64Z" fill="#24543f" ${line}/>
    <path d="M32 7 Q50 10 51 32 Q51 46 44 52 L20 52 Q13 46 13 32 Q14 10 32 7Z" fill="#2f6b4f" ${line}/>
    <path d="M32 10 Q24 14 22 24" fill="none" stroke="#4d9474" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M19 34 Q19 21 32 21 Q45 21 45 34 Q45 47 32 49 Q19 47 19 34Z" fill="#1a2620" ${line}/>
    <path d="M21 31 Q32 26 43 31 L43 34 Q32 30 21 34Z" fill="#0d1410"/>
    <path d="M23.5 34.5 L29.5 36 L28.6 38.2 L24 37Z" fill="#c8f27a"/>
    <path d="M40.5 34.5 L34.5 36 L35.4 38.2 L40 37Z" fill="#c8f27a"/>
    <circle cx="27.4" cy="36.6" r=".8" fill="${O}"/><circle cx="36.6" cy="36.6" r=".8" fill="${O}"/>
    <path d="M27 43 Q31 45.5 37 42" fill="none" stroke="#c8f27a" stroke-width="1.8" stroke-linecap="round" opacity=".85"/>
    <path d="M44 62 L51 44 L54 45.5 L48 63Z" fill="#d7dde6" ${line}/>
    <path d="M47.5 47 L56 50.5" stroke="#c99a2e" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M50.5 50 L46 61" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>
    ${sparkle(55, 40, 0.8, '#ffffff')}`),

  squire: badge('squire', '#7f8ea6', '#2b3445', `
    <path d="M10 64 Q10 50 24 48 Q36 48 38 64Z" fill="#8a5a33" ${line}/>
    <path d="M12 33 Q11 15 25 14 Q39 15 38 33 L38 46 Q25 52 12 46Z" fill="#aeb8c6" ${line}/>
    <g fill="#8794a6"><circle cx="17" cy="40" r="1"/><circle cx="21" cy="44" r="1"/><circle cx="29" cy="44" r="1"/><circle cx="33" cy="40" r="1"/><circle cx="16" cy="25" r="1"/><circle cx="34" cy="25" r="1"/></g>
    <ellipse cx="25" cy="32" rx="8.8" ry="10" fill="${SKIN}" ${line}/>
    <path d="M18.5 28.6 L23 29.4 M31.5 28.6 L27 29.4" ${line}/>
    <circle cx="21.6" cy="32.4" r="1.6" fill="${O}"/><circle cx="28.4" cy="32.4" r="1.6" fill="${O}"/>
    <path d="M22.5 37.6 Q25 39 27.5 37.6" fill="none" ${line}/>
    <path d="M35 28 L54 28 L54 39 Q54 49.5 44.5 55.5 Q35 49.5 35 39Z" fill="#dfe5ee" ${line}/>
    <path d="M35.5 36 L44.5 42.5 L53.5 36 L53.5 41 L44.5 47.5 L35.5 41Z" fill="#2f6fe0"/>
    <path d="M38 30.5 Q42 29.5 45 30" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M28 55 Q32 49 37.5 46" fill="none" stroke="#8a5a33" stroke-width="6" stroke-linecap="round"/>
    <path d="M37 40.5 Q40.5 37 45 39 Q46 43 42.5 45.5 Q38 46 37 40.5Z" fill="#f1e3c2" ${line}/>
    <circle cx="38.5" cy="45" r="3" fill="${SKIN}" ${line}/>
    <path d="M47.5 38 Q50 41 48.5 44 M50 36.5 Q53 41 51 46" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".8"/>
    ${sparkle(50, 32, 1.1, '#fff6c2')}`),

  // Monk: calm and disciplined — shaved head, eyes closed in focus, prayer beads, saffron robe.
  monk: badge('monk', '#5fb7c9', '#164b5c', `
    <path d="M10 64 Q11 47 26 45 L38 45 Q53 47 54 64Z" fill="#f08a24" ${line}/>
    <path d="M24 45 Q30 54 38 64 L46 64 Q40 52 38 45Z" fill="#b8571a" ${line}/>
    <circle cx="32" cy="31" r="15" fill="${SKIN}" ${line}/>
    <ellipse cx="16.6" cy="32" rx="2.6" ry="3.6" fill="${SKIN}" ${line}/>
    <ellipse cx="47.4" cy="32" rx="2.6" ry="3.6" fill="${SKIN}" ${line}/>
    <path d="M22 22 Q27 17 33 17" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>
    <path d="M23.5 32 Q26.5 34.6 29.5 32" fill="none" ${line}/>
    <path d="M34.5 32 Q37.5 34.6 40.5 32" fill="none" ${line}/>
    <path d="M23.5 28 Q26.5 26.6 29.5 27.6 M34.5 27.6 Q37.5 26.6 40.5 28" fill="none" stroke="#8a5a33" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M32 33 L31 37.5 L33 38" fill="none" stroke="#c98a62" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M28.5 41 Q32 43 35.5 41" fill="none" ${line}/>
    <g fill="#7a3f1d" stroke="${O}" stroke-width="1.2">
      <circle cx="21" cy="47" r="2.2"/><circle cx="25" cy="50" r="2.2"/><circle cx="29.3" cy="51.8" r="2.2"/><circle cx="34.7" cy="51.8" r="2.2"/><circle cx="39" cy="50" r="2.2"/><circle cx="43" cy="47" r="2.2"/>
    </g>
    <circle cx="32" cy="56" r="3" fill="#f5c542" ${line}/>
    ${sparkle(13, 18, 0.8, '#fff6c2')}${sparkle(51, 15, 0.7, '#fff6c2')}`),

  ninja: badge('ninja', '#3a3f4e', '#101218', `
    <path d="M47 23 Q57 18 60 11 Q58 20 52 25 Q60 26 61 33 Q55 28 47 28Z" fill="#e5484d" ${line}/>
    <circle cx="32" cy="35" r="18" fill="#262a35" ${line}/>
    <path d="M19 24 Q32 18 45 24" fill="none" stroke="#3d4252" stroke-width="2.4" stroke-linecap="round"/>
    <rect x="13.5" y="22" width="37" height="6" rx="2" fill="#e5484d" ${line}/>
    <path d="M15 33 Q32 28 49 33 L48 41 Q32 37 16 41Z" fill="${SKIN}" ${line}/>
    <path d="M20 35 L29 37 L28 39.5 L20.5 38Z" fill="${O}"/>
    <path d="M44 35 L35 37 L36 39.5 L43.5 38Z" fill="${O}"/>
    <circle cx="26.5" cy="37.6" r=".9" fill="#fff"/><circle cx="37.5" cy="37.6" r=".9" fill="#fff"/>
    <path d="M24 48 Q32 50 40 48" fill="none" stroke="#3d4252" stroke-width="2" stroke-linecap="round"/>`),

  // Mage: a young spellcaster — crimson hood with gold trim, steady eyes, a glowing orb held in both hands.
  mage: badge('mage', '#3a8fd6', '#0d2856', `
    ${sparkle(12, 20, 0.8)}${sparkle(52, 14, 0.7)}
    <path d="M8 64 Q9 47 24 44 L40 44 Q55 47 56 64Z" fill="#8e2440" ${line}/>
    <path d="M32 6 Q50 9 50 30 Q50 42 44 47 L20 47 Q14 42 14 30 Q14 9 32 6Z" fill="#a8304f" ${line}/>
    <path d="M20 47 Q14 42 14 30 Q14 9 32 6 Q50 9 50 30 Q50 42 44 47" fill="none" stroke="#f5c542" stroke-width="1.8" stroke-linecap="round" opacity=".95"/>
    <path d="M26 9.5 Q20 13 18 21" fill="none" stroke="#d65a78" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M20.5 31 Q20.5 19 32 19 Q43.5 19 43.5 31 Q43.5 43 32 45 Q20.5 43 20.5 31Z" fill="${SKIN}" ${line}/>
    <path d="M20.8 27 Q25 19.5 32 20.5 Q39 19.5 43.2 27 Q38 23.5 32 25 Q26 23.5 20.8 27Z" fill="#4a2a1a" ${line}/>
    <path d="M24.5 29.5 L29.5 30.6 M39.5 29.5 L34.5 30.6" ${line}/>
    <circle cx="27.4" cy="33.4" r="1.8" fill="${O}"/><circle cx="36.6" cy="33.4" r="1.8" fill="${O}"/>
    <circle cx="28" cy="32.8" r=".7" fill="#fff"/><circle cx="37.2" cy="32.8" r=".7" fill="#fff"/>
    <path d="M28.5 39.5 Q32 41.5 35.5 39.5" fill="none" ${line}/>
    <circle cx="32" cy="55" r="11" fill="#7ff7ff" opacity=".28"/>
    <circle cx="32" cy="55" r="7.2" fill="#9ffbff" ${line}/>
    <circle cx="29.6" cy="52.6" r="2.2" fill="#fff" opacity=".85"/>
    <path d="M30 57.5 L33 54.5 L31.5 53.5 L34.5 50.5" fill="none" stroke="#2a7fd6" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    <ellipse cx="23.5" cy="57" rx="3.4" ry="3" fill="${SKIN}" ${line}/>
    <ellipse cx="40.5" cy="57" rx="3.4" ry="3" fill="${SKIN}" ${line}/>`),

  warrior: badge('warrior', '#e0574f', '#7a1f1f', `
    <path d="M30 20 Q16 18 12 3 Q20 10 31 14Z" fill="#f5c542" ${line}/>
    <path d="M34 20 Q48 18 52 3 Q44 10 33 14Z" fill="#f5c542" ${line}/>
    <circle cx="32" cy="16" r="3.4" fill="#e5484d" ${line}/>
    <path d="M10 44 Q8 36 14 33 L18 48Z" fill="#2c313c" ${line}/>
    <path d="M54 44 Q56 36 50 33 L46 48Z" fill="#2c313c" ${line}/>
    <path d="M13 35 Q13 18 32 18 Q51 18 51 35Z" fill="#363c4a" ${line}/>
    <path d="M18 27 Q24 22 31 21.5" fill="none" stroke="#5a6275" stroke-width="2.4" stroke-linecap="round"/>
    <rect x="12" y="33" width="40" height="5" rx="2.5" fill="#f5c542" ${line}/>
    <path d="M20 38 L44 38 L42 52 Q32 58 22 52Z" fill="${SKIN}" ${line}/>
    <path d="M21 41 L29 44" ${line}/><path d="M43 41 L35 44" ${line}/>
    <circle cx="27" cy="45" r="1.6" fill="${O}"/><circle cx="37" cy="45" r="1.6" fill="${O}"/>
    <path d="M22 50 Q32 46 42 50 L40 55 Q32 59 24 55Z" fill="#b8302e" ${line}/>
    <path d="M27 52 L29 54 M37 52 L35 54" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`),

  // Beast: a lion — full mane, steady fierce eyes, ready to pounce.
  beast: badge('beast', '#f0a83a', '#8a3d0c', `
    <path d="M32.0 15.5 Q37.9 8.2 40.0 17.3 Q48.5 13.3 46.5 22.5 Q55.9 22.5 50.0 29.9 Q58.5 34.0 50.0 38.1 Q55.9 45.5 46.5 45.5 Q48.5 54.7 40.0 50.7 Q37.9 59.8 32.0 52.5 Q26.1 59.8 24.0 50.7 Q15.5 54.7 17.5 45.5 Q8.1 45.5 14.0 38.1 Q5.5 34.0 14.0 29.9 Q8.1 22.5 17.5 22.5 Q15.5 13.3 24.0 17.3 Q26.1 8.2 32.0 15.5Z" fill="#9a4a16" ${line}/>
    <path d="M32 17 Q46 18 48 33 Q47 46 32 52 Q17 46 16 33 Q18 18 32 17Z" fill="#c8661f"/>
    <circle cx="20.5" cy="21.5" r="4" fill="#e6a04a" ${line}/><circle cx="43.5" cy="21.5" r="4" fill="#e6a04a" ${line}/>
    <circle cx="20.5" cy="21.5" r="1.8" fill="#9a4a16"/><circle cx="43.5" cy="21.5" r="1.8" fill="#9a4a16"/>
    <path d="M20 32 Q19 20 32 20 Q45 20 44 32 Q44 45 32 48 Q20 45 20 32Z" fill="#f2b65a" ${line}/>
    <path d="M23.5 29 L29 30.8 M40.5 29 L35 30.8" ${line}/>
    <ellipse cx="26.6" cy="33" rx="2.6" ry="2.2" fill="#ffe08a" ${line}/><ellipse cx="37.4" cy="33" rx="2.6" ry="2.2" fill="#ffe08a" ${line}/>
    <circle cx="26.8" cy="33.2" r="1.2" fill="${O}"/><circle cx="37.2" cy="33.2" r="1.2" fill="${O}"/>
    <path d="M32 33 L32 38" stroke="#c8661f" stroke-width="1.6"/>
    <path d="M25 41 Q25 37 32 37 Q39 37 39 41 Q39 46 32 46.5 Q25 46 25 41Z" fill="#fbe1b6" ${line}/>
    <path d="M28.6 37 L35.4 37 L32 40.6Z" fill="#5a2a12" stroke="${O}" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M32 40.6 L32 42.4 M32 42.4 Q29.8 44.4 28 43 M32 42.4 Q34.2 44.4 36 43" fill="none" stroke="${O}" stroke-width="1.6" stroke-linecap="round"/>
    <g fill="#9a6a3a"><circle cx="27.6" cy="40.6" r=".7"/><circle cx="26.4" cy="42.4" r=".7"/><circle cx="36.4" cy="40.6" r=".7"/><circle cx="37.6" cy="42.4" r=".7"/></g>`),

  wizard: badge('wizard', '#5b4bd6', '#1b1450', `
    ${sparkle(12, 24, 0.9)}${sparkle(53, 42, 0.8)}
    <circle cx="52" cy="27" r="1" fill="#fff6c2"/><circle cx="11" cy="42" r="1" fill="#fff6c2"/>
    <path d="M19 44 Q14 56 24 60 Q28 58 32 61 Q36 58 40 60 Q50 56 45 44Z" fill="#f4f6fb" ${line}/>
    <circle cx="32" cy="37" r="11" fill="${SKIN}" ${line}/>
    <path d="M24.5 33.5 Q27.5 31 30.5 33" fill="none" stroke="#f4f6fb" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M33.5 33 Q36.5 31 39.5 33.5" fill="none" stroke="#f4f6fb" stroke-width="3.2" stroke-linecap="round"/>
    <circle cx="27.5" cy="36.5" r="2.2" fill="#6ff2ff" ${line}/><circle cx="36.5" cy="36.5" r="2.2" fill="#6ff2ff" ${line}/>
    <path d="M32 37 L30.5 41 L33 41.5" fill="none" stroke="#c98a62" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M23 43 Q27 40.5 32 43 Q37 40.5 41 43 Q37 46 32 44.5 Q27 46 23 43Z" fill="#f4f6fb" ${line}/>
    <path d="M14 27 Q32 21 50 27 L41 26 L36 7 Q34 1 27 4 Q33 6 31 11 L24 26Z" fill="#7b4be0" ${line}/>
    <ellipse cx="32" cy="27" rx="18" ry="4" fill="#5a30b8" ${line}/>
    ${sparkle(33, 17, 1.1, '#ffe066')}
    <circle cx="28" cy="21" r="1" fill="#ffe066"/>`),
};

export function rankIcon(key, size = 24) {
  return `<svg class="rank-svg" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">${ICONS[key] ?? ''}</svg>`;
}

// Logo: a knight on an amber badge with a lightning bolt and three rising bars.
// Logo: the ChessDojo logo (gi with the chessboard square, from the site's ChessDojoIcon) in icy
// blue — frosted white at the top fading to glacier blue, with a cold glow. Also the favicon.
export const LOGO_SVG = `<svg class="logo-svg" viewBox="-12 -12 409.44 338.15" width="36" height="36" aria-hidden="true">
  <defs>
    <linearGradient id="lg-ice" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="#f4fbff"/><stop offset=".45" stop-color="#a8dcff"/><stop offset="1" stop-color="#3b8dff"/></linearGradient>
    <filter id="lg-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="b"/><feFlood flood-color="#4aa8ff" flood-opacity=".55"/><feComposite in2="b" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <g fill="url(#lg-ice)" filter="url(#lg-glow)">
    <path d="m339.83,167.44l-64.34-51.44c-2.31-1.87-5.43-2.05-8.01-.62-2.58,1.42-3.92,4.36-3.47,7.21l10.77,70.12h-122.8l46.63-71.72,66.74-102.6,103.67,90.68-29.19,58.38Zm-245.61,132.06l14.24-92.55h70.39l-27.59,38.62,11.57,8.28,29.81-41.74,29.81,41.74,11.57-8.28-27.59-38.62h70.39l14.24,92.55H94.22Zm-48.59-132.06l-29.19-58.38L120.03,18.39l64.25,98.69-49.21,75.64h-24.38l10.77-70.12c.44-2.94-.98-5.78-3.47-7.21-2.58-1.42-5.7-1.25-8.01.62l-64.34,51.44ZM250.75,14.74l-58.02,89.34L134.71,14.74h116.04Zm131.79,87.21L268.64,2.28c-1.33-1.16-2.94-1.78-4.72-1.78H121.54c-1.69,0-3.38.62-4.72,1.78L2.92,101.95c-2.4,2.14-3.11,5.61-1.69,8.54l35.6,71.19c.98,1.96,2.76,3.29,4.81,3.74,2.05.44,4.27-.09,5.96-1.42l56.95-45.56-25.72,167.03c-.27,2.05.27,4.09,1.6,5.7,1.33,1.6,3.29,2.49,5.43,2.49h213.57c2.05,0,4-.89,5.43-2.49,1.33-1.6,1.96-3.65,1.6-5.7l-25.63-166.94,56.95,45.56c1.69,1.33,3.92,1.87,5.96,1.42,2.14-.44,3.92-1.87,4.81-3.74l35.6-71.19c1.51-2.94.8-6.5-1.6-8.63Z"/>
    <path d="m213.43,154.3v-22.22h22.22v-22.22h22.22v22.22h-22.22v22.22h-22.22Zm47.22,1.39v-47.22c0-.37-.15-.72-.41-.98-.26-.26-.61-.41-.98-.41h-47.22c-.37,0-.72.15-.98.41-.26.26-.41.61-.41.98v47.22c0,.37.15.72.41.98.26.26.61.41.98.41h47.22c.37,0,.72-.15.98-.41.26-.26.41-.61.41-.98Z"/>
  </g>
</svg>`;

export const LOGO_DATA_URI = `data:image/svg+xml,${encodeURIComponent(LOGO_SVG.replace('width="36" height="36"', 'width="64" height="64"').replace(' class="logo-svg"', ' xmlns="http://www.w3.org/2000/svg"'))}`;
export const RANK_ICON_KEYS = Object.keys(ICONS);
