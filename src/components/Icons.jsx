export const ICON_PATHS = {
  home: <path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" />,
  words: <path d="M4 4h16v16H4zM8 9h8M8 13h5" />,
  ach: <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v1a3 3 0 0 0 4 3M16 6h4v1a3 3 0 0 1-4 3M12 13v4M8 20h8" />,
  me: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  lesson: <path d="M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2zM22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z" />,
  read: <path d="M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2zM22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z" />,
  cmp: (
    <>
      <rect x="3" y="4" width="8" height="16" rx="2" />
      <rect x="13" y="4" width="8" height="16" rx="2" />
    </>
  ),
  quiz: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l3 3 5-6" />
    </>
  ),
};

export const Icon = ({ name }) => <svg viewBox="0 0 24 24">{ICON_PATHS[name]}</svg>;

// أيقونات ملوّنة (SVG عبر CSS mask، في design.css). الاسم: fire star star0 book vol mute cards spark trophy sun moon pen lock flag bulb ok user stop x share clock back
export const Ico = ({ n }) => <i className={'ico ico-' + n} aria-hidden="true" />;
