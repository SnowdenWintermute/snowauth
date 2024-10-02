import { ROUTES } from "../route-names.js";

export default function appRoute(...args: string[]) {
  return ROUTES.ROOT.concat(...args);
}
