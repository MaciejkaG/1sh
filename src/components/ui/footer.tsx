import { Link } from "./link";

const links = [
  {
    name: "contact@1sh.pl",
    href: "mailto:contact@1sh.pl"
  },
  {
    name: "Terms of Service",
    href: "/terms"
  },
  {
    name: "Privacy Policy",
    href: "/privacy"
  },
  {
    name: "Donate",
    href: "https://ko-fi.com/mcjk"
  },
  {
    name: "GitHub",
    href: "https://github.com/MaciejkaG/1sh"
  }
];

export function Footer() {
  return (
    <footer className="mt-4 pt-4 mx-2 border-t border-border">
      <div className="w-2xl max-w-full mx-auto px-2 flex justify-between text-sm">
        <div className="flex flex-col gap-2">
          <span className="text-base">1sh - The URL shortener.</span>
          <p className="text-muted-foreground">
            Copyright © 2025 Maciej Gomoła
            <br />
            Designed by <Link href="https://gomola.dev/">Maciej Gomoła</Link>
          </p>
        </div>

        <p className="text-right">
          {links.map((link, index) => (
            <span key={link.href}>
              <Link href={link.href}>{link.name}</Link>
              <br />
            </span>
          ))}
        </p>
      </div>
    </footer>
  );
}