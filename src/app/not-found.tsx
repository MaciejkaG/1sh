import Link from "next/link";

export default function NotFound(): React.JSX.Element {
  return (
    <div className="container mx-auto space-y-4 mt-4 text-center">
      <h1 className="font-black text-2xl">404</h1>
      <p>We couldn&apos;t find this one.<br /><Link href="/" className="text-blue-500 hover:underline">Home</Link></p>
    </div>
  );
}