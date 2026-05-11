export const COLOMBO_AREAS = [
  {
    name: "Colombo 01",
    displayName: "Fort / Pettah",
    lat: 6.9344,
    lng: 79.8428,
  },
  {
    name: "Colombo 02",
    displayName: "Slave Island",
    lat: 6.9157,
    lng: 79.8483,
  },
  { name: "Colombo 03", displayName: "Kollupitiya", lat: 6.9102, lng: 79.8497 },
  {
    name: "Colombo 04",
    displayName: "Bambalapitiya",
    lat: 6.8933,
    lng: 79.8544,
  },
  {
    name: "Colombo 05",
    displayName: "Havelock Town",
    lat: 6.8849,
    lng: 79.8624,
  },
  { name: "Colombo 06", displayName: "Wellawatte", lat: 6.8721, lng: 79.8604 },
  {
    name: "Colombo 07",
    displayName: "Cinnamon Gardens",
    lat: 6.9038,
    lng: 79.8631,
  },
  { name: "Colombo 08", displayName: "Borella", lat: 6.9168, lng: 79.8784 },
  { name: "Colombo 10", displayName: "Maradana", lat: 6.9299, lng: 79.8651 },
  { name: "Rajagiriya", displayName: "Rajagiriya", lat: 6.9101, lng: 79.8969 },
  { name: "Nugegoda", displayName: "Nugegoda", lat: 6.8701, lng: 79.8895 },
  {
    name: "Mount Lavinia",
    displayName: "Mount Lavinia",
    lat: 6.8391,
    lng: 79.8657,
  },
  { name: "Dehiwala", displayName: "Dehiwala", lat: 6.8483, lng: 79.8648 },
];

export const STREET_TEMPLATES = [
  "{n} Galle Road",
  "{n} Duplication Road",
  "No {n} Dharmapala Mawatha",
  "{n} R A De Mel Mawatha",
  "No {n} Bauddaloka Mawatha",
  "{n} High Level Road",
  "No {n} Park Road",
  "{n} Tickell Road",
  "No {n} Lauries Road",
  "{n} Marine Drive",
];

export function randomAddress(area: string): string {
  const template =
    STREET_TEMPLATES[Math.floor(Math.random() * STREET_TEMPLATES.length)];
  const num = Math.floor(Math.random() * 200) + 1;
  return `${template.replace("{n}", String(num))}, ${area}`;
}
