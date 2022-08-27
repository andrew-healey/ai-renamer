export const debounce = (f, timeout = 500) => {
  let timer;
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(f, timeout);
  };
};

export const selectColor = (number) => {
  const hue = (number * 137.508) % 360;
  return {
    hover: `hsl(${hue}, 50%, 70%)`,
    bg:    `hsl(${hue}, 50%, 90%)`,
  };
};

export const createCSSStyleString = (styles) =>
  Object.entries(styles)
    .map((a) => a.join(": "))
    .join(";");
