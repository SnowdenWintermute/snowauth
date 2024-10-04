export function generateRandomUsername() {
  const firstName = PLAYER_FIRST_NAMES[Math.floor(Math.random() * PLAYER_FIRST_NAMES.length)];
  const lastName = PLAYER_LAST_NAMES[Math.floor(Math.random() * PLAYER_LAST_NAMES.length)];
  const randomNumber = Math.floor(Math.random() * 9999);
  return `${firstName}-${lastName}-${randomNumber}`;
}

export const PLAYER_FIRST_NAMES = [
  "obi-wan",
  "qui-gon",
  "padme",
  "leia",
  "cere",
  "slayers",
  "leon",
  "claire",
  "chris",
  "rebecca",
  "albert",
  "vivi",
  "zidane",
  "garnet",
  "adelbert",
  "rick",
  "maggie",
  "daryl",
  "carol",
  "cameron",
  "molly",
  "john",
  "sherlock",
  "selena",
  "serena",
  "danai",
  "lyra",
  "takumi",
  "kimiko",
  "sakura",
];
export const PLAYER_LAST_NAMES = [
  "kenobi",
  "jin",
  "boxer",
  "kennedy",
  "redfield",
  "chambers",
  "wesker",
  "ortainer",
  "tribal",
  "til alexandros XVII",
  "steiner",
  "grimes",
  "dixon",
  "peletier",
  "diaz",
  "hooper",
  "watson",
  "holmes",
  "gomez",
  "williams",
  "gurira",
  "belacqua",
  "fujiwara",
  "salinger",
  "birchler",
];
