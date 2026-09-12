export function formValue(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim();
}
