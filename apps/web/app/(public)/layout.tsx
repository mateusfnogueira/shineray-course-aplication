export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <div className="min-h-screen bg-background">{children}</div>;
}
