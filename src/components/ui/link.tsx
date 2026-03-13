import { PropsWithChildren } from "react";
import NextLink from "next/link";

export function Link(
  props: PropsWithChildren & { href: string },
): React.JSX.Element {
  return (
    <NextLink className="text-blue-500 hover:underline" href={props.href}>
      {props.children}
    </NextLink>
  );
}
