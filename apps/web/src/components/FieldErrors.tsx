/** Error messages of a control that is not wrapped in a Field. */
export function FieldErrors({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null;
  return (
    <div className="field-error" role="alert">
      {messages.map((m) => (
        <div key={m}>{m}</div>
      ))}
    </div>
  );
}
