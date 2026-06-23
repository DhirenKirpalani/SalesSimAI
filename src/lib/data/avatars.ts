export interface CuratedAvatar {
  id: string;
  name: string;
  description: string;
  gender: "male" | "female";
  ethnicity: string;
}

export const CURATED_AVATARS: CuratedAvatar[] = [
  // Update these IDs with your actual HeyGen avatar IDs
  { id: "asian_male_01", name: "Kenji", description: "Professional, approachable East Asian businessman", gender: "male", ethnicity: "East Asian" },
  { id: "asian_female_01", name: "Priya", description: "Confident South Asian finance executive", gender: "female", ethnicity: "South Asian" },
  { id: "black_male_01", name: "Marcus", description: "Assertive African-American tech decision-maker", gender: "male", ethnicity: "Black" },
  { id: "black_female_01", name: "Aisha", description: "Warm but direct African procurement lead", gender: "female", ethnicity: "Black" },
  { id: "latino_male_01", name: "Carlos", description: "Collaborative Latino operations director", gender: "male", ethnicity: "Latino" },
  { id: "latina_female_01", name: "Sofia", description: "Data-driven Latina CFO", gender: "female", ethnicity: "Latino" },
  { id: "middle_eastern_male_01", name: "Omar", description: "Diplomatic Middle Eastern consultant", gender: "male", ethnicity: "Middle Eastern" },
  { id: "white_male_01", name: "James", description: "Experienced European enterprise buyer", gender: "male", ethnicity: "White" },
  { id: "white_female_01", name: "Claire", description: "Straightforward British compliance officer", gender: "female", ethnicity: "White" },
  { id: "southeast_asian_male_01", name: "Wei Liang", description: "Fast-talking Singaporean startup founder", gender: "male", ethnicity: "Southeast Asian" },
  { id: "southeast_asian_female_01", name: "Maya", description: "Sharp Indonesian VP of Engineering", gender: "female", ethnicity: "Southeast Asian" },
  { id: "indian_male_01", name: "Raj", description: "Cautious Indian CTO evaluating vendors", gender: "male", ethnicity: "South Asian" },
];
