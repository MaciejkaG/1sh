import Link from "next/link";
import { PropsWithChildren } from "react";

const FooterLink = (props: PropsWithChildren & { href: string }): React.JSX.Element => {
  return (
    <Link className="text-blue-500 hover:underline" href={props.href}>
      {props.children}
    </Link>
  );
}

export function Footer() {
  return (
    <footer className="mt-4 pt-4 mx-2 border-t border-border">
      <div className="w-2xl max-w-full mx-auto px-2 flex justify-between text-sm">
        <div className="flex flex-col gap-2">
          <span className="text-base">
            1sh - The URL shortener.
          </span>
          <p className="text-muted-foreground">
            Copyright © 2025 mcjk
            <br />
            Designed by mcjk
          </p>
        </div>

        <p className="text-right">
          <FooterLink href="mailto:contact@1sh.pl">contact@1sh.pl</FooterLink>
          <br />
          <FooterLink href="/terms">Terms</FooterLink>
          <br />
          <FooterLink href="/privacy">Privacy</FooterLink>
          <br />
        </p>
      </div>
    </footer>
  );
}