import { ThemeProvider } from "next-themes";
import type { PropsWithChildren } from "react";

export default function Providers({ children }: PropsWithChildren): React.JSX.Element {
  return (
    <ThemeProvider attribute="class">
      {children}
    </ThemeProvider>
  );
}