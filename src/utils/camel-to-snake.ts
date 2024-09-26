// from chat-gpt
export default function camelToSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1_$2") // insert an underscore before any uppercase letter that follows a lowercase letter
    .toLowerCase(); // make the entire string lowercase
}
