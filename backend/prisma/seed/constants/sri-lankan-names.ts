export const FIRST_NAMES_MALE = [
  "Kasun",
  "Nuwan",
  "Chamara",
  "Dilan",
  "Saman",
  "Ruwan",
  "Tharaka",
  "Lahiru",
  "Shanaka",
  "Malith",
  "Dimuth",
  "Suranga",
  "Bhanuka",
  "Pathum",
  "Nimal",
  "Ashan",
  "Gayan",
  "Isuru",
  "Janaka",
  "Kavindra",
];

export const FIRST_NAMES_FEMALE = [
  "Dilini",
  "Sachini",
  "Nimasha",
  "Thilini",
  "Piyumi",
  "Amaya",
  "Shehani",
  "Kavya",
  "Maneesha",
  "Chandima",
  "Rashmika",
  "Hiruni",
  "Nadeesha",
  "Oshadi",
  "Ishara",
  "Dinusha",
  "Madushani",
  "Gayathri",
  "Hasini",
  "Senuri",
];

export const LAST_NAMES = [
  "Perera",
  "Silva",
  "Fernando",
  "Jayasinghe",
  "Wickramasinghe",
  "Bandara",
  "Rathnayake",
  "Dissanayake",
  "Gunasekara",
  "Herath",
  "Karunarathna",
  "Rajapaksha",
  "Weerasinghe",
  "Liyanage",
  "Senanayake",
  "Kumarasinghe",
  "Abeywickrama",
  "Pathirana",
  "Wijesekara",
  "Seneviratne",
];

export const ALL_FIRST_NAMES = [...FIRST_NAMES_MALE, ...FIRST_NAMES_FEMALE];

export function randomSLName(): {
  firstName: string;
  lastName: string;
  name: string;
} {
  const firstName =
    ALL_FIRST_NAMES[Math.floor(Math.random() * ALL_FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return { firstName, lastName, name: `${firstName} ${lastName}` };
}
