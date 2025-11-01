interface RegularPageProps {
  title: string;
  children: React.ReactNode;
}

function RegularPage({ title, children }: RegularPageProps) {
  return (
    <main className="mx-auto w-full max-w-[850px] px-5">
      <h1 className="pt-5 pb-1 text-3xl font-semibold">{title}</h1>
      {children}
    </main>
  );
}

export default RegularPage;
