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
    <footer className="mb-4 pt-4 mx-2 border-t border-border">
      <div className="w-2xl max-w-full mx-auto px-2 flex justify-between items-center text-sm">
        <div className="flex flex-col gap-2">
          <Link href="/">
            <h2 className="font-black italic text-xl">1sh</h2>
          </Link>
          <p className="text-muted-foreground">
            Copyright © {new Date().getFullYear()} Maciej Gomoła
            <br />
            Designed by <Link href="https://gomola.dev/">Maciej Gomoła</Link>
          </p>
        </div>

        <p className="text-right">
          {links.map((link) => (
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