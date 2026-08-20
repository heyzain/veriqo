export default function TestCaseDetailLoading() {
  return (
    <div className="flex max-w-5xl flex-col gap-8 animate-pulse">
      <div className="h-4 w-24 rounded bg-inset/70" />
      <div className="flex flex-col gap-4 border-b border-subtle pb-6">
        <div className="flex gap-2">
          <div className="h-6 w-16 rounded bg-inset/70" />
          <div className="h-6 w-20 rounded bg-inset/70" />
          <div className="h-6 w-20 rounded bg-inset/70" />
        </div>
        <div className="h-8 w-96 rounded bg-inset/70" />
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="h-40 rounded-lg bg-surface border border-subtle p-5" />
          <div className="h-60 rounded-lg bg-surface border border-subtle p-5" />
        </div>
        <div className="flex flex-col gap-6">
          <div className="h-40 rounded-md bg-surface border border-subtle p-5" />
          <div className="h-40 rounded-md bg-surface border border-subtle p-5" />
        </div>
      </div>
    </div>
  );
}
