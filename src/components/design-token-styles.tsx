import tokens from "../../design/design_tokens.json";

const cssVariableByToken: Record<string, string> = {
  background: "--background",
  surface: "--surface",
  ink: "--foreground",
  muted: "--muted",
  line: "--border",
  primary: "--primary",
  primaryDark: "--primary-dark",
  primarySoft: "--primary-soft",
  primaryForeground: "--primary-foreground",
  secondary: "--secondary",
  secondaryForeground: "--secondary-foreground",
  success: "--success",
  warning: "--warning",
  danger: "--danger",
  info: "--info",
  focus: "--focus",
};

function declarations(values: Record<string, string>) {
  return Object.entries(values)
    .map(([name, value]) => `${cssVariableByToken[name]}: ${value};`)
    .join("\n");
}

export function DesignTokenStyles() {
  const css = `:root {\n${declarations(tokens.colors)}\n}\n.dark {\n${declarations(tokens.dark)}\n}`;
  return <style data-design-tokens dangerouslySetInnerHTML={{ __html: css }} />;
}
